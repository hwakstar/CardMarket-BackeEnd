const AdminSchema = require("../models/admin");
const UserSchema = require("../models/user");
const PoingLogSchema = require("../models/point_log");

const userRankData = async (user_id, rank_id) => {
  // calculate total purchased points amount
  const result = await PoingLogSchema.aggregate([
    {
      $match: {
        user_id: user_id.toString(),
        usage: "purchasePoints",
      },
    },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: "$point_num" },
      },
    },
  ]);
  const totalPointsAmount = result.length ? result[0].totalPoints : 0;

  // calculate user rank as totalPointsAmount
  const userRank = await AdminSchema.Rank.find({
    $or: [
      {
        last: false,
        end_amount: { $gt: totalPointsAmount },
        start_amount: { $lte: totalPointsAmount },
      },
      {
        last: true,
        start_amount: { $lte: totalPointsAmount },
      },
    ],
  });
  await UserSchema.updateOne({ _id: user_id }, { rank_id: userRank[0]._id });

  return { rank: userRank[0], totalPointsAmount: totalPointsAmount };
};

module.exports = userRankData;
