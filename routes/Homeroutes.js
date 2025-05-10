import express from "express";

import {
  getHomepage,
  getaboutpage,
  getcommunitypage,
} from "../controllers/Homecontroller.js";

const router = express.Router();

router.get("/", getHomepage);

router.get("/about", getaboutpage);

router.get("/community", getcommunitypage);

export default router;
