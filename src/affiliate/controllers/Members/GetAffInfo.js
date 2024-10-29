const expressAsyncHandler = require("express-async-handler");

const Users = require("../../models/UsersModel");
const AffRank = require("../../models/RankModel");
const AffBank = require("../../models/BankModel");

const GetAffInfo = expressAsyncHandler(async (req, res) => {
  try {
    const affId = req.body.affId;

    const affInfo = await Users.findOne({ _id: affId });
    const affRank = await AffRank.findOne({ _id: affInfo.rank });
    const affBank = await AffBank.findOne({ aff_id: affId });

    res.json({ status: true, affInfo, affRank, affBank, msg: "Success" });
  } catch (error) {
    res.json({ status: false, error });
  }
});

module.exports = GetAffInfo;
