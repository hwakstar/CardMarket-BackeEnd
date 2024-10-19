const PoingLogModel = require("../../models/point_log");
const UserModel = require("../models/UsersModel");
const RankModel = require("../models/RankModel");

const affRankData = async (user_id, rank_id) => {
  let userRank;

  // get all point logs
  const pointLogs = await PoingLogModel.find();

  // calculate rank period
  const today = new Date();
  // First day of last months ago
  const firstDayOfLastMonths = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1
  );
  // Last day of the current month
  const lastDayOfCurrentMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  );

  // Calculate the total purchased points amount for 2 months ago
  const totalPointsAmount = pointLogs
    .filter(
      (item) =>
        item.aff_id === user_id.toString() &&
        item.usage === "purchasePoints" &&
        item.createdAt >= firstDayOfLastMonths &&
        item.createdAt <= lastDayOfCurrentMonth
    )
    .reduce((sum, item) => sum + item.point_num, 0);

  // check today is the first day of month or not
  const isFirstDayOfMonth = today.getDate() === 1;
  if (isFirstDayOfMonth) {
    // if first day, calculate new rank automatically
    // get data end_amount is greater than totalPointsAmount
    // and start_amount is less or same than totalPointsAmount
    const newRank = await RankModel.find({
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

    // update newRank of user
    userRank = newRank[0];
    await UserModel.updateOne({ _id: user_id }, { rank: userRank._id });
  } else {
    // if not first day, get current user rank
    if (rank_id) {
      userRank = await RankModel.findOne({ _id: rank_id });
    } else {
      userRank = await RankModel.findOne({ start_amount: 0 });
    }
  }
  return { rank: userRank, totalPointsAmount: totalPointsAmount };
};

module.exports = affRankData;
