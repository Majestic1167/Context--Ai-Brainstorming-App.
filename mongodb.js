// mongodb.js
import mongoose from "mongoose";
import methodOverride from "method-override";
import http from "http";
import { Server } from "socket.io";

// Optional: setup for use if needed elsewhere
// const server = http.createServer(app); // If you're setting up Socket.IO
// const io = new Server(server);

mongoose
  .connect(
    "mongodb+srv://Admin:A1234567@cluster777.ybdgv.mongodb.net/loginSystem?retryWrites=true&w=majority&appName=Cluster777",
    { useUnifiedTopology: true, useNewUrlParser: true }
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Connection error:", err);
  });

const LogInSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, // Full name is required
  },

  username: {
    type: String,
    required: true, // Username is required
    unique: true, // Optionally enforce unique usernames
  },

  email: {
    type: String,
    required: true, // Email is required
    unique: true, // Optionally enforce unique emails
  },

  phone: {
    type: String,
    required: false, // Phone number is optional (set to true if required)
    unique: true, // Optionally enforce unique phone numbers
    match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"], // Optional: validate phone number format (e.g., 10 digits)
  },

  password: {
    type: String,
    required: true, // Password is required
  },
});

// Model
const collection = mongoose.model("collection", LogInSchema);

export default collection;
