// server.js (Node.js + Express + Socket.IO backend for chess coaching)

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Replace with your frontend URL in production
    methods: ["GET", "POST"]
  }
});

// Mapping of roomId => { fen, users: [], lock: boolean }
const rooms = {}; // Optionally use a DB in production

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-room", ({ roomId, role }) => {
    socket.join(roomId);
    socket.data.role = role;
    socket.data.roomId = roomId;

    if (!rooms[roomId]) {
      rooms[roomId] = {
        fen: "start",
        users: [],
        lock: false
      };
    }

    rooms[roomId].users.push(socket.id);
    socket.emit("init", {
      fen: rooms[roomId].fen,
      lock: rooms[roomId].lock,
      role: role
    });

    console.log(`Socket ${socket.id} joined room ${roomId} as ${role}`);
  });

  socket.on("move", ({ from, to, fen }) => {
    const roomId = socket.data.roomId;
    if (!roomId || rooms[roomId]?.lock) return;
    rooms[roomId].fen = fen;
    socket.to(roomId).emit("move", { from, to, fen });
  });

  socket.on("set-position", ({ fen }) => {
    const roomId = socket.data.roomId;
    if (socket.data.role === "coach") {
      rooms[roomId].fen = fen;
      io.to(roomId).emit("set-position", { fen });
    }
  });

  socket.on("lock-board", (status) => {
    const roomId = socket.data.roomId;
    if (socket.data.role === "coach") {
      rooms[roomId].lock = status;
      io.to(roomId).emit("lock-board", status);
    }
  });

  socket.on("annotate", (data) => {
    const roomId = socket.data.roomId;
    if (socket.data.role === "coach") {
      io.to(roomId).emit("annotate", data);
    }
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (roomId && rooms[roomId]) {
      rooms[roomId].users = rooms[roomId].users.filter((id) => id !== socket.id);
      if (rooms[roomId].users.length === 0) {
        delete rooms[roomId]; // Clean up
      }
    }
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
