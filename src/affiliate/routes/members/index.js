const express = require("express");
const router = express.Router();

// controllers
const GetMembers = require("../../controllers/Members/GetMembers");
const GetAffInfo = require("../../controllers/Members/GetAffInfo");
const GetBankInfo = require("../../controllers/Members/GetBankInfo");
const AddBankAcc = require("../../controllers/Members/AddBankAcc");
const RequestWithdraw = require("../../controllers/Members/RequestWithdraw");

// middlewares
const AuthHandler = require("../../middlewares/AuthHandler");

// for development purposes
router.post("/", AuthHandler, GetMembers);
router.post("/getAffInfo", AuthHandler, GetAffInfo);

// Banks
router.post("/addBankAcc", AuthHandler, AddBankAcc);
router.post("/getBankInfo", AuthHandler, GetBankInfo);
router.post("/requestWithdraw", AuthHandler, RequestWithdraw);

module.exports = router;
