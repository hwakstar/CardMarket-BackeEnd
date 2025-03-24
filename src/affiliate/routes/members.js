const express = require("express");
const router = express.Router();

// controllers
const GetMembers = require("../controllers/Members/GetMembers");
const GetAffInfo = require("../controllers/Members/GetAffInfo");
const GetAffRank = require("../controllers/Members/GetAffRank");
const GetBankInfo = require("../controllers/Members/GetBankInfo");
const AddBankAcc = require("../controllers/Members/AddBankAcc");
const RequestWithdraw = require("../controllers/Members/RequestWithdraw");
const DeleteMember = require("../controllers/Members/DeleteMember");
const GetAffBalance = require("../controllers/Members/GetAffBalance");
const GetAffPayHistory = require("../controllers/Members/GetAffPayHistory");

// middlewares
const AuthHandler = require("../middlewares/AuthHandler");

// for development purposes
router.post("/", AuthHandler, GetMembers);
router.post("/getAffInfo", AuthHandler, GetAffInfo);
router.post("/getAffRank", AuthHandler, GetAffRank);

// Banks
router.post("/addBankAcc", AuthHandler, AddBankAcc);
router.post("/getBankInfo", AuthHandler, GetBankInfo);
router.post("/requestWithdraw", AuthHandler, RequestWithdraw);

router.post("/deleteMember", AuthHandler, DeleteMember);

router.post("/getAffBalance", AuthHandler, GetAffBalance);
router.post("/getAffPayHistory", AuthHandler, GetAffPayHistory);

module.exports = router;
