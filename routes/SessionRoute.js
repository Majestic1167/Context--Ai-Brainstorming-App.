import express from "express";
const router = express.Router();

import Session from "../models/session.js";

import {
  getCreateSessionPage,
  postCreateSession,
  getjoinsessionpage,
  postjoinsession,
  getFirstRoundHostPage,
  getNextRoundPage,
  terminateSession,
} from "../controllers/sessioncontroller.js";

import { ensureAuthenticated, ensureHost } from "../middlewares/sessionAuth.js";

router.get("/createsession", ensureAuthenticated, getCreateSessionPage);

router.post("/create", ensureAuthenticated, postCreateSession);

router.get("/joinsession", ensureAuthenticated, getjoinsessionpage);

router.post("/joinsession", ensureAuthenticated, postjoinsession);

router.get("/getfirstround", ensureAuthenticated, getFirstRoundHostPage);

router.get("/nextround", ensureAuthenticated, getNextRoundPage);

router.get("/session/:sessionId", ensureAuthenticated, async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const userId = req.session.user._id;

    let session = await Session.findById(sessionId)
      .populate("hostId", "username profilePicture")
      .populate("participants", "username profilePicture");
    if (!session) return res.status(404).send("Session not found");

    // auto‑join logic
    const already = session.participants.some(
      (p) => p._id.toString() === userId
    );
    if (!already) {
      session.participants.push(userId);
      await session.save();
      session = await Session.findById(sessionId)
        .populate("hostId", "username profilePicture")
        .populate("participants", "username profilePicture");
    }

    res.render("waitlobby", {
      session,
      user: req.session.user,
      isHost: session.hostId._id.toString() === userId,
    });
  } catch (err) {
    console.error("Error in session route:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Route to handle the "Start" button click
router.post(
  "/session/:sessionId/start",
  ensureAuthenticated,
  ensureHost,
  async (req, res) => {
    const roomId = req.params.sessionId;
    //( flip session.status in DB)
    getIO().to(roomId).emit("session started", { roomId });
    // host redirect or just 200 OK:
    return res.sendStatus(200);
  }
);

router.get(
  "/hoststartedsession",
  ensureAuthenticated,

  async (req, res) => {
    try {
      const session = await Session.findById(req.query.sessionId)
        .populate("hostId", "username profilePicture")
        .populate("participants", "username profilePicture");

      if (!session) {
        return res.status(404).send("Session not found");
      }

      // Render the session details on the page
      res.render("hoststartedsession", {
        session,
        user: req.user,
        isHost: session.hostId._id.equals(req.user._id),
      });
    } catch (err) {
      console.error("Error loading host-started session:", err);
      res.status(500).send("Error loading session");
    }
  }
);

// 4️⃣ Optional terminate / restart routes
router.delete(
  "/terminate-session/:sessionId",
  ensureAuthenticated,
  ensureHost,
  async (req, res) => {
    // your terminate logic here…
    res.json({ message: "Session terminated" });
  }
);

router.get(
  "/restart-session/:sessionId",
  ensureAuthenticated,
  ensureHost,
  async (req, res) => {
    // your restart logic here…
    res.redirect("/createsession");
  }
);

export default router;
