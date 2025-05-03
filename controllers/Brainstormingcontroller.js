// controllers/ideaController.js
import Idea from "../models/brainstormingidea.js";

export async function saveUserIdea(req, res) {
  const { sessionId, userId, content } = req.body;
  try {
    const newIdea = new Idea({ sessionId, userId, content });
    await newIdea.save();
    res.status(201).json({ message: "Idea saved", idea: newIdea });
  } catch (err) {
    console.error("Error saving idea:", err);
    res.status(500).json({ error: "Could not save idea" });
  }
}
