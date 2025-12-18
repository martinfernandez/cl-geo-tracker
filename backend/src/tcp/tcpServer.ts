import net from 'net';
import { GPS103Parser } from './gps103Parser';
import { prisma } from '../config/database';
import { broadcastPositionUpdate } from '../websocket/wsServer';

const TCP_PORT = Number(process.env.TCP_PORT) || 8841;

// Map to store IMEI for each socket connection
const socketImeiMap = new Map<net.Socket, string>();

export function startTcpServer() {
  const server = net.createServer((socket) => {
    console.log('Device connected:', socket.remoteAddress);
    let buffer = Buffer.alloc(0);

    socket.on('data', async (data) => {
      try {
        // LOG RAW DATA
        console.log('=== RAW DATA RECEIVED ===');
        console.log('HEX:', data.toString('hex'));
        console.log('LENGTH:', data.length, 'bytes');
        console.log('========================');

        // Append to buffer
        buffer = Buffer.concat([buffer, data]);

        // Process GPS103 binary packets (start with 7878, end with 0d0a)
        while (buffer.length >= 5) {
          // Check for GPS103 start marker
          if (buffer[0] !== 0x78 || buffer[1] !== 0x78) {
            console.log('Invalid start marker, clearing buffer');
            buffer = Buffer.alloc(0);
            break;
          }

          const packetLength = buffer[2] + 5; // Length byte + header(2) + length(1) + CRC(2)

          if (buffer.length < packetLength) {
            // Wait for more data
            break;
          }

          // Extract complete packet
          const packet = buffer.slice(0, packetLength);
          buffer = buffer.slice(packetLength);

          console.log('Processing GPS103 packet');

          // Check if it's a login packet
          const protocolNumber = packet[3];
          if (protocolNumber === 0x01) {
            // Login packet - extract IMEI and serial number
            const imei = GPS103Parser.parseIMEI(packet.slice(4, 12));
            const serialNumber = packet.readUInt16BE(packet.length - 4);

            // Store IMEI for this socket
            socketImeiMap.set(socket, imei);
            console.log(`Device logged in with IMEI: ${imei}`);

            const response = GPS103Parser.generateLoginResponse(serialNumber);
            socket.write(response);
            console.log('Sent login response');
            continue; // Skip GPS data parsing for login packet
          }

          // Get IMEI from socket map for location packets
          const imei = socketImeiMap.get(socket);
          if (!imei) {
            console.log('Received data from device without login, ignoring');
            continue;
          }

          // Try to parse GPS data with IMEI
          const gpsData = GPS103Parser.parse(packet, imei);

          if (gpsData) {
            // Find or create device
            let device = await prisma.device.findUnique({
              where: { imei: gpsData.imei },
            });

            if (!device) {
              device = await prisma.device.create({
                data: {
                  imei: gpsData.imei,
                  name: `JX10-${gpsData.imei.slice(-4)}`,
                },
              });
              console.log(`New device registered: ${device.imei}`);
            }

            // Save position
            const position = await prisma.position.create({
              data: {
                deviceId: device.id,
                latitude: gpsData.latitude,
                longitude: gpsData.longitude,
                altitude: gpsData.altitude,
                speed: gpsData.speed,
                heading: gpsData.heading,
                timestamp: gpsData.timestamp,
              },
            });

            console.log(`Position saved for device ${device.imei}:`, {
              lat: position.latitude,
              lon: position.longitude,
              speed: position.speed,
            });

            // Broadcast to WebSocket clients
            broadcastPositionUpdate({
              device,
              position,
            });

            // Send location acknowledgment
            const serialNumber = packet.readUInt16BE(packet.length - 4);
            socket.write(GPS103Parser.generateLocationResponse(serialNumber));
          }
        }
      } catch (error) {
        console.error('Error processing device data:', error);
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socket.on('close', () => {
      const imei = socketImeiMap.get(socket);
      if (imei) {
        console.log(`Device disconnected: ${imei}`);
        socketImeiMap.delete(socket);
      } else {
        console.log('Device disconnected');
      }
    });
  });

  server.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`TCP Server listening on 0.0.0.0:${TCP_PORT}`);
  });

  server.on('error', (error) => {
    console.error('TCP Server error:', error);
  });

  return server;
}
