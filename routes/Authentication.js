import express from "express";
const router = express.Router();

import {
  getLoginPage,
  getSignupPage,
  getLoggedinPage,
  getForgotpasswordPage,
  handleLogin,
  handleSignup,
  handleForgotPassword, // Added forgot password handler
  getverifycodePage,
  handleVerifyCode, // Verify code handler
  getResetPasswordPage, // Add this
  handleResetPassword, // Add this
} from "../controllers/Authenticationcontroller.js"; // make sure file name is correct

// GET routes
router.get("/Login", getLoginPage);
router.get("/Signup", getSignupPage);
router.get("/Loggedin", getLoggedinPage);
router.get("/Forgotpassword", getForgotpasswordPage);
router.get("/Verifycode", getverifycodePage);
router.get("/resetpassword", getResetPasswordPage); // Add this
router.post("/resetpassword", handleResetPassword); // Add this

// POST routes
router.post("/login", handleLogin);
router.post("/signup", handleSignup);

router.post("/forgotpassword", handleForgotPassword); // Added forgot password POST route
router.post("/verifycode", handleVerifyCode); // Handle verification code submission

export default router;
