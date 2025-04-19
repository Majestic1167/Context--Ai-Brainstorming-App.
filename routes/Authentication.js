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

router.get("/login", (req, res, next) => {
  // Clear any existing session when accessing login page
  if (req.isAuthenticated()) {
    req.logout((err) => {
      if (err) {
        console.error("Error logging out:", err);
        return next(err);
      }
      // After logout, render the login page
      res.render("login", { user: null, error: null });
    });
  } else {
    res.render("login", { user: null, error: null });
  }
});

router.get("/signup", redirectIfAuthenticated, getSignupPage);
router.get("/loggedin", ensureAuthenticated, getLoggedinPage);

router.get("/Forgotpassword", getForgotpasswordPage);
router.get("/Verifycode", getverifycodePage);
router.get("/resetpassword", getResetPasswordPage);

/*// Add this route for logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.clearCookie('sessionId');  // Clear the session cookie
    res.redirect('/login');
  });
});*/

//  login route

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err || !user) {
      return res.redirect("/login");
    }

    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }

      req.session.user = {
        _id: user._id,
        username: user.username,
        profilePicture: user.profilePicture,
      };

      console.log("User logged in:", req.session.user);

      return res.redirect("/loggedin"); // or wherever you go after login
    });
  })(req, res, next);
});

router.post("/signup", handleSignup);

router.post("/forgotpassword", handleForgotPassword);
router.post("/verifycode", handleVerifyCode);
router.post("/resetpassword", handleResetPassword);

export default router;
