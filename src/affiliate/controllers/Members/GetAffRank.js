const expressAsyncHandler = require("express-async-handler");

const AffRank = require("../../models/RankModel");

const GetAffRank = expressAsyncHandler(async (req, res) => {
  try {
    const affRank = await AffRank.findOne(req.body);
    res.json({ status: true, affRank, msg: "Success" });
  } catch (error) {
    res.json({ error, message: "Get members unsuccessful" });
  }
});

module.exports = GetAffRank;
