import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { startTcpServer } from './tcp/tcpServer';
import { startWebSocketServer } from './websocket/wsServer';
import { apiRouter } from './api/routes';
import { ShareController } from './api/controllers/shareController';
import { QRPageController } from './api/controllers/qrPageController';

// Ensure uploads directory exists (for local storage fallback)
const uploadsDir = path.join(process.cwd(), 'uploads', 'events');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('[Server] Created uploads directory:', uploadsDir);
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Shared event page (public, no auth required)
// Must be before API routes to handle /e/:eventId
app.get('/e/:eventId', ShareController.getSharedEvent);

// QR code public page (for found objects)
// Must be before API routes to handle /q/:qrCode
app.get('/q/:qrCode', QRPageController.getQRPage);

// API routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  try {
    // Start HTTP server
    const httpServer = app.listen(PORT, () => {
      console.log(`HTTP Server running on port ${PORT}`);
    });

    // Start WebSocket server
    startWebSocketServer(httpServer);

    // Start TCP server for GPS devices
    startTcpServer();

    console.log('All servers started successfully');
  } catch (error) {
    console.error('Failed to start servers:', error);
    process.exit(1);
  }
}

start();
