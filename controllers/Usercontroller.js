import User from "../models/User.js"; // adjust path as needed

import fs from "fs"; // For file management (deleting old profile pictures)

import Session from "../models/session.js";

export async function getstatisticspage(req, res) {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    //  Fetch top 10 contributors based on totalWords, sessionsJoined, topContributorCount
    const leaderboard = await User.find({})
      .select("username totalWords sessionsJoined noOfTopContributions")
      .sort({
        totalWords: -1,
        noOfTopContributions: -1,
        sessionsJoined: -1,
      })
      .limit(10)
      .lean();

    res.render("statistics", {
      totalWords: user.totalWords || 0,
      sessionsJoined: user.sessionsJoined || 0,
      noOfTopContributions: user.noOfTopContributions || 0,
      leaderboard,
    });
  } catch (err) {
    console.error("Error loading statistics:", err);
    res.status(500).send("Server error");
  }
}

export async function getmyprojectpage(req, res) {
  try {
    // Ensure the user is logged in and has a valid session
    const userId = req.session.user ? req.session.user._id : null;

    if (!userId) {
      return res.status(400).send("User is not logged in.");
    }

    // Fetch sessions where the user is a participant
    const sessions = await Session.find({
      participants: userId, // Only sessions where the user is a participant
    })
      .sort({ createdAt: -1 }) // Sort by creation date, most recent first
      .limit(6); // Limit to the most recent 6 sessions

    if (!sessions || sessions.length === 0) {
      return res.status(404).send("No sessions found for this user.");
    }

    // Render the projects page and pass the sessions data
    res.render("myprojects", { sessions });
  } catch (err) {
    console.error("Error fetching sessions:", err);
    res.status(500).send("Error fetching projects.");
  }
}

export function geteditprofilepage(req, res) {
  res.render("editprofile", { user: req.session.user }); // assumes session stores user
}

export async function handleEditProfile(req, res) {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).send("User not found");

    if (req.body.username) {
      user.username = req.body.username;
    }

    if (req.file) {
      if (user.profilePicture) {
        const oldPath = `public/images/profilepictures/${user.profilePicture}`;
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      user.profilePicture = req.file.filename;
    }

    await user.save();

    // Update session
    req.session.user.username = user.username;
    req.session.user.profilePicture = user.profilePicture;

    // ✅ Force session to save before redirect
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).send("Failed to update session");
      }
      res.redirect("/loggedin");
    });
  } catch (err) {
    console.error("Edit profile error:", err);
    res.status(500).send("Error updating profile");
  }
}
