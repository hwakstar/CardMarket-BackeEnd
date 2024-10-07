const express = require("express");
const router = express.Router();

// controllers
const GetMembers = require("../../controllers/Members/GetMembers");
const GetAffInfo = require("../../controllers/Members/GetAffInfo");
const GetBankInfo = require("../../controllers/Members/GetBankInfo");
const AddBankAcc = require("../../controllers/Members/AddBankAcc");

// middlewares
const AuthHandler = require("../../middlewares/AuthHandler");

// for development purposes
router.post("/", AuthHandler, GetMembers);
router.post("/getAffInfo", AuthHandler, GetAffInfo);

// Banks
router.post("/addBankAcc", AuthHandler, AddBankAcc);
router.post("/getBankInfo", AuthHandler, GetBankInfo);

module.exports = router;
