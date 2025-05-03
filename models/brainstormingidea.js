import mongoose from "mongoose";

const ideaSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  wordCount: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now },
});

// run before validation so wordCount is populated in time
ideaSchema.pre("validate", function (next) {
  this.wordCount = this.content.trim().split(/\s+/).length;
  next();
});

export default mongoose.model("Idea", ideaSchema);
