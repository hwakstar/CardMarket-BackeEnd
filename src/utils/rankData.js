const AdminSchema = require("../models/admin");
const UserSchema = require("../models/user");
const PoingLogSchema = require("../models/point_log");

const rankData = async (user_id, rank_id) => {
  // get purchased points amount previouse 2 months
  const previous_amount = 0;

  // get current rank
  // let currentRank;
  // if (rank_id) {
  //   currentRank = await AdminSchema.Rank.findOne({ _id: rank_id });
  // } else {
  //   currentRank = await AdminSchema.Rank.findOne({ start_amount: 0 });
  // }

  // calculate new rank automatically
  // get data end_amount is greater than previous_amount
  // and start_amount is less or same than previous_amount
  const newRank = await AdminSchema.Rank.find({
    $or: [
      {
        last: false,
        end_amount: { $gt: previous_amount },
        start_amount: { $lte: previous_amount },
      },
      {
        last: true,
        start_amount: { $lte: previous_amount },
      },
    ],
  });
  // update newRank of user
  await UserSchema.updateOne({ _id: user_id }, { rank_id: newRank[0]._id });

  return { rank: newRank[0], previous_amount: previous_amount };
};

module.exports = rankData;
