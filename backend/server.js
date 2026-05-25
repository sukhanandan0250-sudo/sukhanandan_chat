import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ create socket.io server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// routes
app.use("/user", userRoutes);
app.use("/message", messageRoutes);

// socket.io logic
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("registerUser", (userId) => {
    socket.join(userId);
    console.log("Registered user room:", userId);
  });

  socket.on("sendMessage", (message) => {
    io.to(message.receiverId).emit("receiveMessage", message);
  });

  socket.on("typing", ({ receiverId, senderId }) => {
    socket.to(receiverId).emit("showTyping", { senderId });
  });

  socket.on("stopTyping", ({ receiverId, senderId }) => {
    socket.to(receiverId).emit("hideTyping", { senderId });
  });

  socket.on("call:start", ({ receiverId, caller, callType, offer }) => {
    io.to(receiverId).emit("call:incoming", {
      from: caller?._id,
      caller,
      callType,
      offer
    });
  });

  socket.on("call:accept", ({ callerId, receiver, answer }) => {
    io.to(callerId).emit("call:accepted", {
      from: receiver?._id,
      receiver,
      answer
    });
  });

  socket.on("call:reject", ({ callerId, receiver }) => {
    io.to(callerId).emit("call:rejected", {
      from: receiver?._id,
      receiver
    });
  });

  socket.on("call:end", ({ receiverId, senderId }) => {
    io.to(receiverId).emit("call:ended", { from: senderId });
  });

  socket.on("call:ice-candidate", ({ receiverId, senderId, candidate }) => {
    io.to(receiverId).emit("call:ice-candidate", {
      from: senderId,
      candidate
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// db + server start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.log("DB Error:", err));
