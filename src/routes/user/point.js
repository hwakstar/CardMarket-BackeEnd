const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");

const Users = require("../../models/user");
const PointLog = require("../../models/point_log");
const AffUsers = require("../../affiliate/models/UsersModel");
const AffEarn = require("../../affiliate/models/EarnModel");
const AffPayment = require("../../affiliate/models/PaymentModel");

router.post("/purchase", auth, async (req, res) => {
  const { user_id, point_num, price } = req.body;

  if (user_id == undefined)
    return res.status(401).json({ msg: "authorization denied" });

  try {
    const user = await Users.findOne({ _id: user_id });

    if (user) {
      // add new point log
      const newPointLog = new PointLog({
        user_id: user_id,
        user_name: user.name,
        user_country: user.country,
        point_num: point_num,
        date: Date.now(),
        usage: "purchagePoints",
        ioFlag: 1,
        aff_id: user.aff_id,
      });
      await newPointLog.save();

      // update user remain points
      user.point_remain += point_num;
      await user.save();

      // get affiliate rewards fee by rank
      const affUser = await AffUsers.findOne({ _id: user.aff_id });
      const affRank = affUser.rank;
      let rewardsFee;
      switch (affRank) {
        case "Bronze":
          rewardsFee = 0.05;
          break;
        case "Silver":
          rewardsFee = 0.07;
          break;
        case "Gold":
          rewardsFee = 0.09;
          break;
        case "Platinum":
          rewardsFee = 0.1;
          break;
        default:
          rewardsFee = 0.03;
          break;
      }

      // add rewards for affiliate
      const newAffEarn = new AffEarn({
        aff_id: user.aff_id,
        reward: price * rewardsFee,
        kind: "purchagePoints",
      });
      await newAffEarn.save();

      // add payment for affiliate
      const affPayment = await AffPayment.findOne({
        aff_id: user.aff_id,
        kind: "Withdrawable",
      });
      if (affPayment) {
        // update withdrawable balance
        affPayment.price += price * rewardsFee;
        await affPayment.save();
      } else {
        // create new withdrawable balance
        const newAffPayment = new AffPayment({
          aff_id: user.aff_id,
          price: price * rewardsFee,
          kind: "Withdrawable",
        });
        await newAffPayment.save();
      }

      res.send({ status: 1, msg: "Point Purchase Succeeded." });
    } else {
      return res.send({ status: 0, msg: "Thers is no your info." });
    }
  } catch (error) {
    res.send({ status: 0, msg: "Point Purchase Failed.", error: error });
  }
});

module.exports = router;
