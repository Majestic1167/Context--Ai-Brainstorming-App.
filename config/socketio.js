import { Server } from "socket.io";
import Session from "../models/session.js";
import User from "../models/User.js";
import { finalizeSessionStats } from "../controllers/sessionStats.js";
import Idea from "../models/brainstormingidea.js";
import axios from "axios";
import { LM_STUDIO_URL } from "../config/lmstudio.js";

let io;

/**
 * Initializes Socket.IO server with authentication middleware and
 * defines all event handlers for user interaction within sessions.
 *
 * @param {http.Server} server - The HTTP server instance to bind Socket.IO to
 */
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
      ` Connection established - ${socket.username} (${socket.userId})`
    );
    console.log("A user connected:", socket.id);

    /**
     * Adds user to a brainstorming room/session.
     *
     * @param {Object} roomData - Includes roomId, userId, username
     */
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

        //  Send host status
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

    /**
     * Host initiates the brainstorming session.
     * Notifies participants and increments session counters.
     *
     * @param {Object} data - Contains sessionId
     */
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

      //  Increment sessionsJoined for each participant
      await Promise.all(
        session.participants.map((participant) =>
          User.findByIdAndUpdate(participant._id, {
            $inc: { sessionsJoined: 1 },
          })
        )
      );

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

    /**
     * Broadcasts a chat message within the session room.
     *
     * @param {Object} data - Contains message, roomId, username, userId
     */
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

    /**
     * Saves and shares a brainstorming word idea.
     *
     * @param {Object} data - Contains word, username, sessionId, userId
     */
    socket.on("send-idea", async ({ word, username, sessionId, userId }) => {
      if (!sessionId || !userId || !word) {
        console.warn("Missing data in send-idea");
        return;
      }

      try {
        const existingIdeaDoc = await Idea.findOne({ sessionId });

        if (existingIdeaDoc) {
          // Push word to existing doc
          existingIdeaDoc.words.push({
            userId,
            username,
            content: word,
          });
          await existingIdeaDoc.save();
        } else {
          // First word for this session — create new doc
          await Idea.create({
            sessionId,
            words: [{ userId, username, content: word }],
          });
        }

        //  Increment totalWords for the user
        await User.findByIdAndUpdate(userId, {
          $inc: { totalWords: 1 },
        });

        io.to(sessionId).emit("receive-idea", {
          word,
          username,
          userId,
        });
      } catch (err) {
        console.error("Error saving idea:", err);
      }
    });

    /**
     * Broadcasts typing indicator to other users in the room.
     *
     * @param {Object} data - Contains roomId, username, isTyping flag
     */
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

    /**
     * Finalizes the session, processes all ideas via AI,
     * broadcasts the summary, and updates the database.
     *
     * @param {Object} data - Includes sessionId and optional ideas
     */
    socket.on("timer-finished", async (data) => {
      let sessionId; // Defined sessionId outside  try block to make it accessible in all parts of the code
      try {
        sessionId = data?.sessionId;
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

        console.log("Fetched session:", session); // Logging for debugging

        //  Ensure only the host can finalize the session
        if (socket.userId !== session.hostId.toString()) {
          console.warn(
            `Unauthorized timer-finished attempt by ${socket.userId}`
          );
          return;
        }

        // 1. Get all ideas from DB (replaces saving block)
        const ideaDoc = await Idea.findOne({ sessionId });
        if (!ideaDoc || ideaDoc.words.length === 0) {
          console.warn("No ideas found in DB for session:", sessionId);
          return;
        }

        // 2. Finalize session stats
        await finalizeSessionStats(sessionId);

        const wordsWithUsernames = ideaDoc.words
          .map((w) => `"${w.content}" (by ${w.username})`)
          .join(", ");

        const prompt = `
"role": "As a collaborative AI content generator",
"input": "You will receive a list of words created by users during a brainstorming session.",
Theme: "${session.theme}"
Words: ${wordsWithUsernames}
"steps": [
  "Analyze the list of words and eliminate the ones that do not belong to the theme.",
  "Generate a creative idea based on the words provided by the users in the brainstorming session.",
  "Identify which user contributed the most words or the most central ones used in the text."
],
"expectation": "Produce a JSON object with exactly three fields: (1) 'words' - an array of all theme-relevant words from the session
 input that are actually used in the generated text, (2) 'generated_text' - the full creative idea using
  the selected words, and (3) 'most_influential_contributor' - an object with 'name' (username) 
  and 'words' (an array of only the words they contributed that appear in the generated text)."
`;

        console.log(" Final AI Prompt being sent:\n", prompt);

        // 4. Send prompt to LM Studio
        const payload = {
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "phi-3.1-mini-128k-instruct",
          stream: false,
        };

        // Send the prompt to LM Studio and get the response
        const { data: lmData } = await axios.post(LM_STUDIO_URL, payload);
        const aiResponse = lmData.choices[0].message.content;

        if (!aiResponse) {
          console.error("AI response is empty or failed.");
          return;
        }

        // 5. Send the AI response to all clients in the session
        io.to(sessionId).emit("ai-response", { response: aiResponse });

        // 6. Parse and save the AI summary and contributor to the DB
        try {
          const cleaned = aiResponse
            .replace(/<think>/gi, "")
            .replace(/<\/think>/gi, "")
            .replace(/```json|```/gi, "")
            .replace(/\/\/.*$/gm, "")
            .trim();

          const parsed = JSON.parse(cleaned);

          // Check if parsed data is valid
          if (typeof parsed !== "object" || parsed === null) {
            console.error("Parsed content is not an object", parsed);
            return;
          }

          const generatedText =
            parsed.generated_text ||
            parsed.generated_idea ||
            parsed.generatedText ||
            parsed.generatedIdea ||
            "No concept generated.";

          // Extract and validate contributor data
          let contributor = parsed.most_influential_contributor || {};
          const username =
            contributor.username ||
            contributor.user ||
            contributor.user_name ||
            contributor.name ||
            "Unknown";

          const contributionCount =
            contributor.contribution_count ||
            contributor.number_of_words ||
            contributor.word_count ||
            0;

          const wordsListed = Array.isArray(
            contributor.words_listed ||
              contributor.words ||
              contributor.words_contributed ||
              parsed.words ||
              parsed.word_list ||
              parsed.final_wordlist?.words
          )
            ? contributor.words_listed ||
              contributor.words ||
              contributor.words_contributed ||
              parsed.words ||
              parsed.word_list ||
              parsed.final_wordlist?.words
            : [];

          // Ensure contributor exists before saving to the database
          const user = await User.findOne({ username });

          if (user) {
            // Increment the user's top contributions count
            await User.findByIdAndUpdate(user._id, {
              $inc: { noOfTopContributions: 1 },
            });
          }

          console.log(generatedText);

          await Session.findByIdAndUpdate(sessionId, {
            aiSummary: generatedText,
            mostInfluentialContributor: {
              userId: user?._id || null,
              username,
              contributionCount,
              wordsListed,
            },
            status: "completed",
          });

          console.log(" AI summary saved to session:", sessionId);
        } catch (saveErr) {
          console.error("Error during session finalization:", saveErr);

          if (sessionId) {
            io.to(sessionId).emit("ai-error", {
              message: "AI response failed.",
            });
          }
        }
      } catch (err) {
        console.error("Error during session finalization:", err);

        if (sessionId) {
          io.to(sessionId).emit("ai-error", {
            message: "An unexpected error occurred.",
          });
        }
      }
    });

    /**
     * Handles user disconnection and updates participant list.
     */
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

/**
 * Returns the initialized Socket.IO instance.
 *
 * @returns {Server} io - The active Socket.IO instance
 */
export function getIO() {
  if (!io) {
    throw new Error("Socket not initialized");
  }
  return io;
}
