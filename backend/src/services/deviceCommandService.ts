import net from 'net';
import { prisma } from '../config/database';
import { GPS103Parser } from '../tcp/gps103Parser';

// Reference to the socket map from tcpServer (will be set via setter)
let socketImeiMap: Map<net.Socket, string> | null = null;

// Serial number counter for command packets
let commandSerialNumber = 1;

/**
 * Set the socket-to-IMEI map reference from tcpServer
 * This must be called during server initialization
 */
export function setSocketImeiMap(map: Map<net.Socket, string>) {
  socketImeiMap = map;
  console.log('[DeviceCommandService] Socket map initialized');
}

/**
 * Get the next command serial number (wraps at 65535)
 */
function getNextSerialNumber(): number {
  const serial = commandSerialNumber;
  commandSerialNumber = (commandSerialNumber + 1) % 65536;
  return serial;
}

/**
 * Find the socket for a device by IMEI
 */
function findSocketByImei(imei: string): net.Socket | null {
  if (!socketImeiMap) {
    console.error('[DeviceCommandService] Socket map not initialized');
    return null;
  }

  for (const [socket, socketImei] of socketImeiMap.entries()) {
    if (socketImei === imei) {
      return socket;
    }
  }

  return null;
}

/**
 * Send a command to a GPS device
 * @param imei - Device IMEI
 * @param commandBuffer - Pre-built command buffer
 * @returns true if command was sent, false otherwise
 */
function sendCommandToDevice(imei: string, commandBuffer: Buffer): boolean {
  const socket = findSocketByImei(imei);

  if (!socket) {
    console.log(`[DeviceCommandService] Device ${imei} not connected`);
    return false;
  }

  try {
    socket.write(commandBuffer);
    console.log(`[DeviceCommandService] Sent command to device ${imei}: ${commandBuffer.toString('hex')}`);
    return true;
  } catch (error) {
    console.error(`[DeviceCommandService] Error sending command to ${imei}:`, error);
    return false;
  }
}

/**
 * Set the GPS upload interval for a device
 * @param deviceId - Database device ID
 * @param intervalSeconds - New interval in seconds
 * @returns Object with success status and message
 */
export async function setDeviceInterval(
  deviceId: string,
  intervalSeconds: number
): Promise<{ success: boolean; message: string; connected: boolean }> {
  try {
    // Get device from database
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: {
        id: true,
        imei: true,
        name: true,
        type: true,
        currentInterval: true,
      },
    });

    if (!device) {
      return { success: false, message: 'Device not found', connected: false };
    }

    if (!device.imei) {
      return { success: false, message: 'Device has no IMEI (not a GPS tracker)', connected: false };
    }

    if (device.type !== 'GPS_TRACKER') {
      return { success: false, message: 'Device is not a GPS tracker', connected: false };
    }

    // Check if device is connected
    const socket = findSocketByImei(device.imei);
    const isConnected = socket !== null;

    // Generate and send the TIMER command
    const serialNumber = getNextSerialNumber();
    const commandBuffer = GPS103Parser.generateTimerCommand(intervalSeconds, serialNumber);

    if (isConnected) {
      const sent = sendCommandToDevice(device.imei, commandBuffer);
      if (sent) {
        // Update the device's current interval in database
        await prisma.device.update({
          where: { id: deviceId },
          data: { currentInterval: intervalSeconds },
        });

        console.log(`[DeviceCommandService] Successfully set interval to ${intervalSeconds}s for device ${device.imei}`);
        return {
          success: true,
          message: `Interval set to ${intervalSeconds} seconds`,
          connected: true,
        };
      }
    }

    // Device not connected - queue the interval change for when it reconnects
    // For now, just update the DB so we know what interval we want
    await prisma.device.update({
      where: { id: deviceId },
      data: { currentInterval: intervalSeconds },
    });

    console.log(`[DeviceCommandService] Device ${device.imei} not connected, queued interval change to ${intervalSeconds}s`);
    return {
      success: true,
      message: `Interval will be set to ${intervalSeconds} seconds when device connects`,
      connected: false,
    };
  } catch (error) {
    console.error('[DeviceCommandService] Error setting device interval:', error);
    return { success: false, message: 'Failed to set device interval', connected: false };
  }
}

