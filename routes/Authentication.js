import express from "express";
const router = express.Router();

import {
  getLoginPage,
  getSignupPage,
  getLoggedinPage,
  handleLogin,
  handleSignup,
} from "../controllers/Authenticationcontroller.js"; // make sure file name is correct

// GET routes
router.get("/Login", getLoginPage);
router.get("/Signup", getSignupPage);
router.get("/Loggedin", getLoggedinPage);

// POST routes
router.post("/login", handleLogin);
router.post("/signup", handleSignup);

export default router;
