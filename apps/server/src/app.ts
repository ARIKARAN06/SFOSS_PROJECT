import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { ENV } from './config/env';

const app = express();
const server = http.createServer(app);

// CORS configuration for local LAN offline setup
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    env: ENV.NODE_ENV,
    localIp: ENV.LOCAL_SERVER_IP,
    offlineMode: true,
  });
});

// API Routes
app.use('/api', apiRouter);

// Catch-all for unmatched /api routes - return JSON 404, never HTML
app.all(['/api', '/api/*'], (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
  });
});

// Global Error Handler
app.use(errorHandler);

// Socket.io for Real-time Monitoring & Broadcasts
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  socket.on('join_room', (roomCode) => {
    socket.join(`room_${roomCode}`);
  });

  socket.on('anti_cheat_alert', (data) => {
    // Broadcast to admin room
    io.emit('admin_anti_cheat_event', data);
  });

  socket.on('disconnect', () => {
    // Disconnect event
  });
});

export { app, server, io };
