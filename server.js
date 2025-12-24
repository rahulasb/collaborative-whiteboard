const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'] // Explicitly enable both
});

// Store drawing history per room
// Structure: { roomId: [ { x1, y1, x2, y2, color, width } ] }
const whiteboardState = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 1. Join a specific whiteboard room
  socket.on('join-board', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    // Send existing drawing history to the new user
    if (whiteboardState[roomId]) {
      socket.emit('load-history', whiteboardState[roomId]);
    } else {
      // Initialize room if it doesn't exist
      whiteboardState[roomId] = [];
    }
  });

  // 2. Handle drawing events
  socket.on('draw-stroke', ({ roomId, strokeData }) => {
    // Save to history
    if (!whiteboardState[roomId]) {
      whiteboardState[roomId] = [];
    }

    // Add stroke to history
    whiteboardState[roomId].push(strokeData);

    // Broadcast to everyone ELSE in the room
    socket.to(roomId).emit('draw-stroke', strokeData);
  });

  // 3. Handle Cursor Movement
  socket.on('cursor-move', ({ roomId, cursorData }) => {
    // Broadcast cursor position (no start/history needed usually)
    socket.to(roomId).emit('cursor-move', {
      userId: socket.id,
      ...cursorData // { x, y, name }
    });
  });

  // 4. Handle Clear Canvas
  socket.on('clear-board', (roomId) => {
    whiteboardState[roomId] = [];
    io.to(roomId).emit('clear-board');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Ideally, we'd notify others that this specific cursor is gone, 
    // but the frontend can handle "stale" cursors or we can emit 'user-left'
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
