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
const axios = require('axios');
const Client = require('@amazonpay/amazon-pay-api-sdk-nodejs');
const { v4: uuidv4 } = require('uuid');

const config = {
  publicKeyId: process.env.AMAZON_PUBLIC_KEY_ID,
  privateKey: process.env.AMAZON_PRIVATE_KEY,
  region: 'jp',
  algorithm: 'AMZN-PAY-RSASSA-PSS-V2',
  sandbox: false,
};

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
    console.log(error)
    res.send({ status: 0, msg: "Failed to purchase points.", error: error });
  }
});

// add point by admincode
router.post("/admincode", auth, async (req, res) => {
  const { user_id, code } = req.body;

  if (user_id == undefined) return res.send({status: 0, msg: 'notAdmin'})

  try {
    // update user remain points
    const user = await Users.findOne({ _id: user_id });
    const statis = await adminSchemas.GachaVisitStatus.findOne();
    const coupon = await adminSchemas.Coupon.findOne({code: code});
    if (statis.currentMaintance) return res.send({status: 2, msg: 'notAdmin'})
    if (!coupon.allow) {
      return (
        res.send({status: 0, msg: 'notAdmin'})
      )
    }

    const isCheck = await PointLog.findOne({user_id: user_id, couponcode: code});
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
      payment_method_types: ['card'],
      // automatic_payment_methods: {
      //   enabled: true,
      // },
    });

    res.send({
      status: 1, clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    res.send({ status: 0, error: error.message });
  }
});

// Amazon payment
router.post('/create-checkout-session', auth, async (req, res) => {
  const { amount } = req.body;
  const payload = {
    webCheckoutDetails: {
      checkoutReviewReturnUrl: process.env.AMAZON_CHECKOUT_REVIEW_RETURN_URL,
      // checkoutResultReturnUrl: '',
    },
    paymentDetails: {
      paymentIntent: 'AuthorizeWithCapture',
      canHandlePendingAuthorization: false,
      chargeAmount: {
        amount: amount.toString(),
        currencyCode: 'JPY',
      },
    },
    storeId: process.env.AMAZON_STORE_ID,
  };
  const headers = {
    'x-amz-pay-idempotency-key': uuidv4().toString().replace(/-/g, '')
  };

  try {
    const testPayClient = new Client.WebStoreClient(config);
    const signature = testPayClient.generateButtonSignature(payload);
    const response = await testPayClient.createCheckoutSession(payload, headers);
    res.send({
      status: 1,
      checkoutSessionId: response.data.checkoutSessionId,
      signature: signature,
      payload: JSON.stringify(payload)
    });
  } catch (error) {
    console.log(error)
    res.send({status: 0});
  }
});

router.get('/get-checkout-session/:checkoutSessionId', auth, async (req, res) => {
  const { checkoutSessionId } = req.params;

  try {
    const testPayClient = new Client.WebStoreClient(config);
    const response = await testPayClient.getCheckoutSession(checkoutSessionId);
    const { shippingAddress, paymentPreferences } = response.data;
    const sessionData = {shippingAddress: shippingAddress, paymentInstrument: paymentPreferences?.[0] || {},};
    
    res.send({
      status: 1,
      sessoionData: sessionData
    });
  } catch (error) {
    console.error('Error fetching checkout session:', error);
    res.send({
      status: 0,
      error: error.message || 'Checkout session not found or invalid',
    });
  }
});

// Update Payment
router.post('/update-checkout-session', auth, async (req, res) => {
  const { checkoutSessionId } = req.body;

  if (!checkoutSessionId) {
    return res.send({ status: 0, error: 'Checkout session ID is required' });
  }

  try {
    const testPayClient = new Client.WebStoreClient(config);

    // Fetch the session to get the original amount
    const sessionResponse = await testPayClient.getCheckoutSession(checkoutSessionId);
    const originalAmount = sessionResponse.data.paymentDetails.chargeAmount.amount;

    const updatePayload = {
        webCheckoutDetails: {
          checkoutResultReturnUrl: process.env.AMAZON_CHECKOUT_RESULT_RETURN_URL + '?amount=' + originalAmount,
        },
        paymentDetails: {
          paymentIntent: 'AuthorizeWithCapture',
          canHandlePendingAuthorization: false,
          softDescriptor: "Descriptor",
          chargeAmount: {
            amount: originalAmount.toString(),
            currencyCode: 'JPY',
          },
        },
        merchantMetadata: {
            merchantReferenceId: "Merchant reference ID",
            merchantStoreName: "On-gacha.net",
            noteToBuyer: "Note to buyer",
            customInformation: "Custom information"
        }
    };

    const response = await testPayClient.updateCheckoutSession(checkoutSessionId, updatePayload);
    res.send({
      status: 1,
      data: response.data,
      amazonPayRedirectUrl: response.data.webCheckoutDetails.amazonPayRedirectUrl
    });
  } catch (error) {
    console.error('Error authorizing payment:', error);
    res.send({
      status: 0,
      error: error.message || 'Payment authorization failed',
    });
  }
});

router.post('/complete-checkout-session', auth, async (req, res) => {
  const { checkoutSessionId, amount } = req.body;

  if (!checkoutSessionId) {
    return res.send({ status: 0, error: 'Checkout session ID is required' });
  }

  try {
    const testPayClient = new Client.WebStoreClient(config);
    const completePayload = {
        chargeAmount: {
          amount: amount.toString(),
          currencyCode: 'JPY',
        },
      }
    // Fetch the session to get the original amount
    const sessionResponse = await testPayClient.completeCheckoutSession(checkoutSessionId, completePayload);
    if (sessionResponse.data.statusDetails.state === 'Completed') res.send({ status: 1 });
    else res.send({ status: 0 });
  } catch (error) {
    console.error('Error authorizing payment:', error);
    res.send({
      status: 0,
      error: error.message || 'Payment authorization failed',
    });
  }
});

// Paidy Payment
router.post('/paidy/capture-payment', auth, async (req, res) => {
  const { paymentId } = req.body;

  // Validate input
  if (!paymentId) return res.send({status: 0, error: 'Payment ID is required' });

  try {
    const response = await axios.post(`https://api.paidy.com/payments/${paymentId}/captures`,
      {
        metadata: {}
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Paidy-Version': '2018-04-10',
          'Authorization': `Bearer ${process.env.PAIDY_SECRET_KEY}`,
        },
      }
    );
    // Send success response
    res.send({ status: 1, data: response.data});
  } catch (error) {
    // Handle errors from Paidy API
    const errorDetails = error.response?.data || { message: error.message };
    console.error('Error capturing payment:', errorDetails);
    res.send({
      status: 0,
      error: 'Failed to capture payment',
    });
  }
});

router.post('/paidy/retrieve-payment', auth, async (req, res) => {
  const { paymentId } = req.body;

  try {
    const response = await axios.get(`https://api.paidy.com/payments/${paymentId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Paidy-Version': '2018-04-10',
          'Authorization': `Bearer ${process.env.PAIDY_SECRET_KEY}`
        }
      }
    );
    res.send({status: 1, payment: response.data.amount});
  } catch (err) {
    // console.log(err)
    res.send({status: 0});
  }
});

router.post('/paidy/close-payment', auth, async (req, res) => {
  const { paymentId } = req.body;

  try {
    const response = await axios.get(`https://api.paidy.com/payments/${paymentId}/close`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Paidy-Version': '2018-04-10',
          'Authorization': `Bearer ${process.env.PAIDY_SECRET_KEY}`
        }
      }
    );
    res.send({status: 1});
  } catch (err) {
    res.send({status: 0});
  }
});

module.exports = router;
