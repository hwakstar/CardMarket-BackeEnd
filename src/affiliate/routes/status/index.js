const express = require("express");
const router = express.Router();

// controllers
const AddClicks = require("../../controllers/Status/AddClicks");
const GetStatistics = require("../../controllers/Status/GetStatistics");
const GetClients = require("../../controllers/Status/GetClients");

// middlewares
const AuthHandler = require("../../middlewares/AuthHandler");

// add click event for affiliate, when user click invited url link
router.post("/addClicks", AddClicks);

// get statistic of affiliate
router.post("/statistics", AuthHandler, GetStatistics);

// get clients of affiliate by period
router.post("/clients", AuthHandler, GetClients);

module.exports = router;
