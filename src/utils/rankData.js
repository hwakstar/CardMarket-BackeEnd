const AdminSchema = require("../models/admin");
const UserSchema = require("../models/user");
const PoingLogSchema = require("../models/point_log");

const rankData = async (user_id, rank_id) => {
  let userRank;

  // get all point logs
  const pointLogs = await PoingLogSchema.find();

  // calculate rank period
  const today = new Date();
  // Last day of the current month
  const lastDayOfCurrentMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  );
  // First day of last months ago
  const firstDayOfLastMonths = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1
  );

  // Calculate the total purchased points amount for 2 months ago
  const totalPointsAmount = pointLogs
    .filter(
      (item) =>
        item.user_id === user_id.toString() &&
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
    const newRank = await AdminSchema.Rank.find({
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
    await UserSchema.updateOne({ _id: user_id }, { rank_id: userRank._id });
  } else {
    // if not first day, get current user rank
    if (rank_id) {
      userRank = await AdminSchema.Rank.findOne({ _id: rank_id });
    } else {
      userRank = await AdminSchema.Rank.findOne({ start_amount: 0 });
    }
  }

  return { rank: userRank, totalPointsAmount: totalPointsAmount };
};

module.exports = rankData;
