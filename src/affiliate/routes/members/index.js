const express = require("express");
const router = express.Router();

// controllers
const GetMembers = require("../../controllers/Members/GetMembers");
const GetAffInfo = require("../../controllers/Members/GetAffInfo");

// middlewares
const AuthHandler = require("../../middlewares/AuthHandler");

// for development purposes
router.post("/", AuthHandler, GetMembers);
router.post("/getAffInfo", AuthHandler, GetAffInfo);

module.exports = router;
