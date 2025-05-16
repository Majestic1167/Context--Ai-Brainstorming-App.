import express from "express";
import upload from "../middlewares/multer.js"; // Import the Multer middleware

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
  handleLogin,
} from "../controllers/Authenticationcontroller.js";

import {
  ensureAuthenticated,
  redirectIfAuthenticated,
} from "../middlewares/Authentication.js";

router.get("/login", (req, res, next) => {
  if (req.isAuthenticated()) {
    req.logout((err) => {
      if (err) {
        console.error("Error logging out:", err);
        return next(err);
      }

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

router.post("/login", handleLogin);

router.post("/signup", upload.single("profilePicture"), handleSignup);

router.post("/forgotpassword", handleForgotPassword);
router.post("/verifycode", handleVerifyCode);
router.post("/resetpassword", handleResetPassword);

export default router;
