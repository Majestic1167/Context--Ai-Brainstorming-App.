import { Server } from "socket.io";
import Session from "../models/session.js"; // Session model import

let io;

export function initSocket(server) {
  io = new Server(server);

  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const { userId, username } = socket.handshake.auth;

    if (!userId || !username) {
      return next(new Error("Authentication error"));
    }

    // Log the connection attempt
    console.log(`Socket connection attempt - User: ${username} (${userId})`);

    socket.userId = userId;
    socket.username = username;
    next();
  });

  io.on("connection", (socket) => {
    console.log(
      `✅ Connection established - ${socket.username} (${socket.userId})`
    );
    console.log("A user connected:", socket.id); // Log the socket ID

    // Handle join room event
    socket.on("join room", async (roomData) => {
      const { roomId, userId, username } = roomData;

      if (!roomId || !userId || !username) {
        console.error("Missing required room data:", {
          roomId,
          userId,
          username,
        });
        return;
      }

      if (userId !== socket.userId || username !== socket.username) {
        console.error("User data mismatch");
        return;
      }

      try {
        const session = await Session.findById(roomId);
        if (!session) {
          console.error("Session not found");
          return;
        }

        // Host assignment
        let isHost = false;
        if (!session.hostId) {
          session.hostId = userId;
          isHost = true;
          await session.save();
        } else {
          isHost = session.hostId.toString() === userId;
        }

        const isParticipant = session.participants.some(
          (p) => p.toString() === userId
        );
        if (!isParticipant) {
          session.participants.push(userId);
          await session.save();
        }

        if (!isHost && !isParticipant) {
          console.error("User not authorized to join this session");
          return;
        }

        // Leave previous rooms (except their own socket room)
        socket.rooms.forEach((room) => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });

        // Join the new room
        socket.join(roomId);
        console.log(`User ${username} joined room: ${roomId}`);

        // Notify others
        socket.to(roomId).emit("user joined", {
          userId,
          username,
          timestamp: new Date(),
          isHost,
        });

        // Emit participant list to all
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

          io.to(roomId).emit("room participants", {
            participants,
            totalParticipants: participants.length,
          });
        }
      } catch (error) {
        console.error("Error joining room:", error);
      }
    });

    // Start session event - emitted when host clicks "Start"
    socket.on("start session", async (roomId) => {
      try {
        const session = await Session.findById(roomId);
        if (!session) {
          console.error("Session not found");
          return;
        }

        // Emit to all clients (including the host) that the session has started
        io.to(roomId).emit("session started", { roomId });

        // Log that the session started
        console.log(`Session started for room: ${roomId}`);
      } catch (error) {
        console.error("Error starting session:", error);
      }
    });

    // Chat message handler
    socket.on("chat message", async (data) => {
      try {
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
          isHost,
        });
      } catch (error) {
        console.error("Error handling message:", error);
      }
    });

    // Typing handler
    socket.on("typing", async (data) => {
      try {
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
          isHost,
        });
      } catch (error) {
        console.error("Error handling typing notification:", error);
      }
    });

    // Disconnect handler
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.username}`);

      socket.rooms.forEach(async (roomId) => {
        if (roomId !== socket.id) {
          try {
            const session = await Session.findById(roomId);
            if (!session) return;

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

              io.to(roomId).emit("room participants", {
                participants,
                totalParticipants: participants.length,
              });
            }

            // Notify others
            socket.to(roomId).emit("user left", {
              userId: socket.userId,
              username: socket.username,
              timestamp: new Date(),
            });
          } catch (err) {
            console.error("Error handling disconnect:", err);
          }
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
