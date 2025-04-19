import Session from "../models/session.js";

// Renders the create session form
export function getCreateSessionPage(req, res) {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  res.render("createsession");
}

export async function postCreateSession(req, res) {
  try {
    // Ensure the user is authenticated
    if (!req.session.user) {
      return res.status(401).send("User not authenticated");
    }

    const { sessionName, theme, timer } = req.body;

    // Debugging: Log user ID to ensure it's correct
    console.log("Authenticated User ID:", req.session.user._id);

    // Parse timer and default to 90 if invalid
    const parsedTimer = parseInt(timer, 10);
    const finalTimer = isNaN(parsedTimer) ? 90 : parsedTimer;

    // Create a new session
    const newSession = new Session({
      sessionName,
      theme,
      timer: finalTimer, // Use finalTimer
      hostId: req.session.user._id, // Set the host as the logged-in user
      participants: [req.session.user._id], // Host is automatically a participant
    });

    // Log the session before saving to ensure it's correct
    console.log("New session before saving:", newSession);

    // Save the new session
    const savedSession = await newSession.save();

    // Populate the session with host and participant data
    const populatedSession = await Session.findById(savedSession._id)
      .populate("hostId", "username profilePicture")
      .populate("participants", "username profilePicture");

    // Log the populated session for debugging
    console.log("Populated session:", populatedSession);

    // Render the session page with populated data
    res.render("waitlobby", {
      session: populatedSession,
      user: req.session.user,
      isHost: true, // Ensure the user is the host
    });
  } catch (error) {
    console.error("Error creating session:", error);
    res.render("createsession", {
      error: "Failed to create session. Please try again.",
    });
  }
}

export async function getFirstRoundHostPage(req, res) {
  try {
    const sessionId = req.query.sessionId;

    // Ensure session ID is provided
    if (!sessionId) {
      return res.status(400).send("Session ID is required");
    }

    // Fetch session by ID and populate with host and participants
    const session = await Session.findById(sessionId)
      .populate("hostId", "username profilePicture") // Populate host details
      .populate("participants", "username profilePicture"); // Populate participant details

    // Check if session exists
    if (!session) {
      return res.status(404).send("Session not found");
    }

    // Log the session data to ensure it's correct
    console.log("Session found:", session);

    // Render the session page for the host
    res.render("waitlobby", {
      session,
      user: req.session.user || {
        username: "Unknown User",
        profilePicture: "/images/default-avatar.png",
      },
      isHost: req.session.user && req.session.user._id.equals(session.hostId), // Ensure user is the host
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

/*
// Render the join session page
export function getjoinsessionpage(req, res) {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  res.render("joinsession");
}*/

export async function getjoinsessionpage(req, res) {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  res.render("joinsession");
}

export async function postjoinsession(req, res) {
  const { accessCode } = req.body;

  try {
    // Log access code and user ID for debugging
    console.log("Access Code:", accessCode);
    console.log("User ID:", req.user._id);

    // Find session by access code
    const session = await Session.findOne({ accessCode })
      .populate("hostId", "username profilePicture")
      .populate("participants", "username profilePicture");

    // Check if session exists
    if (!session) {
      return res.render("joinsession", {
        error: "Invalid access code. Please try again.",
      });
    }

    // Log the session data to check its contents
    console.log("Session found:", session);

    // Save the session ID to the session data so we can refer to it later
    req.session.currentSessionId = session._id;

    // Check if user is the host (they're already in participants)
    if (session.hostId.equals(req.user._id)) {
      return res.render("waitlobby", {
        session,
        user: req.user, // Ensure the correct user object is passed
        isHost: true,
      });
    }

    // Check if already joined (but not the host)
    const alreadyJoined = session.participants.some((participantId) =>
      participantId.equals(req.user._id)
    );

    // Log to check if the user has already joined
    console.log("Already Joined:", alreadyJoined);

    if (!alreadyJoined) {
      // Add the new participant
      session.participants.push(req.user._id);
      await session.save();

      // Reload the session with updated participants
      const updatedSession = await Session.findById(session._id)
        .populate("hostId", "username profilePicture")
        .populate("participants", "username profilePicture");

      // Log updated session data for debugging
      console.log("Updated Session:", updatedSession);

      // Render the session page with updated data
      res.render("waitlobby", {
        session: updatedSession,
        user: req.user, // Ensure the correct user object is passed
        isHost: false,
      });
    } else {
      // If already joined, just render the session
      res.render("waitlobby", {
        session,
        user: req.session.user,
        isHost: req.session.user && session.hostId.equals(req.session.user._id),
      });
    }
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

export const getHostStartedSession = (req, res) => {
  const session = req.session; // Assuming session data is stored here
  const user = req.user || {
    username: "Unknown User",
    profilePicture: "/images/default-avatar.png",
  }; // Safe fallback

  res.render("waitlobby", { session, user });
};
