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
    cookie: { secure: false },
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

// Start the server
app.listen(process.env.PORT, (err) => {
  if (err) console.error(err);
  else console.log(`Server start at ${process.env.PORT}`);
});

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

connectDB();
