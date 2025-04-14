import { Server } from "socket.io";

let io;

export function initSocket(server) {
  io = new Server(server);

  io.on("connection", (socket) => {
    console.log("A user connected");

    // Join a specific room
    socket.on("join room", (room) => {
      socket.join(room);
      console.log(`User joined room: ${room}`);
    });

    // Example of emitting messages to a specific room
    socket.on("chat message", (data) => {
      io.to(data.room).emit("chat message", data.message);
    });

    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  });
}

export function getIO() {
  if (!io) {
    throw new Error("Socket not initialized");
  }
  return io;
}
