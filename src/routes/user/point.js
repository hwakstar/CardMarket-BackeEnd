const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");

const Users = require("../../models/user");
const PointLog = require("../../models/pointLog");
const AffUsers = require("../../affiliate/models/UsersModel");
const EarnModel = require("../../affiliate/models/EarnModel");
const AffPayment = require("../../affiliate/models/PaymentModel");
const AffRanks = require("../../affiliate/models/RankModel");
const AffRankData = require("../../affiliate/utils/affRankData");
const userRankData = require("../../utils/userRnkData");
const { Rank } = require("../../models/admin");
const adminSchemas = require("../../models/admin");
const stripe = require('stripe')(process.env.STRIPE_API_SECRET_KEY);

router.post("/purchase", auth, async (req, res) => {
  const { user_id, point_num, price } = req.body;

  if (user_id == undefined)
    return res.status(401).json({ msg: "authorization denied" });

  try {
    // update user remain points
    const user = await Users.findOne({ _id: user_id });

    const rank = await userRankData(user._id);
    //when first purchase, inviter add 500pt
    // console.log(rank.totalPointsAmount,user.invited )
    if (rank.totalPointsAmount === 0 && user.invited) {
      const inviter = await Users.findOne({inviteCode: user.invited});
      inviter.point_remain += 300;
      await Users.updateOne({ inviteCode: user.invited }, inviter);
    }

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

      // update aff rank and notify to affiliate by using mail
      const rankData = await AffRankData(user.aff_id, affUser.rank);
      if (affUser.rank !== rankData.updatedRankId) {
        console.log("updated aff rank and send mail to affiliate");
      }
    }

    res.send({ status: 1, msg: "Successfully purchased points." });
  } catch (error) {
    res.send({ status: 0, msg: "Failed to purchase points.", error: error });
  }
});

// add point by admincode
router.post("/admincode", auth, async (req, res) => {
  const { user_id, code } = req.body;

  if (user_id == undefined)
    return res.status(401).json({ msg: "authorization denied" });

  try {
    // update user remain points
    const user = await Users.findOne({ _id: user_id });
    const coupon = await adminSchemas.Coupon.findOne({code: code});
    if (!coupon.allow) {
      return (
        res.send({status: 0, msg: 'notAdmin'})
      )
    }

    const isCheck = await PointLog.findOne({user_id: user_id, couponcode: code});
    console.log(isCheck)
    if (isCheck) {
      return (
        res.send({status: 0, msg: 'alreadyUse'})
      );
    }

    user.point_remain += coupon.cashback;
    await user.save();

    // add new point log
    const newPointLogObj = {
      user_id: user_id,
      user_name: user.name,
      user_country: user.country ? user.country : "",
      point_num: coupon.cashback,
      date: Date.now(),
      usage: "coupon",
      couponname: coupon.name,
      couponcode: coupon.code,
      aff_id: user.aff_id,
    };
    const newPointLog = new PointLog(newPointLogObj);
    await newPointLog.save();

    res.send({ status: 1, data: coupon.cashback, msg: "pointAdd" });
  } catch (error) {
    res.send({ status: 0, msg: "Failed to purchase points.", error: error });
  }
});

// Stripe payment
router.post("/create-payment-intent", auth, async (req, res) => {
  const { amount } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "JPY", // Change to your desired currency
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.log(error)
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;
