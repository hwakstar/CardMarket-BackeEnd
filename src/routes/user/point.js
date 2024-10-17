const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");

const Users = require("../../models/user");
const PointLog = require("../../models/point_log");
const AffUsers = require("../../affiliate/models/UsersModel");
const AffEarn = require("../../affiliate/models/EarnModel");
const AffPayment = require("../../affiliate/models/PaymentModel");
const AffDeposit = require("../../affiliate/models/DepositModel");

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
      // get affiliate rewards fee by rank
      const affUser = await AffUsers.findOne({ _id: user.aff_id });
      let rewardsFee;
      switch (affUser.rank) {
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

      // add deposit for affiliate
      const affDeposit = await new AffDeposit({
        aff_id: user.aff_id,
        amount: price,
      });
      await affDeposit.save();

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

      // add rewards for affiliate
      const newAffEarn = new AffEarn({
        aff_id: user.aff_id,
        reward: price * rewardsFee,
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
