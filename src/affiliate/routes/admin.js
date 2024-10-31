const express = require("express");
const router = express.Router();

// controllers
const AddRank = require("../controllers/Admin/AddRank");
const GetRanks = require("../controllers/Admin/GetRanks");
const DeleteRank = require("../controllers/Admin/DeleteRank");
const GetPayments = require("../controllers/Admin/GetPayments");
const ChangePayStatus = require("../controllers/Admin/ChangePayStatus");

// middlewares
const AuthHandler = require("../middlewares/AuthHandler");

const uploadAffRank = require("../../utils/multer/affRank_multer");

// get statistic of affiliate
router.post("/addRank", AuthHandler, uploadAffRank.single("file"), AddRank);
router.get("/getRanks", AuthHandler, GetRanks);
router.post("/deleteRank", AuthHandler, DeleteRank);
router.get("/getPayments", AuthHandler, GetPayments);
router.post("/changePayStatus", AuthHandler, ChangePayStatus);

module.exports = router;
