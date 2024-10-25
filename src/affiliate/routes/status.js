const express = require("express");
const router = express.Router();

// controllers
const AddClicks = require("../controllers/Status/AddClicks");
const GetStatistics = require("../controllers/Status/GetStatistics");
const GetDepositeStatus = require("../controllers/Status/GetDepositeStatus");
const GetLinkStatus = require("../controllers/Status/GetLinkStatus");

// middlewares
const AuthHandler = require("../middlewares/AuthHandler");

// add click event for affiliate, when user click invited url link
router.post("/addClicks", AddClicks);

// get statistic of affiliate
router.post("/statistics", AuthHandler, GetStatistics);

// get status of introduced user by affiliate
router.post("/deposit", AuthHandler, GetDepositeStatus);
router.post("/link", AuthHandler, GetLinkStatus);

module.exports = router;
