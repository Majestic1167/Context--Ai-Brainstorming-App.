import express from "express";
import {
  getLoginPage,
  getSignupPage,
  handleLogin,
  handleSignup,
  handleLogout,
  getLoggedinPage,
  getAdminPage,
} from "../controllers/Authenticationcontroller.js";
import { isAuthenticated, isNotAuthenticated } from "../middleware/auth.js";
import { checkRole } from "../middleware/authorization.js";

const router = express.Router();

// Public routes
router.get("/login", isNotAuthenticated, getLoginPage);
router.get("/signup", isNotAuthenticated, getSignupPage);
router.post("/login", isNotAuthenticated, handleLogin);
router.post("/signup", isNotAuthenticated, handleSignup);

// Protected routes
router.get("/loggedin", isAuthenticated, getLoggedinPage);
router.get("/admin", isAuthenticated, checkRole(["admin"]), getAdminPage);
router.get("/logout", handleLogout);

export default router;
