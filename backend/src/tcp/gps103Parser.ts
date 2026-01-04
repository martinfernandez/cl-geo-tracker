import { GPSData, DeviceStatusData } from '../types';

// GT06 protocol battery level mapping (from raw value to percentage)
const BATTERY_LEVEL_MAP: { [key: number]: number } = {
  0: 0,    // No power (shutdown)
  1: 5,    // Extremely low
  2: 15,   // Very low
  3: 35,   // Low
  4: 65,   // Medium
  5: 90,   // High
  6: 100,  // Full
};

// GSM signal mapping (from raw value to percentage)
const GSM_SIGNAL_MAP: { [key: number]: number } = {
  0: 0,
  1: 25,
  2: 50,
  3: 75,
  4: 100,
};

export interface ParseResult {
  type: 'location' | 'status';
  data: GPSData | DeviceStatusData;
}

export class GPS103Parser {
  /**
   * Parse GPS103/GT06 binary protocol
   * @param data - The binary packet data
   * @param imei - The IMEI (required for location packets, optional for login)
   */
  static parse(data: Buffer, imei?: string): GPSData | null {
    try {
      // Check if it starts with 7878 (GPS103 protocol)
      if (data.length < 5 || data[0] !== 0x78 || data[1] !== 0x78) {
        return null;
      }

      const length = data[2];
      const protocolNumber = data[3];

      console.log(`GPS103 Protocol Number: 0x${protocolNumber.toString(16)}`);

      // 0x12 = Location data
      // 0x22 = Location with course, speed, etc
      if (protocolNumber === 0x12 || protocolNumber === 0x22) {
        if (!imei) {
          console.error('IMEI required for location packet');
          return null;
        }
        return this.parseLocationData(data, imei);
      }

      // 0x01 = Login request (handled in tcpServer.ts)
      if (protocolNumber === 0x01) {
        console.log('GPS103 Login packet received');
        return null; // Login doesn't have GPS data
      }

      return null;
    } catch (error) {
      console.error('Error parsing GPS103 data:', error);
      return null;
    }
  }

  /**
   * Parse status packet (0x13 or 0x23) - returns battery and GSM signal info
   * GT06 Status packet structure:
   * [0-1]: Start bits 7878
   * [2]: Length
   * [3]: Protocol number (0x13 or 0x23)
   * [4]: Terminal information (includes battery level in lower bits)
   * [5]: Voltage level
   * [6]: GSM signal strength
   * [7-8]: Reserved
   * [9-10]: Serial number
   * [11-12]: CRC
   * [13-14]: Stop bits 0d0a
   */
  static parseStatusPacket(data: Buffer, imei: string): DeviceStatusData | null {
    try {
      const protocolNumber = data[3];
      if (data.length < 10 || (protocolNumber !== 0x13 && protocolNumber !== 0x23)) {
        return null;
      }

      // Terminal info byte - lower 4 bits contain battery level (0-6)
      const terminalInfo = data[4];
      const voltageLevel = data[5]; // Voltage level byte (0-6 typically)
      const batteryRaw = terminalInfo & 0x07; // Lower 3 bits for battery
      const isCharging = (terminalInfo & 0x08) !== 0; // Bit 3 for charging status

      // GSM signal strength - lower 4 bits (0-4)
      const gsmRaw = data[6] & 0x0f;

      // Use voltage level if terminal info shows 0 (some devices report voltage separately)
      // Voltage level: 0=lowest, 6=highest, map to percentage
      const effectiveBatteryRaw = batteryRaw > 0 ? batteryRaw : voltageLevel;
      const batteryLevel = BATTERY_LEVEL_MAP[effectiveBatteryRaw] ?? 0;
      const gsmSignal = GSM_SIGNAL_MAP[gsmRaw] ?? 0;

      console.log(`Parsed GPS103 status (0x${protocolNumber.toString(16)}):`, {
        imei,
        terminalInfoHex: `0x${terminalInfo.toString(16)}`,
        voltageLevelHex: `0x${voltageLevel.toString(16)}`,
        batteryRaw,
        voltageLevel,
        effectiveBatteryRaw,
        batteryLevel,
        isCharging,
        gsmRaw,
        gsmSignal,
      });

      return {
        imei,
        batteryLevel,
        isCharging,
        gsmSignal,
      };
    } catch (error) {
      console.error('Error parsing GPS103 status:', error);
      return null;
    }
  }

  /**
   * Check if packet is a status packet (0x13) or heartbeat packet (0x23)
   * Both can contain battery information
   */
  static isStatusPacket(data: Buffer): boolean {
    if (data.length < 5 || data[0] !== 0x78 || data[1] !== 0x78) {
      return false;
    }
    const protocolNumber = data[3];
    // 0x13 = Status/Heartbeat, 0x23 = Heartbeat (alternative)
    return protocolNumber === 0x13 || protocolNumber === 0x23;
  }

