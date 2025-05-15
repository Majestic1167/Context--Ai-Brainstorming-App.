import express from "express";
const router = express.Router();

import upload from "../middlewares/multer.js";
import { handleEditProfile } from "../controllers/Usercontroller.js";

import {
  getstatisticspage,
  getmyprojectpage,
  geteditprofilepage,
} from "../controllers/Usercontroller.js";

import { ensureAuthenticated } from "../middlewares/Authentication.js";

router.get("/statistics", getstatisticspage);
router.get("/myproject", getmyprojectpage);
router.get("/editprofile", geteditprofilepage);

router.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    req.session.destroy(function (err) {
      if (err) return next(err);
      res.clearCookie("connect.sid");
      res.redirect("/login");
    });
  });
});

router.post(
  "/editprofile",
  ensureAuthenticated,
  upload.single("profilePicture"),
  handleEditProfile
);
export default router;
