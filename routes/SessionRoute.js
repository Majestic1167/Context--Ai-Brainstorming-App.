import express from "express";
const router = express.Router();

import {
  getCreateSessionPage,
  postCreateSession,
  getjoinsessionpage,
  postjoinsession,
  getFirstRoundHostPage,
  getNextRoundPage,
  terminateSession,
} from "../controllers/sessioncontroller.js";

router.get("/createsession", getCreateSessionPage);

router.post("/create", postCreateSession);

router.get("/joinsession", getjoinsessionpage);

router.post("/joinsession", postjoinsession);

router.get("/getfirstround", getFirstRoundHostPage);

router.get("/nextround", getNextRoundPage);

router.delete("/terminate-session/:sessionId", terminateSession);

export default router;
