import net from 'net';
import { GPS103Parser } from './gps103Parser';
import { prisma } from '../config/database';
import { broadcastPositionUpdate } from '../websocket/wsServer';
import { sendDeviceMovementAlert } from '../services/pushNotificationService';

const TCP_PORT = Number(process.env.TCP_PORT) || 8841;

// Minimum time between alerts (5 minutes) to prevent spam
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

// Maximum allowed time difference (24 hours) between device and server time
const MAX_TIMESTAMP_DRIFT_MS = 24 * 60 * 60 * 1000;

/**
 * Validate GPS timestamp and return corrected timestamp if device clock is wrong
 * Many GPS devices have incorrect internal clocks, so we use server time when
 * the device timestamp is clearly invalid (more than 24 hours off)
 */
function validateTimestamp(deviceTimestamp: Date): Date {
  const serverTime = new Date();
  const drift = Math.abs(serverTime.getTime() - deviceTimestamp.getTime());

  if (drift > MAX_TIMESTAMP_DRIFT_MS) {
    console.log(`Device timestamp ${deviceTimestamp.toISOString()} is ${Math.round(drift / (1000 * 60 * 60 * 24))} days off, using server time`);
    return serverTime;
  }

  return deviceTimestamp;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if device has moved outside its lock radius and send alert if needed
 */
async function checkDeviceLockViolation(
  device: any,
  newLatitude: number,
  newLongitude: number
): Promise<void> {
  // Skip if device is not locked
  if (!device.isLocked || device.lockLatitude === null || device.lockLongitude === null) {
    return;
  }

  // Calculate distance from lock position
  const distance = calculateDistance(
    device.lockLatitude,
    device.lockLongitude,
    newLatitude,
    newLongitude
  );

  // Check if outside allowed radius
  if (distance <= device.lockRadius) {
    return; // Within allowed range
  }

  // Check cooldown to prevent notification spam
  const now = new Date();
  if (device.lastAlertAt) {
    const timeSinceLastAlert = now.getTime() - new Date(device.lastAlertAt).getTime();
    if (timeSinceLastAlert < ALERT_COOLDOWN_MS) {
      console.log(`Device ${device.imei} movement alert skipped (cooldown)`);
      return;
    }
  }

  console.log(`Device ${device.imei} moved ${distance.toFixed(1)}m outside lock radius of ${device.lockRadius}m`);

  // Update last alert time
  await prisma.device.update({
    where: { id: device.id },
    data: { lastAlertAt: now },
  });

  // Get device owner's push token
  if (!device.userId) {
    console.log(`Device ${device.imei} has no owner, skipping alert`);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: device.userId },
    select: { expoPushToken: true },
  });

  if (!user?.expoPushToken) {
    console.log(`User ${device.userId} has no push token, skipping alert`);
    return;
  }

  // Send push notification
  await sendDeviceMovementAlert(
    user.expoPushToken,
    device.name || `JX10-${device.imei.slice(-4)}`,
    device.id,
    distance
  );

  // Create notification record
  await prisma.notification.create({
    data: {
      type: 'DEVICE_MOVEMENT_ALERT',
      receiverId: device.userId,
      content: `${device.name || `JX10-${device.imei.slice(-4)}`} se ha movido ${distance.toFixed(0)}m de su posición bloqueada`,
    },
  });
}

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

          // Check if it's a status packet (0x13 or 0x23) with battery info
          if (GPS103Parser.isStatusPacket(packet)) {
            const protocolNumber = packet[3];
            const statusData = GPS103Parser.parseStatusPacket(packet, imei);
            if (statusData) {
              // Update device battery level in database
              await prisma.device.updateMany({
                where: { imei: statusData.imei },
                data: {
                  batteryLevel: statusData.batteryLevel,
                  batteryUpdatedAt: new Date(),
                },
              });
              console.log(`Updated battery level for ${imei}: ${statusData.batteryLevel}%`);

              // Send status response with the same protocol number
              const serialNumber = packet.readUInt16BE(packet.length - 4);
              socket.write(GPS103Parser.generateStatusResponse(serialNumber, protocolNumber));
            }
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

            // Check for lock violation BEFORE saving position
            await checkDeviceLockViolation(device, gpsData.latitude, gpsData.longitude);

            // Save position with validated timestamp
            const validatedTimestamp = validateTimestamp(gpsData.timestamp);
            const position = await prisma.position.create({
              data: {
                deviceId: device.id,
                latitude: gpsData.latitude,
                longitude: gpsData.longitude,
                altitude: gpsData.altitude,
                speed: gpsData.speed,
                heading: gpsData.heading,
                timestamp: validatedTimestamp,
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