/**
 * Update device interval based on event status and lock state
 * Called when events are created/closed or device is unlocked
 * @param deviceId - Database device ID
 */
export async function updateDeviceIntervalBasedOnEvents(deviceId: string): Promise<void> {
  try {
    // Get device with its configured intervals and lock state
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: {
        id: true,
        imei: true,
        activeInterval: true,
        idleInterval: true,
        currentInterval: true,
        isLocked: true,
      },
    });

    if (!device || !device.imei) {
      console.log(`[DeviceCommandService] Device ${deviceId} not found or has no IMEI`);
      return;
    }

    // Check if device has any active events with real-time tracking enabled
    const activeRealTimeEventCount = await prisma.event.count({
      where: {
        deviceId,
        status: 'IN_PROGRESS',
        realTimeTracking: true,
      },
    });

    // Use active interval if device is locked OR has real-time tracking events
    // This ensures quick motion detection when device is locked
    const targetInterval = (device.isLocked || activeRealTimeEventCount > 0)
      ? device.activeInterval
      : device.idleInterval;

    // Only send command if interval needs to change
    if (device.currentInterval !== targetInterval) {
      console.log(
        `[DeviceCommandService] Updating device ${device.imei} interval: ` +
        `${device.currentInterval ?? 'unknown'}s -> ${targetInterval}s ` +
        `(${activeRealTimeEventCount} active real-time events)`
      );

      await setDeviceInterval(deviceId, targetInterval);
    } else {
      console.log(
        `[DeviceCommandService] Device ${device.imei} already at target interval ${targetInterval}s`
      );
    }
  } catch (error) {
    console.error('[DeviceCommandService] Error updating device interval based on events:', error);
  }
}

/**
 * Send pending interval commands when a device connects
 * Called from tcpServer when a device logs in
 * @param imei - Device IMEI
 */
export async function onDeviceConnected(imei: string): Promise<void> {
  try {
    // Find device by IMEI
    const device = await prisma.device.findUnique({
      where: { imei },
      select: {
        id: true,
        imei: true,
        userId: true,
        activeInterval: true,
        idleInterval: true,
        currentInterval: true,
        isConfigured: true,
        isLocked: true,
      },
    });

    if (!device) {
      console.log(`[DeviceCommandService] No device found for IMEI ${imei}`);
      return;
    }

    // Only configure devices that have an owner
    if (!device.userId) {
      console.log(`[DeviceCommandService] Device ${imei} has no owner, skipping configuration`);
      return;
    }

    // Check active events with real-time tracking to determine correct interval
    const activeRealTimeEventCount = await prisma.event.count({
      where: {
        deviceId: device.id,
        status: 'IN_PROGRESS',
        realTimeTracking: true,
      },
    });

    // Use active interval if device is locked OR has real-time tracking events
    const targetInterval = (device.isLocked || activeRealTimeEventCount > 0)
      ? device.activeInterval
      : device.idleInterval;
    const isFirstTimeConfig = !device.isConfigured;

    // Small delay to ensure device is fully initialized
    setTimeout(async () => {
      // If first time configuration, send SLEEP OFF command
      if (isFirstTimeConfig) {
        console.log(`[DeviceCommandService] Device ${imei} first time config - disabling sleep mode`);

        const sleepSerialNumber = getNextSerialNumber();
        const sleepCommandBuffer = GPS103Parser.generateSleepCommand(false, sleepSerialNumber);
        sendCommandToDevice(imei, sleepCommandBuffer);

        // Wait a bit between commands
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(
        `[DeviceCommandService] Device ${imei} connected, setting interval to ${targetInterval}s ` +
        `(${activeRealTimeEventCount} active real-time events, firstTimeConfig: ${isFirstTimeConfig})`
      );

      const serialNumber = getNextSerialNumber();
      const commandBuffer = GPS103Parser.generateTimerCommand(targetInterval, serialNumber);
      const sent = sendCommandToDevice(imei, commandBuffer);

      if (sent) {
        await prisma.device.update({
          where: { imei },
          data: {
            currentInterval: targetInterval,
            isConfigured: true,
          },
        });
      }
    }, 2000); // 2 second delay to let device settle
  } catch (error) {
    console.error(`[DeviceCommandService] Error on device connect for ${imei}:`, error);
  }
}
