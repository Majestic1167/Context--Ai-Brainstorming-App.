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

import { ensureAuthenticated, ensureHost } from "../middlewares/sessionAuth.js";

router.get("/createsession", ensureAuthenticated, getCreateSessionPage);

router.post("/create", ensureAuthenticated, postCreateSession);

router.get("/joinsession", ensureAuthenticated, getjoinsessionpage);

router.post("/joinsession", ensureAuthenticated, postjoinsession);

router.get("/getfirstround", ensureAuthenticated, getFirstRoundHostPage);

router.get("/nextround", ensureAuthenticated, getNextRoundPage);

router.delete(
  "/terminate-session/:sessionId",
  ensureAuthenticated,
  ensureHost,
  terminateSession
);

export default router;
