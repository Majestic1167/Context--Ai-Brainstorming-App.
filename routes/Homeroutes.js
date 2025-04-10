import express from "express";

import { getHomepage, getaboutpage } from "../controllers/Homecontroller.js";

const router = express.Router();

router.get("/", getHomepage);

router.get("/about", getaboutpage);

export default router;
