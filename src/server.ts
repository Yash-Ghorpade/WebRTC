// src/server.ts
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

// Basic server setup
const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "*", // Allow all for testing; restrict in production
}));

const io = new Server(server, {
  cors: {
    origin: "*", // Change this in production
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", socket.id);

    socket.on("signal", ({ to, data }) => {
      io.to(to).emit("signal", { from: socket.id, data });
    });

    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-left", socket.id);
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
