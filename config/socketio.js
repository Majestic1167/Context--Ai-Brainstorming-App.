import { Server } from "socket.io";
import Session from "../models/session.js"; // Add this import

let io;

export function initSocket(server) {
  io = new Server(server);

  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;
    const username = socket.handshake.auth.username;

    if (!userId || !username) {
      return next(new Error("Authentication error"));
    }

    // Attach user data to socket
    socket.userId = userId;
    socket.username = username;
    next();
  });

  io.on("connection", (socket) => {
    console.log(`A user connected: ${socket.username} (${socket.userId})`);

    // Join a specific room
    socket.on("join room", async (roomData) => {
      const { roomId, userId, username } = roomData;

      // Verify the user data matches the socket auth
      if (userId !== socket.userId || username !== socket.username) {
        console.error("User data mismatch");
        return;
      }

      try {
        // Check if user is actually part of this session
        const session = await Session.findById(roomId);
        if (!session) {
          console.error("Session not found");
          return;
        }

        // Check if user is either the host or a participant
        const isHost = session.hostId.toString() === userId;
        const isParticipant = session.participants.some(
          (p) => p.toString() === userId
        );

        if (!isHost && !isParticipant) {
          console.error("User not authorized to join this session");
          return;
        }

        // Leave all current rooms except the socket's own room
        socket.rooms.forEach((room) => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });

        // Join the new room
        socket.join(roomId);
        console.log(`User ${username} joined room: ${roomId}`);

        // Notify others in the room
        socket.to(roomId).emit("user joined", {
          userId: userId,
          username: username,
          timestamp: new Date(),
          isHost: isHost,
        });

        // Send current participants to the new user
        const room = io.sockets.adapter.rooms.get(roomId);
        if (room) {
          const participants = Array.from(room)
            .map((socketId) => {
              const participantSocket = io.sockets.sockets.get(socketId);
              if (!participantSocket) return null;

              const isParticipantHost =
                session.hostId.toString() === participantSocket.userId;

              return {
                userId: participantSocket.userId,
                username: participantSocket.username,
                isHost: isParticipantHost,
              };
            })
            .filter((p) => p && p.userId && p.username);
          socket.emit("room participants", participants);
        }
      } catch (error) {
        console.error("Error joining room:", error);
      }
    });

    // Handle chat messages
    socket.on("chat message", async (data) => {
      try {
        // Verify the sender and their session participation
        const session = await Session.findById(data.roomId);
        if (!session) return;

        const isHost = session.hostId.toString() === socket.userId;
        const isParticipant = session.participants.some(
          (p) => p.toString() === socket.userId
        );

        if (!isHost && !isParticipant) {
          console.error("Unauthorized message attempt");
          return;
        }

        // Verify the sender identity
        if (
          data.userId !== socket.userId ||
          data.username !== socket.username
        ) {
          console.error("Message sender mismatch");
          return;
        }

        console.log(`Message in room ${data.roomId}: ${data.message}`);
        io.to(data.roomId).emit("chat message", {
          message: data.message,
          userId: socket.userId,
          username: socket.username,
          timestamp: new Date(),
          isHost: isHost,
        });
      } catch (error) {
        console.error("Error handling message:", error);
      }
    });

    // Handle typing notification
    socket.on("typing", async (data) => {
      try {
        // Verify the sender and their session participation
        const session = await Session.findById(data.roomId);
        if (!session) return;

        const isHost = session.hostId.toString() === socket.userId;
        const isParticipant = session.participants.some(
          (p) => p.toString() === socket.userId
        );

        if (!isHost && !isParticipant) return;

        if (data.username !== socket.username) {
          console.error("Typing notification sender mismatch");
          return;
        }

        socket.to(data.roomId).emit("typing", {
          username: socket.username,
          isTyping: data.isTyping,
          isHost: isHost,
        });
      } catch (error) {
        console.error("Error handling typing notification:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.username}`);
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.to(room).emit("user left", {
            userId: socket.userId,
            username: socket.username,
            timestamp: new Date(),
          });
        }
      });
    });
  });
}

export function getIO() {
  if (!io) {
    throw new Error("Socket not initialized");
  }
  return io;
}
