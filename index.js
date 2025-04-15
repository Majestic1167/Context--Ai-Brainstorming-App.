import connectDB from "./config/mongodb.js";
import "./config/passport.js"; // Import the Passport configuration

import express from "express";
import flash from "connect-flash";

import passport from "passport";

import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
dotenv.config();

import http from "http"; // For creating an HTTP server
import { initSocket } from "./config/socketio.js"; // Import socket setup

import { injectUser } from "./middlewares/user.js";

// Initialize the express app
const app = express();

// Ensure to define the paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure session middleware (should be before passport)
app.use(
  session({
    secret: process.env.PASSPORTSECRETKEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 24, // 30 days
    },
    rolling: true,
    name: "sessionID",
  })
);

app.use(express.urlencoded({ extended: true }));

// Configure flash middleware
app.use(flash());

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Set the view engine to EJS
app.set("view engine", "ejs");

// Serve static files (like CSS, JS, and images)
app.use(express.static(__dirname + "/public"));

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Parse JSON bodies (for API requests)
app.use(express.json());

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes for handling the app logic
import homeroutes from "./routes/Homeroutes.js";
app.use("/", homeroutes); // Home routes

import authentication from "./routes/Authentication.js";
app.use("/", authentication); // Authentication routes

import SessionRoute from "./routes/SessionRoute.js";
app.use("/", SessionRoute); // Session management routes

import user from "./routes/User.js";
app.use("/", user); // User management routes

// Make flash messages available to views
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

const server = http.createServer(app);
// Initialize Socket.IO
initSocket(server);

// Start the server
server.listen(process.env.PORT, (err) => {
  if (err) console.error(err);
  else console.log(`Server start at ${process.env.PORT}`);
});

app.use(injectUser);

// Add this middleware here
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

connectDB();

app.delete("/terminate-session/:sessionId", (req, res) => {
  // Handle session termination logic
  const sessionId = req.params.sessionId;
  // Terminate the session, maybe delete from the database or handle session cleanup
  res.json({ message: "Session terminated successfully" });
});

app.get("/restart-session", (req, res) => {
  // Handle session restart logic (e.g., reset session state)
  res.redirect("/create"); // Redirect to session creation page
});
