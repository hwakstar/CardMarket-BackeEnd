const expressAsyncHandler = require("express-async-handler");

const Users = require("../../models/UsersModel");
const AffRank = require("../../models/RankModel");

const GetAffInfo = expressAsyncHandler(async (req, res) => {
  try {
    const affId = req.body.affId;

    const affInfo = await Users.findOne({ _id: affId });
    const affRank = await AffRank.findOne({ _id: affInfo.rank });

    res.json({ status: true, affInfo, affRank, msg: "Success" });
  } catch (error) {
    res.json({ error, message: "Get members unsuccessful" });
  }
});

module.exports = GetAffInfo;
