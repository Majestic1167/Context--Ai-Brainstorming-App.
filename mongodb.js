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
    "mongodb+srv://Admin:A1234567@cluster777.ybdgv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster777",
    { useUnifiedTopology: true, useNewUrlParser: true }
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Connection error:", err);
  });

// Schema
const LogInSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  password: {
    type: String,
    required: true,
  },
});

// Model
const collection = mongoose.model("collection", LogInSchema);

// Export
export default collection;
