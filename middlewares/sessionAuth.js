// This middleware ensures the logged-in user is the host of the session
import Session from "../models/session.js";

// This middleware ensures the user is logged in
export function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

export async function ensureHost(req, res, next) {
  try {
    const sessionId = req.query.sessionId; // Always use query string

    if (!req.user || !req.user._id) {
      return res.status(401).send("User not authenticated");
    }

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).send("Session not found");
    }

    if (!session.hostId.equals(req.user._id)) {
      return res
        .status(403)
        .send("Access denied. Only the host can perform this action.");
    }

    // Attach the session to req for future use
    req.sessionData = session;

    next();
  } catch (error) {
    console.error("Host check failed:", error);
    res.status(500).send("Server error");
  }
}
