const expressAsyncHandler = require("express-async-handler");

const AffRankModel = require("../../models/RankModel");

const GetRanks = expressAsyncHandler(async (req, res) => {
  try {
    const allRanks = await AffRankModel.find().sort("start_amount");
    res.send({ status: true, allRanks: allRanks });
  } catch (error) {
    res.json({ status: false, error: error });
  }
});

module.exports = GetRanks;
