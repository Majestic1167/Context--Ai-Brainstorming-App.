import Session from "../models/session.js";

/*
 * getCreateSessionPage(req, res)
 * Params:
 * - req: request object
 * - res: response object
 *
 * What it does:
 * Checks if the user is authenticated. If not, redirects to login page.
 * If authenticated, renders the page where the user can create a new session.
 */
export function getCreateSessionPage(req, res) {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  res.render("createsession");
}

/*
 * postCreateSession(req, res)
 * Params:
 * - req: request object containing session details in req.body
 * - res: response object
 *
 * What it does:
 * Takes the session data sent by the user, creates a new session with the host as the current user.
 * Saves the session to the database, then renders a waiting lobby page with session info.
 * If user is not authenticated or an error occurs, sends an error response or renders create session page with error.
 */
export async function postCreateSession(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).send("User not authenticated");
    }

    const { sessionName, theme, timer } = req.body;

    const parsedTimer = parseInt(timer, 10);

    const selectedTimer = parsedTimer;

    // Create a new session
    const newSession = new Session({
      sessionName,
      theme,
      timer: selectedTimer, // Use the exact time entered by the host
      hostId: req.session.user._id,
      participants: [req.session.user._id],
    });

    // Save the session
    const savedSession = await newSession.save();

    // Populate host and participants for rendering
    const populatedSession = await Session.findById(savedSession._id)
      .populate("hostId", "username profilePicture")
      .populate("participants", "username profilePicture");

    // Render the waiting lobby with session info
    res.render("waitlobby", {
      session: populatedSession,
      user: req.session.user,
      isHost: true,
    });
  } catch (error) {
    console.error("Error creating session:", error);
    res.render("createsession", {
      error: "Failed to create session. Please try again.",
    });
  }
}

/*
 * getFirstRoundHostPage(req, res)
 * Params:
 * - req: request object containing sessionId as a query parameter
 * - res: response object
 *
 * purpose:
 * Fetches the session by the given sessionId, including host and participants info.
 * If session exists, renders the waiting lobby page for the host.
 * Otherwise, sends an error status or message.
 */

export async function getFirstRoundHostPage(req, res) {
  try {
    const sessionId = req.query.sessionId;

    // Ensure session ID is provided
    if (!sessionId) {
      return res.status(400).send("Session ID is required");
    }

    // Fetch session by ID and populate with host and participants
    const session = await Session.findById(sessionId)
      .populate("hostId", "username profilePicture")
      .populate("participants", "username profilePicture");

    // Check if session exists
    if (!session) {
      return res.status(404).send("Session not found");
    }

    // Render the session page for the host
    res.render("waitlobby", {
      session,

      participants: session.participants,

      user: req.session.user || {
        username: "Unknown User",
        profilePicture: "/images/profilepictures/default.jpg",
      },
      isHost: req.session.user && req.session.user._id.equals(session.hostId), // Ensure user is the host
    });
  } catch (error) {
    console.error("Error getting first round:", error);
    res.status(500).send("Error loading session");
  }
}

/*note that currently its not used anymore since i am using single round for all sessions
 * getNextRoundPage(req, res)
 * Params:
 * - req: request object containing sessionId as a query parameter
 * - res: response object
 *
 * What it does:
 * Finds the session by sessionId, increments the current round number by 1, saves it.
 * Then renders the next round page for the host.
 */
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
 * getjoinsessionpage(req, res)
 * Params:
 * - req: request object
 * - res: response object
 *
 * What it does:
 * Checks if user is authenticated.
 * If yes, renders the join session page where user can enter access code.
 * Otherwise, redirects to login page.
 */
export async function getjoinsessionpage(req, res) {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  res.render("joinsession");
}

/*
 * postjoinsession(req, res)
 * Params:
 * - req: request object containing accessCode in req.body
 * - res: response object
 *
 * What it does:
 * Finds a session by the access code entered by the user.
 * If session exists, checks if user is already a participant or the host.
 * If not already joined, adds the user to participants and saves.
 * Renders the waiting lobby with updated session info.
 * If session not found or error occurs, renders join session page with error message.
 */
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

    if (!session) {
      return res.render("joinsession", {
        error: "Invalid access code. Please try again.",
      });
    }

    console.log("Session found:", session);

    // Save the session ID to the session data so we can refer to it later
    req.session.currentSessionId = session._id;

    // Check if user is the host (they're already in participants)
    if (session.hostId.equals(req.user._id)) {
      return res.render("waitlobby", {
        session,
        user: req.user,
        isHost: true,
      });
    }

    // Check if already joined (but not the host)
    const alreadyJoined = session.participants.some((participantId) =>
      participantId.equals(req.user._id)
    );

    // for debug to see if user joined or not
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

      res.render("waitlobby", {
        session: updatedSession,
        user: req.user,
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

/*
 * terminateSession(req, res)
 * Params:
 * - req: request object containing sessionId in req.params
 * - res: response object
 *
 * What it does:
 * Finds the session by ID.
 * Checks if the current user is the host.
 * If yes, deletes the session.
 * Otherwise, returns an authorization error.
 */
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

/*
 * getSessionPage(req, res)
 * Params:
 * - req: request object containing sessionId in req.params
 * - res: response object
 *
 * What it does:
 * Finds the session by ID and populates host and participants.
 * Checks if current user is already a participant.
 * If not, adds them to participants and saves session.
 * Renders the waiting lobby with session info and whether user is host.
 */
export async function getSessionPage(req, res) {
  try {
    const sessionId = req.params.sessionId;
    const userId = req.session.user._id;

    let session = await Session.findById(sessionId)
      .populate("hostId", "username profilePicture")
      .populate("participants", "username profilePicture");
    if (!session) return res.status(404).send("Session not found");

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
    console.error("Error in session controller:", err);
    res.status(500).send("Internal Server Error");
  }
}

/*
 * getHostStartedSession(req, res)
 * Params:
 * - req: request object containing sessionId in req.query
 * - res: response object
 *
 * What it does:
 * Finds the session by ID and populates host and participants.
 * Renders the page for the host who started the session.
 * Returns 404 if session not found or 500 if any error occurs.
 */
export async function getHostStartedSession(req, res) {
  try {
    const session = await Session.findById(req.query.sessionId)
      .populate("hostId", "username profilePicture")
      .populate("participants", "username profilePicture");

    if (!session) {
      return res.status(404).send("Session not found");
    }

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
