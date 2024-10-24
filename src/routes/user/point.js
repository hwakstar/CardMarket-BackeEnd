const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");

const Users = require("../../models/user");
const PointLog = require("../../models/point_log");
const AffUsers = require("../../affiliate/models/UsersModel");
const EarnModel = require("../../affiliate/models/EarnModel");
const AffPayment = require("../../affiliate/models/PaymentModel");
const AffRanks = require("../../affiliate/models/RankModel");

router.post("/purchase", auth, async (req, res) => {
  const { user_id, point_num, price } = req.body;

  if (user_id == undefined)
    return res.status(401).json({ msg: "authorization denied" });

  try {
    // update user remain points
    const user = await Users.findOne({ _id: user_id });
    user.point_remain += point_num;
    await user.save();

    // add new point log
    const newPointLogObj = {
      user_id: user_id,
      user_name: user.name,
      user_country: user.country ? user.country : "",
      point_num: point_num,
      date: Date.now(),
      usage: "purchasePoints",
      ioFlag: 1,
      aff_id: user.aff_id,
    };
    const newPointLog = new PointLog(newPointLogObj);
    await newPointLog.save();

    // if user is someone invited by affliate
    if (user.aff_id) {
      // get affiliate's rank
      const affUser = await AffUsers.findOne({ _id: user.aff_id });
      let affRank;
      if (affUser.rank) {
        affRank = await AffRanks.findOne({ _id: affUser.rank });
      } else {
        affRank = await AffRanks.findOne({ start_amount: 0 });
      }
      // get deposit reward to affiliate
      const depositCommission = affRank.deposite_commission;

      // add payment for affiliate
      const affPayment = await AffPayment.findOne({
        aff_id: user.aff_id,
        kind: "Withdrawable",
      });
      if (affPayment) {
        // update withdrawable balance
        affPayment.price += (price * depositCommission) / 100;
        await affPayment.save();
      } else {
        // create new withdrawable balance
        const newAffPayment = new AffPayment({
          aff_id: user.aff_id,
          price: (price * depositCommission) / 100,
          kind: "Withdrawable",
        });
        await newAffPayment.save();
      }

      // add deposit rewards to affiliate
      const newAffEarn = new EarnModel({
        aff_id: user.aff_id,
        reward: (price * depositCommission) / 100,
        kind: "purchasePoints",
      });
      await newAffEarn.save();
    }

    res.send({ status: 1, msg: "Successfully purchased points." });
  } catch (error) {
    res.send({ status: 0, msg: "Failed to purchase points.", error: error });
  }
});

module.exports = router;
