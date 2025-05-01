import mongoose from "mongoose";

const ideaSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
});
