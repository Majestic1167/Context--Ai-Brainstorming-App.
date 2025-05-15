import express from "express";
const router = express.Router();

import Session from "../models/session.js";

import {
  getCreateSessionPage,
  postCreateSession,
  getjoinsessionpage,
  postjoinsession,
  getFirstRoundHostPage,
  getNextRoundPage,
  getSessionPage,
  getHostStartedSession,
} from "../controllers/sessioncontroller.js";

import { ensureAuthenticated, ensureHost } from "../middlewares/sessionAuth.js";

router.get("/createsession", ensureAuthenticated, getCreateSessionPage);

router.post("/create", ensureAuthenticated, postCreateSession);

router.get("/joinsession", ensureAuthenticated, getjoinsessionpage);

router.post("/joinsession", ensureAuthenticated, postjoinsession);

router.get("/getfirstround", ensureAuthenticated, getFirstRoundHostPage);

router.get("/nextround", ensureAuthenticated, getNextRoundPage);

router.get("/session/:sessionId", ensureAuthenticated, getSessionPage);

//this is not in use beacause i removed the host started session page to waitlobby.ejs
router.get("/hoststartedsession", ensureAuthenticated, getHostStartedSession);

export default router;
