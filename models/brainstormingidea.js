import mongoose from "mongoose";

const wordEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  content: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
});

const ideaSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
    required: true,
  },
  words: [wordEntrySchema], // array of words + user info
});

export default mongoose.model("Idea", ideaSchema);
