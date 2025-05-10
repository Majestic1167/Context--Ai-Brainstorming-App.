import User from "../models/User.js";
import Session from "../models/session.js";

export async function getmanageusers(req, res) {
  try {
    const users = await User.find();
    res.render("manageusers", { users });
  } catch (err) {
    res.status(500).send("Server error");
  }
}

export async function deleteUser(req, res) {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect("/manageusers");
  } catch (err) {
    res.status(500).send("Error deleting user");
  }
}

export async function blockUser(req, res) {
  try {
    await User.findByIdAndUpdate(req.params.id, { isBlocked: true });
    res.redirect("/manageusers");
  } catch (err) {
    res.status(500).send("Error blocking user");
  }
}

export async function unblockUser(req, res) {
  try {
    await User.findByIdAndUpdate(req.params.id, { isBlocked: false });
    res.redirect("/manageusers");
  } catch (err) {
    res.status(500).send("Error unblocking user");
  }
}

// Fetch all sessions
export async function getadminsettings(req, res) {
  try {
    const sessions = await Session.find().populate("hostId participants");
    res.render("Adminsetting", { sessions });
  } catch (err) {
    res.status(500).send("Error fetching sessions");
  }
}

// Delete a session
export async function deleteSession(req, res) {
  try {
    const sessionId = req.params.id;
    await Session.findByIdAndDelete(sessionId);
    res.redirect("/Adminsetting"); // Redirect to session management page
  } catch (err) {
    res.status(500).send("Error deleting session");
  }
}
