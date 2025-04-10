import Session from "../models/session.js";

// Renders the create session form
export function getCreateSessionPage(req, res) {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  res.render("createsession");
}

// Handles the POST request to create a new session
export async function postCreateSession(req, res) {
  try {
    const { sessionName, theme, timer } = req.body;

    const newSession = new Session({
      sessionName,
      theme,
      timer: parseInt(timer) || 90,
      hostId: req.user._id,
      participants: [req.user._id],
    });

    await newSession.save();

    res.redirect(`/getfirstround?sessionId=${newSession._id}`);
  } catch (error) {
    console.error("Error creating session:", error);
    res.render("createsession", {
      error: "Failed to create session. Please try again.",
    });
  }
}

// Host's first round page
export async function getFirstRoundHostPage(req, res) {
  try {
    const sessionId = req.query.sessionId;
    const session = await Session.findById(sessionId)
      .populate("hostId", "username")
      .populate("participants", "username");

    if (!session) {
      return res.status(404).send("Session not found");
    }

    res.render("hostsession1", {
      session,
      isHost: req.user._id.equals(session.hostId),
    });
  } catch (error) {
    console.error("Error getting first round:", error);
    res.status(500).send("Error loading session");
  }
}

// Advance to next round
export async function getNextRoundPage(req, res) {
  try {
    const sessionId = req.query.sessionId;
    const session = await Session.findById(sessionId)
      .populate("hostId", "username")
      .populate("participants", "username");

    if (!session) {
      return res.status(404).send("Session not found");
    }

    session.currentRound += 1;
    await session.save();

    res.render("nextround", {
      session,
      isHost: req.user._id.equals(session.hostId),
    });
  } catch (error) {
    console.error("Error getting next round:", error);
    res.status(500).send("Error loading next round");
  }
}

// Render the join session page
export function getjoinsessionpage(req, res) {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  res.render("joinsession");
}

// Handle joining a session by access code
export async function postjoinsession(req, res) {
  const { accessCode } = req.body;

  try {
    const session = await Session.findOne({ accessCode })
      .populate("hostId", "username")
      .populate("participants", "username");

    if (!session) {
      return res.render("joinsession", {
        error: "Invalid access code. Please try again.",
      });
    }

    // Check if already joined
    const alreadyJoined = session.participants.some((p) =>
      p._id.equals(req.user._id)
    );

    if (!alreadyJoined) {
      session.participants.push(req.user._id);
      await session.save();
    }

    //Render joined session page
    res.render("joinedsession", {
      session,
      user: req.user,
    });
  } catch (error) {
    console.error("Error joining session:", error);
    res.render("joinsession", {
      error: "An error occurred. Please try again.",
    });
  }
}

export async function terminateSession(req, res) {
  try {
    const sessionId = req.params.sessionId;

    // Find the session by its ID
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    // Ensure that only the host can terminate the session
    if (!session.hostId.equals(req.user._id)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to terminate this session." });
    }

    // Use deleteOne instead of remove
    await Session.deleteOne({ _id: sessionId });

    return res
      .status(200)
      .json({ message: "Session terminated successfully." });
  } catch (error) {
    console.error("Error terminating session:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while terminating the session." });
  }
}
