import express from "express";
import passport from "passport";

const router = express.Router();

import {
  getLoginPage,
  getSignupPage,
  getLoggedinPage,
  getForgotpasswordPage,
  handleSignup,
  handleForgotPassword,
  getverifycodePage,
  handleVerifyCode,
  getResetPasswordPage,
  handleResetPassword,
} from "../controllers/Authenticationcontroller.js";

// GET routes
router.get("/login", getLoginPage);
router.get("/signup", getSignupPage);
router.get("/loggedin", ensureAuthenticated, getLoggedinPage);

router.get("/Forgotpassword", getForgotpasswordPage);
router.get("/Verifycode", getverifycodePage);
router.get("/resetpassword", getResetPasswordPage);

// POST route for login
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect("/login");

    req.logIn(user, (err) => {
      if (err) return next(err);

      // Redirect all users to the same dashboard page
      return res.redirect("/loggedin");
    });
  })(req, res, next);
});

router.post("/signup", handleSignup);

router.post("/forgotpassword", handleForgotPassword);
router.post("/verifycode", handleVerifyCode);
router.post("/resetpassword", handleResetPassword);

// Middleware to protect routes

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).send("Access denied. Admins only.");
}

export default router;
