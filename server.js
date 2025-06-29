const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Restrict this in production
    methods: ["GET", "POST"],
  },
});

app.use(cors());

app.get("/", (req, res) => {
  res.send("WebRTC Signaling Server is running.");
});

// Email to Socket mapping
const emailToSocketId = {};

io.on("connection", (socket) => {
  console.log("🔌 New connection:", socket.id);

  socket.on("join", ({ roomId, email }) => {
    // Disconnect old socket for this email, if exists
    const existingSocketId = emailToSocketId[email];
    if (existingSocketId && existingSocketId !== socket.id) {
      const oldSocket = io.sockets.sockets.get(existingSocketId);
      if (oldSocket) {
        console.log(`🔁 Disconnecting previous socket for ${email}: ${existingSocketId}`);
        oldSocket.disconnect(true);
      }
    }

    emailToSocketId[email] = socket.id;

    socket.join(roomId);

    const usersInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || []).filter(
      (id) => id !== socket.id
    );

    console.log("🧠", email, "joined room", roomId, "Existing users:", usersInRoom);

    socket.emit("all-users", usersInRoom);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("offer", ({ target, sdp }) => {
    console.log("📨 Offer from", socket.id, "to", target);
    socket.to(target).emit("offer", { sdp, caller: socket.id });
  });

  socket.on("answer", ({ target, sdp }) => {
    console.log("📨 Answer from", socket.id, "to", target);
    socket.to(target).emit("answer", { sdp, caller: socket.id });
  });

  socket.on("ice-candidate", ({ target, candidate }) => {
    console.log("❄️ ICE candidate from", socket.id, "to", target);
    socket.to(target).emit("ice-candidate", { candidate, from: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);

    // Remove email mapping
    for (const email in emailToSocketId) {
      if (emailToSocketId[email] === socket.id) {
        delete emailToSocketId[email];
        break;
      }
    }

    socket.broadcast.emit("user-left", socket.id);
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server listening on port ${PORT}`);
});
