
import express from "express";
const router = express.Router();

import { getcreatesessionpage, getjoinsessionpage, getcreatepage, getFirstRoundHostPage, getnextroundPage} 
from "../controllers/sessioncontroller.js";

router.get("/createsession", getcreatesessionpage); // Route for login page

router.get("/create", getcreatepage);

router.get("/joinsession", getjoinsessionpage); // Route for login page

router.get("/getfirstround", getFirstRoundHostPage);

router.get("/nextround", getnextroundPage);


export default router; 