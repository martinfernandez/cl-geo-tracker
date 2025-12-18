import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { startTcpServer } from './tcp/tcpServer';
import { startWebSocketServer } from './websocket/wsServer';
import { apiRouter } from './api/routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

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
