import express from "express";

const router = express.Router();

import { getLoginPage, getSignupPage, getLoggedinPage } from "../controllers/Authenticationcontroller.js";

router.get("/Login", getLoginPage); // Route for login page

router.get("/Signup", getSignupPage); // Route for signup page

router.get("/Loggedin", getLoggedinPage); // Route for login page

export default router; 