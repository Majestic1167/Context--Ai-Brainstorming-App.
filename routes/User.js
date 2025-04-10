import express from "express";
const router = express.Router();

import {
  getstatisticspage,
  getmyprojectpage,
  geteditprofilepage,
} from "../controllers/Usercontroller.js";

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

export default router;
