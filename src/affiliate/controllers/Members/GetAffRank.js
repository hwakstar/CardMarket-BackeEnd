const expressAsyncHandler = require("express-async-handler");

const AffUser = require("../../models/UsersModel");
const AffRank = require("../../models/RankModel");
const AffRankData = require("../../utils/affRankData");

const GetAffRank = expressAsyncHandler(async (req, res) => {
  try {
    const affUser = await AffUser.findOne({ _id: req.body.aff_id });
    const rankData = await AffRankData(req.body.aff_id, affUser.rank);
    const affRank = await AffRank.findOne({ _id: rankData.updatedRankId });

    res.json({
      status: true,
      affRank,
      totalPointsAmount: rankData.totalPointsAmount,
      msg: "Success",
    });
  } catch (error) {
    res.json({ status: true, error });
  }
});

module.exports = GetAffRank;