  /**
   * Generate response for status packet (0x13 or 0x23)
   */
  static generateStatusResponse(serialNumber: number, protocolNumber: number = 0x13): Buffer {
    const response = Buffer.alloc(10);
    response[0] = 0x78;
    response[1] = 0x78;
    response[2] = 0x05; // Length
    response[3] = protocolNumber; // Echo back the same protocol number
    response.writeUInt16BE(serialNumber, 4);
    response[6] = 0x0d;
    response[7] = 0x0a;
    return response;
  }

  private static parseLocationData(data: Buffer, imei: string): GPSData | null {
    try {
      // GPS103 location packet structure:
      // [0-1]: Start bits 7878
      // [2]: Length
      // [3]: Protocol number (0x12 or 0x22)
      // [4-9]: Date time (BCD format)
      // [10]: GPS info (satellites count)
      // [11-14]: Latitude
      // [15-18]: Longitude
      // [19]: Speed
      // [20-21]: Course/Heading
      // ... more fields
      // [-4,-3]: Serial number
      // [-2,-1]: Stop bits 0d0a

      // Parse date/time (BCD format)
      const year = 2000 + this.bcdToDec(data[4]);
      const month = this.bcdToDec(data[5]) - 1;
      const day = this.bcdToDec(data[6]);
      const hour = this.bcdToDec(data[7]);
      const minute = this.bcdToDec(data[8]);
      const second = this.bcdToDec(data[9]);

      // GPS info byte
      const gpsLength = data[10] >> 4;
      const satelliteCount = data[10] & 0x0f;

      // Latitude (4 bytes)
      const latValue = data.readUInt32BE(11);
      let latitude = latValue / 1800000.0;

      // Longitude (4 bytes)
      const lonValue = data.readUInt32BE(15);
      let longitude = lonValue / 1800000.0;

      // Speed (1 byte, km/h)
      const speed = data[19];

      // Course/Heading (2 bytes)
      const courseStatus = data.readUInt16BE(20);
      const heading = courseStatus & 0x03ff; // Lower 10 bits

      // Extract hemisphere flags from courseStatus
      // Bit 11 (0x0800): Latitude hemisphere (0=South, 1=North)
      // Bit 12 (0x1000): Longitude hemisphere (0=East, 1=West)
      const isNorth = (courseStatus & 0x0800) === 0;
      const isWest = (courseStatus & 0x1000) !== 0;

      // Apply hemisphere signs
      if (!isNorth) {
        latitude = -latitude; // South is negative
      }
      if (isWest) {
        longitude = -longitude; // West is negative
      }

      const timestamp = new Date(year, month, day, hour, minute, second);

      console.log('Parsed GPS103 location:', {
        imei,
        lat: latitude,
        lon: longitude,
        speed,
        heading,
        satellites: satelliteCount,
        timestamp,
        hemisphere: `${isNorth ? 'N' : 'S'} ${isWest ? 'W' : 'E'}`,
        courseStatus: `0x${courseStatus.toString(16)}`,
      });

      return {
        imei,
        latitude,
        longitude,
        speed,
        heading,
        timestamp,
      };
    } catch (error) {
      console.error('Error parsing GPS103 location:', error);
      return null;
    }
  }

  /**
   * Parse IMEI from BCD format
   * @param buffer - 8-byte buffer containing IMEI in BCD format
   */
  static parseIMEI(buffer: Buffer): string {
    // IMEI is stored in BCD format
    let imei = '';
    for (let i = 0; i < 8; i++) {
      const byte = buffer[i];
      imei += ((byte >> 4) & 0x0f).toString();
      imei += (byte & 0x0f).toString();
    }
    // Remove trailing F if present and leading 0
    return imei.replace(/F/g, '').substring(1);
  }

  private static bcdToDec(bcd: number): number {
    return ((bcd >> 4) * 10) + (bcd & 0x0f);
  }

  /**
   * Generate GPS103 response for login
   */
  static generateLoginResponse(serialNumber: number): Buffer {
    // Response format: 7878 05 01 SERIAL 0d0a
    const response = Buffer.alloc(10);
    response[0] = 0x78;
    response[1] = 0x78;
    response[2] = 0x05; // Length
    response[3] = 0x01; // Login response
    response.writeUInt16BE(serialNumber, 4);
    response[6] = 0x0d;
    response[7] = 0x0a;

    return response;
  }

  /**
   * Generate GPS103 response for location
   */
  static generateLocationResponse(serialNumber: number): Buffer {
    // Response format: 7878 05 12 SERIAL 0d0a
    const response = Buffer.alloc(10);
    response[0] = 0x78;
    response[1] = 0x78;
    response[2] = 0x05; // Length
    response[3] = 0x12; // Location response
    response.writeUInt16BE(serialNumber, 4);
    response[6] = 0x0d;
    response[7] = 0x0a;

    return response;
  }
}
