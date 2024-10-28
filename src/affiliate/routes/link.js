const express = require("express");
const router = express.Router();

// controllers
const AddLink = require("../controllers/Link/AddLink");
const GetLinks = require("../controllers/Link/GetLinks");
const DeleteLink = require("../controllers/Link/DeleteLink");

// middlewares
const AuthHandler = require("../middlewares/AuthHandler");

// get statistic of affiliate
router.post("/addRank", AuthHandler, AddLink);
router.get("/getRanks", AuthHandler, GetLinks);
router.post("/deleteRank", AuthHandler, DeleteLink);

// get statistic of affiliate
router.post("/addLink", AuthHandler, AddLink);
router.post("/getLinks", AuthHandler, GetLinks);
router.post("/deleteLink", AuthHandler, DeleteLink);

module.exports = router;
