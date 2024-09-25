const express = require("express");
const router = express.Router();

// controllers
const GetMembers = require("../../controllers/Members/GetMembers");

// middlewares
const AuthHandler = require("../../middlewares/AuthHandler");

// for development purposes
router.get("/", AuthHandler, GetMembers);

module.exports = router;
