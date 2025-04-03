import express from "express";
const router = express.Router();

import { getstatisticspage, getmyprojectpage, geteditprofilepage} 
from "../controllers/Usercontroller.js";

router.get("/statistics", getstatisticspage); 
router.get("/myproject", getmyprojectpage); 
router.get("/editprofile", geteditprofilepage); 


export default router; 