import { Server } from "socket.io";
import Session from "../models/session.js";

import { finalizeSessionStats } from "../controllers/sessionStats.js";
import Idea from "../models/brainstormingidea.js";
import axios from "axios";
import { LM_STUDIO_URL } from "../config/lmstudio.js"; // adjust if needed

let io;

export function initSocket(server) {
  io = new Server(server);

  io.use((socket, next) => {
    const { userId, username } = socket.handshake.auth;
    if (!userId || !username) {
      return next(new Error("Authentication error"));
    }
    socket.userId = userId;
    socket.username = username;
    next();
  });

  io.on("connection", (socket) => {
    console.log(
      `✅ Connection established - ${socket.username} (${socket.userId})`
    );
    console.log("A user connected:", socket.id);

    socket.on("join room", async (roomData) => {
      const { roomId, userId, username } = roomData;

      if (!roomId || !userId || !username) {
        console.error("Missing required room data:", roomData);
        return;
      }

      if (userId !== socket.userId || username !== socket.username) {
        console.error("User data mismatch");
        return;
      }

      try {
        const session = await Session.findById(roomId)
          .populate("hostId", "username profilePicture")
          .populate("participants", "username profilePicture");

        if (!session) {
          console.error("Session not found");
          return;
        }

        let isHost = false;
        if (!session.hostId) {
          session.hostId = userId;
          isHost = true;
          await session.save();
        } else {
          isHost = session.hostId.toString() === userId;
        }

        const isParticipant = session.participants.some(
          (p) => p._id.toString() === userId
        );
        if (!isParticipant) {
          session.participants.push(userId);
          await session.save();
        }

        if (!isHost && !isParticipant) {
          console.error("User not authorized to join this session");
          return;
        }

        socket.rooms.forEach((room) => {
          if (room !== socket.id) socket.leave(room);
        });

        socket.join(roomId);

        // ✅ Send host status
        socket.emit("session-info", { isHost });

        console.log(`User ${username} joined room: ${roomId}`);

        const currentUser = session.participants.find(
          (p) => p._id.toString() === userId
        );
        const profilePicture = currentUser?.profilePicture || null;

        socket.to(roomId).emit("user joined", {
          userId,
          username,
          profilePicture,
          timestamp: new Date(),
          isHost,
        });

        //  FIXED PARTICIPANT EMIT WITH PROFILE PICS
        const updatedSession = await Session.findById(roomId)
          .populate("hostId", "username profilePicture")
          .populate("participants", "username profilePicture");

        const participants = updatedSession.participants.map((p) => ({
          userId: p._id.toString(),
          username: p.username,
          profilePicture: p.profilePicture || null,
          isHost: p._id.equals(updatedSession.hostId._id),
        }));

        io.to(roomId).emit("room participants", {
          participants,
          totalParticipants: participants.length,
        });
      } catch (error) {
        console.error("Error joining room:", error);
      }
    });

    socket.on("start-session", async ({ sessionId }) => {
      const session = await Session.findById(sessionId)
        .populate("hostId", "username profilePicture")
        .populate("participants", "username profilePicture");

      if (!session) return;

      const participants = session.participants.map((p) => ({
        username: p.username,
        profilePicture: p.profilePicture,
        isHost: p._id.equals(session.hostId._id),
      }));

      io.to(sessionId).emit("session-started", {
        sessionId: session._id,
        sessionName: session.sessionName,
        theme: session.theme,
        timer: session.timer,
        host: {
          username: session.hostId.username,
          profilePicture: session.hostId.profilePicture,
        },
        participants,
      });
    });

    socket.on("chat message", async (data) => {
      try {
        const session = await Session.findById(data.roomId);
        if (!session) return;

        const isHost = session.hostId.toString() === socket.userId;
        const isParticipant = session.participants.some(
          (p) => p.toString() === socket.userId
        );

        if (!isHost && !isParticipant) return;

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

    /*
    socket.on("send-idea", ({ word, username, sessionId }) => {
      io.to(sessionId).emit("receive-idea", { word, username });
    });*/

    socket.on("send-idea", async ({ word, username, sessionId, userId }) => {
      if (!sessionId || !userId || !word) {
        console.warn("Missing data in send-idea");
        return;
      }

      try {
        // 1. Save to MongoDB (wordCount will be set by your pre-save hook)
        const savedIdea = await Idea.create({
          sessionId,
          userId,
          content: word,
        });

        console.log("Idea saved to DB:", savedIdea);

        // 2. Broadcast to all users in that session
        io.to(sessionId).emit("receive-idea", {
          word: savedIdea.content,
          username,
          userId: savedIdea.userId, // <— use savedIdea, not saved
          ideaId: savedIdea._id, // optional: include the new idea’s id
        });
      } catch (err) {
        console.error("Error saving idea:", err);
      }
    });

    socket.on("typing", async (data) => {
      try {
        const session = await Session.findById(data.roomId);
        if (!session) return;

        const isHost = session.hostId.toString() === socket.userId;
        const isParticipant = session.participants.some(
          (p) => p.toString() === socket.userId
        );
        if (!isHost && !isParticipant) return;

        if (data.username !== socket.username) return;

        socket.to(data.roomId).emit("typing", {
          username: socket.username,
          isTyping: data.isTyping,
          isHost,
        });
      } catch (error) {
        console.error("Error handling typing notification:", error);
      }
    });

    socket.on("timer-finished", async (data) => {
      try {
        const sessionId = data?.sessionId;
        const incomingIdeas = data?.ideas;

        if (!sessionId) {
          console.warn("timer-finished event received without sessionId");
          return;
        }

        const session = await Session.findById(sessionId);
        if (!session) {
          console.warn("Session not found:", sessionId);
          return;
        }

        console.log("Fetched session:", session); // <- ADD THIS LINE

        // 🔐 Ensure only the host can finalize the session
        if (socket.userId !== session.hostId.toString()) {
          console.warn(
            `Unauthorized timer-finished attempt by ${socket.userId}`
          );
          return;
        }

        // 1. Get all ideas from DB (replaces saving block)
        const ideas = await Idea.find({ sessionId }).sort({ submittedAt: 1 });
        if (ideas.length == 0) {
          console.warn("No ideas found in DB for session:", sessionId);
        }

        // 2. Finalize session stats
        await finalizeSessionStats(sessionId);

        // 3. Combine content for AI prompt
        const allWords = ideas.map((i) => i.content).join(", ");

        // 4. Build a richer prompt using sessionName and theme
        const prompt = `Session Title: "${session.sessionName}"
Theme: ${session.theme}
Brainstorming Words: ${allWords}




Based on the session title, theme, and the listed brainstorming words, generate a unique and creative concept. 
Your response should include:

1. A compelling title for the concept.
2. A one-line summary or tagline.
3. A detailed description that connects the words with the theme.
4. Optionally, suggest how the idea could be used (e.g., as a product, campaign, story, etc.).`;

        console.log("🧠 Final AI Prompt being sent:\n", prompt);

        // 4. Send prompt to LM Studio
        const payload = {
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "llama-3.2-1b-claude-3.7-sonnet-reasoning-distilled",
          stream: false,
        };

        const { data: lmData } = await axios.post(LM_STUDIO_URL, payload);
        const aiResponse = lmData.choices[0].message.content;

        // 5. Send AI response to all clients in the session
        io.to(sessionId).emit("ai-response", { response: aiResponse });
      } catch (err) {
        console.error("Error during session finalization:", err);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.username}`);

      socket.rooms.forEach(async (roomId) => {
        if (roomId !== socket.id) {
          try {
            const session = await Session.findById(roomId)
              .populate("hostId", "username profilePicture")
              .populate("participants", "username profilePicture");
            if (!session) return;

            const participants = session.participants.map((p) => ({
              userId: p._id.toString(),
              username: p.username,
              profilePicture: p.profilePicture || null,
              isHost: p._id.equals(session.hostId._id),
            }));

            io.to(roomId).emit("room participants", {
              participants,
              totalParticipants: participants.length,
            });

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
