import express from "express";

import {
  getmanageusers,
  deleteUser,
  blockUser,
  unblockUser,
  getadminsettings,
  deleteSession,
} from "../controllers/Admincontroller.js";
import { ensureAdmin } from "../middlewares/Authentication.js"; // Import the admin check middleware

const router = express.Router();

// Apply ensureAdmin middleware to restrict access to admins only
router.get("/manageusers", ensureAdmin, getmanageusers); // Admins only
router.post("/deleteuser/:id", ensureAdmin, deleteUser); // Admins only
router.post("/blockuser/:id", ensureAdmin, blockUser); // Admins only
router.post("/unblockuser/:id", ensureAdmin, unblockUser); // Admins only

router.get("/adminsetting", ensureAdmin, getadminsettings); // Admins only

router.post("/deletesession/:id", ensureAdmin, deleteSession); // Admins only

// In your router file (e.g., routes.js or app.js)
router.get("/nonauthorized", (req, res) => {
  res.render("nonauthorized");
});

export default router;
