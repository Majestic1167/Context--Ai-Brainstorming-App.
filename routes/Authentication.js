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

import {
  ensureAuthenticated,
  redirectIfAuthenticated,
} from "../middlewares/Authentication.js";

// GET routes
router.get("/login", redirectIfAuthenticated, getLoginPage);
router.get("/signup", redirectIfAuthenticated, getSignupPage);
router.get("/loggedin", ensureAuthenticated, getLoggedinPage);

router.get("/Forgotpassword", getForgotpasswordPage);
router.get("/Verifycode", getverifycodePage);
router.get("/resetpassword", getResetPasswordPage);

// POST route for login
// POST route for login
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    // If no user is found, render the login page with an error message
    if (!user) {
      return res.render("login", {
        user: null, // user is null if authentication fails
        error: "Invalid username or password", // display error message
      });
    }

    // If the user is found, log them in
    req.logIn(user, (err) => {
      if (err) return next(err);

      // Redirect the user to their logged-in page
      return res.redirect("/loggedin");
    });
  })(req, res, next);
});

router.post("/signup", handleSignup);

router.post("/forgotpassword", handleForgotPassword);
router.post("/verifycode", handleVerifyCode);
router.post("/resetpassword", handleResetPassword);

export default router;
