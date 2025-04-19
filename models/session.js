import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  sessionName: { type: String, required: true },
  theme: { type: String, required: true },
  timer: { type: Number, default: 90 },
  accessCode: { type: String, required: true, unique: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  currentRound: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ["waiting", "in-progress", "completed"],
    default: "waiting",
  },
  createdAt: { type: Date, default: Date.now },
});

// Generate unique access code if not provided
sessionSchema.pre("validate", async function (next) {
  if (!this.accessCode) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure uniqueness of the access code
    const existingSession = await mongoose
      .model("Session")
      .findOne({ accessCode: code });
    if (existingSession) {
      return next(new Error("Access code already exists. Try again."));
    }
    this.accessCode = code;
    console.log("Generated unique access code:", this.accessCode);
  }
  next();
});

const Session = mongoose.model("Session", sessionSchema);
export default Session;
