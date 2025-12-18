import { GPSData } from '../types';

export class JX10Parser {
  /**
   * Parse JX10 GPS data packet
   * JX10 sends data in format: *HQ,{IMEI},{CMD},{data}#
   * Example: *HQ,8800000001,V1,121300,A,3723.2475,N,12158.3416,W,0.13,0.00,270314,0.0,0,0.00,0#
   */
  static parse(data: Buffer): GPSData | null {
    try {
      const message = data.toString('utf-8').trim();
      console.log('Received JX10 message:', message);

      // Check if it's a valid JX10 message
      if (!message.startsWith('*HQ,') || !message.endsWith('#')) {
        console.log('Invalid JX10 message format');
        return null;
      }

      // Remove start/end markers and split
      const content = message.substring(4, message.length - 1);
      const parts = content.split(',');

      if (parts.length < 3) {
        console.log('Insufficient data in message');
        return null;
      }

      const imei = parts[0];
      const command = parts[1];

      // Handle different command types
      if (command === 'V1' || command === 'V4') {
        return this.parseLocationData(imei, parts.slice(2));
      } else if (command === 'V0') {
        // Heartbeat packet
        console.log(`Heartbeat from device ${imei}`);
        return null;
      }

      return null;
    } catch (error) {
      console.error('Error parsing JX10 data:', error);
      return null;
    }
  }

  private static parseLocationData(imei: string, data: string[]): GPSData | null {
    try {
      // Expected format after command:
      // [0] time (HHMMSS)
      // [1] status (A=valid, V=invalid)
      // [2] latitude
      // [3] N/S
      // [4] longitude
      // [5] E/W
      // [6] speed (knots)
      // [7] heading
      // [8] date (DDMMYY)
      // ... other fields

      if (data.length < 9) {
        console.log('Insufficient location data');
        return null;
      }

      const status = data[1];
      if (status !== 'A') {
        console.log('GPS signal not valid');
        return null;
      }

      const latDegrees = this.convertCoordinates(data[2], data[3]);
      const lonDegrees = this.convertCoordinates(data[4], data[5]);
      const speedKnots = parseFloat(data[6]);
      const heading = parseFloat(data[7]);

      // Parse date and time
      const timeStr = data[0]; // HHMMSS
      const dateStr = data[8]; // DDMMYY
      const timestamp = this.parseDateTime(dateStr, timeStr);

      return {
        imei,
        latitude: latDegrees,
        longitude: lonDegrees,
        speed: speedKnots * 1.852, // Convert knots to km/h
        heading,
        timestamp,
      };
    } catch (error) {
      console.error('Error parsing location data:', error);
      return null;
    }
  }

  private static convertCoordinates(coord: string, direction: string): number {
    // Convert DDMM.MMMM format to decimal degrees
    const dotIndex = coord.indexOf('.');
    const degrees = parseInt(coord.substring(0, dotIndex - 2));
    const minutes = parseFloat(coord.substring(dotIndex - 2));

    let decimal = degrees + minutes / 60;

    if (direction === 'S' || direction === 'W') {
      decimal = -decimal;
    }

    return decimal;
  }

  private static parseDateTime(dateStr: string, timeStr: string): Date {
    // dateStr: DDMMYY
    // timeStr: HHMMSS

    const day = parseInt(dateStr.substring(0, 2));
    const month = parseInt(dateStr.substring(2, 4)) - 1; // JS months are 0-indexed
    const year = 2000 + parseInt(dateStr.substring(4, 6));

    const hour = parseInt(timeStr.substring(0, 2));
    const minute = parseInt(timeStr.substring(2, 4));
    const second = parseInt(timeStr.substring(4, 6));

    return new Date(year, month, day, hour, minute, second);
  }

  /**
   * Generate response for JX10 device
   */
  static generateResponse(command: string): Buffer {
    const response = `*HQ,${command}#`;
    return Buffer.from(response, 'utf-8');
  }
}
