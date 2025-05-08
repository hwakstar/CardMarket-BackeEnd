const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const schedule = require("node-schedule");

const router = express.Router();

const auth = require("../../middleware/auth");
const Users = require("../../models/user");
const adminSchemas = require("../../models/admin");
const PointLog = require("../../models/pointLog");
const RegisterModel = require("../../affiliate/models/RegisterModel");
const AffUsers = require("../../affiliate/models/UsersModel");
const Blogs = require("../../models/blog");
const ShippingAddress = require("../../models/shipAddress");
const AffRanks = require("../../affiliate/models/RankModel");
const EarnModel = require("../../affiliate/models/EarnModel");
const AffPayment = require("../../affiliate/models/PaymentModel");

const uploadBlog = require("../../utils/multer/blog_multer");
const userRankData = require("../../utils/userRnkData");
const axios = require("axios");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const eventDate = new Date("1925-04-05T17:00:00");

const { Mutex } = require("async-mutex");
const shipAddress = require("../../models/shipAddress");

const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// AWS SNS Configuration
const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const verificationCodes = new Map();

// Generate random code
const generateRandomCode = (length = 8) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let randomCode = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * letters.length);
    randomCode += letters[randomIndex];
  }
  return randomCode;
};

// Generate random 6-digit code
const generateSNSCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

router.post("/check_popup", auth, async (req, res) => {
  let startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0); // Set to 00:00:00.000

  let endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  let popupUser = await adminSchemas.PopupUser.findOne({
    userID: req.body.user._id,
    date: { $gte: startOfDay, $lt: endOfDay },
  });

  if (!popupUser) {
    let popupRate = await adminSchemas.PopupRate.findOne({});

    let randomNumber = Math.random() * 100;

    let popup_type = "";
    let popup_discount = 0;
    let popup_coupon = 0;
    let couponCode = "";

    let divide = false;
    let divideRan = Math.random() * 100;
    if (divideRan > 50) divide = true;

    if (randomNumber < popupRate.normoal_rate) {
      res.send({ status: 0, msg: "none" });
    } else if (randomNumber > popupRate.winning_rate) {
      if (divide) {
        popup_type = "discount";
        popup_discount = popupRate.discount_winning;
      } else {
        popup_type = "coupon";
        popup_coupon = popupRate.coupon_winning;
      }
    } else {
      if (divide) {
        popup_type = "discount";
        popup_discount = popupRate.discount_normal;
      } else {
        popup_type = "coupon";
        popup_coupon = popupRate.coupon_normal;
      }
    }

    if (popup_type == "coupon") {
      couponCode = generateRandomCode(6);
      let newCoupon = new adminSchemas.Coupon({
        userID: req.body.user._id,
        cashback: popup_coupon,
        name: "PopUp",
        code: couponCode,
        allow: true,

        expireTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes later
      });

      await newCoupon.save();
    }

    let newPopUpUser = new adminSchemas.PopupUser({
      userID: req.body.user._id,
      type: popup_type,
      discount_rate: popup_discount,
      coupon_code: couponCode,
      coupon_number: popup_coupon,
      expireTime: new Date(Date.now() + 30 * 60 * 1000),
    });

    await newPopUpUser.save();

    console.log(
      "🎁 Gift Type: ",
      popup_type == "coupon" ? "🎫 Coupon" : "↘️ Discount Rate"
    );

    if (popup_type == "coupon") {
      res.send({
        status: 1,
        type: "coupon",
        code: couponCode,
        cashback: popup_coupon,
        gotPopup: false,
        _id: newPopUpUser._id,
      });
    } else {
      res.send({
        status: 1,
        type: "discount",
        rate: popup_discount,
        gotPopup: false,
        _id: newPopUpUser._id,
      });
    }
  } else {
    res.send({
      status: 2,
      _id: popupUser._id,
      type: popupUser.type,
      rate: popupUser.discount_rate,
      code: popupUser.coupon_code,
      cashback: popupUser.coupon_number,
      gotPopup: popupUser.gotPopup,
    });
  }
});

router.post("/confirm_popup", auth, async (req, res) => {
  let popupUser = await adminSchemas.PopupUser.findOne({
    _id: req.body._id,
  });

  popupUser.gotPopup = true;
  await popupUser.save();
  res.send({ status: 1 });
});

router.post("/register", async (req, res) => {
  const {
    name,
    country,
    email,
    password,
    affId,
    linkId,
    randomcode,
    phoneNumber,
    lineID,
  } = req.body;

  try {
    if (lineID !== undefined) {
      const isLineIdExist = await Users.findOne({ line_user_id: lineID });
      if (isLineIdExist) {
        return res.send({ status: 0, msg: "existLineId" });
      }
    }

    // check email exist
    const isEmailExist = await Users.findOne({ email: email });
    if (isEmailExist) {
      return res.send({ status: 0, msg: "exsitEmail" });
    }

    let generatecode = generateRandomCode();
    const hashedPassword = await bcrypt.hash(password, 10);

    // create new user object
    const userObj = {
      name: name,
      country: country,
      email: email,
      hashedPass: hashedPassword,
      inviteCode: generatecode,
      otherCode: randomcode,
      phoneNumber: phoneNumber,
      line_user_id: lineID,
    };

    // add affiliate id if user introduced by affiliate
    if (affId && affId !== "null") userObj.aff_id = affId;

    // * 🥉 add new rank id
    const userRank = await adminSchemas.Rank.findOne({ start_amount: 0 });
    userObj.rank_id = userRank._id;

    // * 👩‍💻 if new user is someone who invites by randomcode
    if (randomcode && lineID !== undefined) {
      const inviter = await Users.findOne({ inviteCode: randomcode });
      inviter.point_remain += 300;

      // * 🧾 Bonous Record
      const inviterRec = new PointLog({
        user_id: inviter._id,
        point_num: 300,
        usage: "invite_bonus_1", // * Inviter Bonus
      });

      // * 📩 Bonous News
      const bonusNews = new adminSchemas.GachaNews({
        title: "Invitation Bonus",
        content: "You get bonus for invitation",
        userID: inviter._id,
        type: "private",
      });

      inviter.save();
      inviterRec.save();
      bonusNews.save();

      userObj.point_remain = 300;
    }

    const newUser = await new Users(userObj).save();

    // * 🧾 Bonous Record
    const newUserRec = new PointLog({
      user_id: newUser._id,
      point_num: 300,
      usage: "invite_bonus_2", // * New User Bonus
    });
    newUserRec.save();

    // * 📩 Bonous News
    const bonusNews = new adminSchemas.GachaNews({
      title: "Invitation Bonus",
      content: "You get bonus for invitation",
      userID: newUser._id,
      type: "private",
    });

    bonusNews.save();

    // * ⛔ APPLITATE if new user is someone invited by affiliate
    if (affId && affId !== "null" && linkId && linkId !== "null") {
      // add affiliate status for register counts
      const registerByLink = new RegisterModel({
        aff_id: affId,
        link_id: linkId,
        user_id: newUser._id,
      });
      await registerByLink.save();

      // get affiliate's rank data
      const affUser = await AffUsers.findOne({ _id: affId });
      let affRank;
      if (affUser.rank) {
        affRank = await AffRanks.findOne({ _id: affUser.rank });
      } else {
        affRank = await AffRanks.findOne({ start_amount: 0 });
      }

      // add register reward to affiliate
      const registerCommission = affRank.register_commission;

      // add payment for affiliate
      const affPayment = await AffPayment.findOne({
        aff_id: affId,
        kind: "Withdrawable",
      });
      if (affPayment) {
        // update withdrawable balance
        affPayment.price += registerCommission;
        await affPayment.save();
      } else {
        // create new withdrawable balance
        const newAffPayment = new AffPayment({
          aff_id: affId,
          price: registerCommission,
          kind: "Withdrawable",
        });
        await newAffPayment.save();
      }

      // add deposit rewards to affiliate
      const newAffEarn = new EarnModel({
        aff_id: affId,
        link_id: linkId,
        reward: registerCommission,
        kind: "register",
      });
      await newAffEarn.save();
    }

    // * 📧 Email Authentication
    const token = jwt.sign({ email }, "RANDOM-TOKEN", { expiresIn: "30m" });

    const params = {
      Source: "オンガチャ運営<verify@on-gacha.net>", // Your verified domain email
      Destination: {
        ToAddresses: [email], // Recipient email
      },
      Message: {
        Subject: {
          Data: "アカウント認証メール",
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: `
              <p>このたびはオンガチャにご登録いただき、ありがとうございます。下のボタンをクリックして、メールアドレスの確認を完了してください。</p>
              <a href="https://testsite.on-gacha.net/auth/login?token=${token}&verified=true">
                オンガチャメール認証リンク
              </a>
              <p>※このリンクの有効期限は24時間です。
              もしこのメールに覚えがない場合は、破棄していただいて構いません。
              </p>
            `,
            Charset: "UTF-8",
          },
        },
      },
    };

    try {
      const command = new SendEmailCommand(params);
      await sesClient.send(command);

      console.log(`👨 NEW USER: ${newUser.email} REGISRED`);

      res.send({ status: 1, msg: "successRegistered" });
    } catch (error) {
      console.error(
        "Error sending email:",
        error.response ? error.response.data : error.message
      );
      res.send({ status: 0, msg: "failedReq" });
    }
  } catch (error) {
    console.log("💥 Register Error: ", error);
    res.send({ status: 0, msg: "failedReq" });
  }
});

router.post("/gmail-send", async (req, res) => {
  const { email } = req.body;
  try {
    const token = jwt.sign({ email }, "RANDOM-TOKEN", { expiresIn: "30m" });

    // Mail send
    const params = {
      Source: "オンガチャ運営<verify@on-gacha.net>", // Your verified domain email
      Destination: {
        ToAddresses: [email], // Recipient email
      },
      Message: {
        Subject: {
          Data: "アカウント認証メール",
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: `
              <p>このたびはオンガチャにご登録いただき、ありがとうございます。下のボタンをクリックして、メールアドレスの確認を完了してください。<p>
              <a href="https://testsite.on-gacha.net/auth/login?token=${token}&verified=true">
                オンガチャメール認証リンク
              </a>
              <p>※このリンクの有効期限は24時間です。
              もしこのメールに覚えがない場合は、破棄していただいて構いません。
              </p>
            `,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    await sesClient.send(command);

    console.log("📧 Email Sent!");

    res.send({ status: 1, msg: "emailSent" });
  } catch (error) {
    console.error(
      "Error sending email:",
      error.response ? error.response.data : error.message
    );
    res.send({ status: 0, msg: "emailFailed" });
  }
});

router.post("/activate", async (req, res) => {
  const { token } = req.body;

  if (token) {
    jwt.verify(token, "RANDOM-TOKEN", async (err, decoded) => {
      if (err) {
        console.log("💥 Activation Error: ", err);
        return res.send({
          status: 0,
          msg: "Explink",
        });
      }
      const { email } = jwt.decode(token);

      const user = await Users.findOne({ email: email });
      if (!user) {
        return res.send({ status: 0, msg: "failedVerifyed" });
      }
      user.isVerify = true;
      await Users.updateOne({ email: email }, user);

      const userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        point_remain: user.point_remain,
        point_total: user.point_total,
        shipAddress_id: user.shipAddress_id,
        address: user.address,
        city: user.city,
        country: user.country,
        inviteCode: user.inviteCode,
        inviteCount: user.inviteCount,
        invited: user.invited,
        createtime: user.createdAt,
      };

      // get rank data
      const rank = await userRankData(user._id);
      userData.rankData = rank;

      const tokken = jwt.sign(userData, "RANDOM-TOKEN", { expiresIn: "60d" });

      const currentDate = Date.now();

      if (eventDate.getTime() < currentDate) {
        res.send({
          status: 1,
          msg: "successVerifyed",
          user: userData,
          token: tokken,
        });
      } else {
        res.send({ status: 3 });
      }
    });
  } else {
    return res.send({ status: 0, msg: "failedVerifyed" });
  }
});

router.post("/login", async (req, res) => {
  const {
    email,
    password,
    type,
    name,
    country,
    affId,
    linkId,
    randomcode,
    phoneNumber,
    lineID,
  } = req.body;

  if (type == "email") {
    try {
      const user = await Users.findOne({ email: email });

      if (!user) return res.send({ status: 0, msg: "invalidLoginInfo" });
      if (!user.isVerify) return res.send({ status: 2, msg: "emailVerify" });
      if (!user.active)
        return res.send({ status: 0, msg: "withdrawedAccount" });

      const checkPass = await bcrypt.compare(password, user.hashedPass);
      if (!checkPass) return res.send({ status: 0, msg: "invalidLoginInfo" });

      // make user data for token
      const userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        point_remain: user.point_remain,
        point_total: user.point_total,
        shipAddress_id: user.shipAddress_id,
        address: user.address,
        city: user.city,
        country: user.country,
        inviteCode: user.inviteCode,
        inviteCount: user.inviteCount,
        invited: user.invited,
        createtime: user.createdAt,
        line_user_id: user.line_user_id,
      };

      // get rank data
      const rank = await userRankData(user._id);
      userData.rankData = rank;

      const token = jwt.sign(userData, "RANDOM-TOKEN", { expiresIn: "60d" });

      res.send({ status: 1, msg: "successLogin", user: userData, token });
    } catch (error) {
      console.log("💥 Login Error", error);

      res.send({ status: 0, msg: "failedReq", err: error });
    }
  }

  if (type == "line") {
    const user = await Users.findOne({ line_user_id: lineID });

    if (!user) {
      console.log("💡 Creating Line USER: ", name);

      let generatecode = generateRandomCode();

      // create new user object
      const userObj = {
        name: name,
        email: email,
        inviteCode: generatecode,
        line_user_id: lineID,
        isVerify: true,
      };

      // add affiliate id if user introduced by affiliate
      if (affId && affId !== "null") userObj.aff_id = affId;
      // add new rank id
      const userRank = await adminSchemas.Rank.findOne({ start_amount: 0 });
      userObj.rank_id = userRank._id;

      // if new user is someone who invites by randomcode

      if (randomcode && lineID !== undefined) {
        const inviter = await Users.findOne({ inviteCode: randomcode });
        inviter.point_remain += 300;
        inviter.save();
      }

      const newUser = await new Users(userObj).save();

      try {
        const userData = {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          point_remain: newUser.point_remain,
          point_total: newUser.point_total,
          shipAddress_id: newUser.shipAddress_id,
          address: newUser.address,
          city: newUser.city,
          country: newUser.country,
          inviteCode: newUser.inviteCode,
          inviteCount: newUser.inviteCount,
          invited: newUser.invited,
          createtime: newUser.createdAt,
          line_user_id: newUser.line_user_id,
        };

        // get rank data
        const rank = await userRankData(newUser._id);
        userData.rankData = rank;

        const token = jwt.sign(userData, "RANDOM-TOKEN", { expiresIn: "60d" });

        res.send({ status: 1, msg: "successLogin", user: userData, token });
      } catch (error) {
        console.log("💥 Login Error", error);

        res.send({ status: 0, msg: "failedReq", err: error });
      }
    } else {
      try {
        if (!user.isVerify) return res.send({ status: 2, msg: "emailVerify" });
        if (!user.active)
          return res.send({ status: 0, msg: "withdrawedAccount" });

        const userData = {
          _id: user._id,
          name: user.name,
          email: user.email,
          point_remain: user.point_remain,
          point_total: user.point_total,
          shipAddress_id: user.shipAddress_id,
          address: user.address,
          city: user.city,
          country: user.country,
          inviteCode: user.inviteCode,
          inviteCount: user.inviteCount,
          invited: user.invited,
          createtime: user.createdAt,
          line_user_id: user.line_user_id,
        };

        // get rank data
        const rank = await userRankData(user._id);
        userData.rankData = rank;

        const token = jwt.sign(userData, "RANDOM-TOKEN", { expiresIn: "60d" });

        res.send({ status: 1, msg: "successLogin", user: userData, token });
      } catch (error) {
        console.log("💥 Login Error", error);

        res.send({ status: 0, msg: "failedReq", err: error });
      }
    }
  }
});

router.post("/sns", async (req, res) => {
  const { phonenumber } = req.body;

  const code = generateSNSCode();
  const message = `オンガチャの認証コードは${code}です。`;
  const expiresAt = Date.now() + 10 * 60 * 1000; // 5 minutes expiration

  const regex = /^\+?[1-9]\d{1,14}$/;

  if (!phonenumber && !regex.test(phonenumber)) {
    return res.send({ status: 0, msg: "invalidPhonenumber" });
  }

  verificationCodes.set(phonenumber, { code, expiresAt });

  console.log("📧 Message: ", message);
  // await sendSms(phonenumber, message);
  res.send({ status: 1 });
});

router.post("/sns/verify-code", (req, res) => {
  const { phoneNumber, code } = req.body;

  console.log("✅ User Verified :");
  console.log("📱 => ", phoneNumber, " 🔑 => ", code);

  if (!phoneNumber || !code) {
    return res.send({ status: 0 });
  }

  const storedData = verificationCodes.get(phoneNumber);

  if (!storedData) {
    return res.send({ status: 0, msg: "Invalid Verification code!" });
  }

  if (Date.now() > storedData.expiresAt) {
    verificationCodes.delete(phoneNumber);
    return res.send({ status: 0, msg: "Verification code expired" });
  }

  if (storedData.code === code) {
    verificationCodes.delete(phoneNumber);
    return res.send({ status: 1 });
  }

  res.send({ status: 0, msg: "Invalid verification code" });
});

router.post("/forgot", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await Users.findOne({ email });
    if (!user) return res.send({ status: 0, msg: "invalidLoginInfo" });

    const token = jwt.sign({ _id: user._id }, "RANDOM-TOKEN", {
      expiresIn: "10m",
    });

    // Mail send
    const params = {
      Source: "verifi@on-gacha.net", // Your verified domain email
      Destination: {
        ToAddresses: [email], // Recipient email
      },
      Message: {
        Subject: {
          Data: "Password Reset link",
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: `
              <h1>パスワード再設定のお知らせ</h1>
              <p>あなたのアカウントからパスワード再設定のリクエストがありました。</p>
              <a href="https://testsite.on-gacha.net/auth/forgot?token=${token}"> 
              <h4> パスワード再設定のお知らせ </h2> 
              </a>
              <hr />
              <p>このメールには機微な情報が含まれている可能性があります。</p>
            `,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    await sesClient.send(command);

    console.log("📧 Forget Email Sent");

    user.resetPasswordLink = token;
    await Users.updateOne({ email }, user);

    res.send({ status: 1, msg: "emailSent" });
  } catch (error) {
    console.error(
      "Error sending email:",
      error.response ? error.response.data : error.message
    );
    res.send({ status: 0, msg: "emailFailed" });
  }
});

router.post("/reset", async (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  try {
    jwt.verify(resetPasswordLink, "RANDOM-TOKEN", async (err, decoded) => {
      if (err) {
        return res.send({
          status: 0,
          msg: "Explink",
        });
      }
      const user = await Users.findOne({
        resetPasswordLink: resetPasswordLink,
      });
      if (!user) {
        return res.send({ status: 0, msg: "failedReset" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.hashedPass = hashedPassword;
      user.resetPasswordLink = "";
      await Users.updateOne({ _id: user._id }, user);
      res.send({ status: 1, msg: "successReset" });
    });
  } catch (err) {
    res.send({ status: 0, msg: "failedReset" });
  }
});

router.post("/changePwd", auth, async (req, res) => {
  const { currentPwd, newPwd } = req.body;

  try {
    const user = await Users.findOne({ _id: req.body.user._id });

    // check current password
    const checkPass = await bcrypt.compare(currentPwd, user.hashedPass);
    if (!checkPass) {
      return res.send({ status: 2 });
    }

    // hass password
    const hashedPassword = await bcrypt.hash(newPwd, 10);
    user.hashedPass = hashedPassword;
    await user.save();
    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, err: error });
  }
});

router.get("/get_user/:id", auth, async (req, res) => {
  const id = req.params.id;

  try {
    // create user data
    const user = await Users.findOne({ _id: id });
    const statis = await adminSchemas.GachaVisitStatus.findOne();
    const createtime = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo", // Specify the time zone
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false, // Use 24-hour format
    }).format(new Date(user.createdAt));

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      point_remain: user.point_remain,
      shipAddress_id: user.shipAddress_id,
      address: user.address,
      city: user.city,
      inviteCode: user.inviteCode,
      inviteCount: user.inviteCount,
      invited: user.invited,
      country: user.country,
      createtime: createtime,
      line_user_id: user.line_user_id,
    };

    // get rank data
    const rank = await userRankData(user._id, user.rank_id);
    userData.rankData = rank;
    const allow = await adminSchemas.GachaVisitStatus.findOne();

    res.send({
      status: 1,
      msg: "get User succeeded.",
      user: userData,
      invite: allow.currentInvite,
      isStop: statis.currentMaintance,
    });
  } catch (error) {
    res.send({ status: 0, msg: "failedReq", error: error });
  }
});

router.get("/get_userList", auth, (req, res) => {
  Users.find()
    .then((users) => res.send({ status: 1, userList: users }))
    .catch((err) => res.send({ status: 0, err: err }));
});

router.get("/get_point_log/:id", auth, (req, res) => {
  const id = req.params.id;

  PointLog.find({ user_id: id })
    .then((log) => res.send({ status: 1, pointLog: log }))
    .catch((err) => res.send({ status: 0, err: err }));
});

//save user data from user profile page
router.post("/update_user", auth, async (req, res) => {
  const { name, email, _id, country } = req.body;

  try {
    await Users.updateOne(
      { _id: _id },
      {
        name: name,
        email: email,
        country: country,
      }
    );

    const user = await Users.findOne({ _id: _id });

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      point_remain: user.point_remain,
      shipAddress_id: user.shipAddress_id,
      address: user.address,
      city: user.city,
      inviteCode: user.inviteCode,
      inviteCount: user.inviteCount,
      invited: user.invited,
      country: user.country,
    };

    // get rank data
    const rank = await userRankData(user._id, user.rank_id);
    userData.rankData = rank;
    res.send({ status: 1, user: userData });
  } catch (error) {
    console.log("💥 Update User Error: ", error);
    res.send({ status: 0, err: error });
  }
});

router.delete("/del_user/:id", auth, (req, res) => {
  const id = req.params.id;

  Users.deleteOne({ _id: id })
    .then(() => res.send({ status: 1 }))
    .catch((err) => res.send({ status: 0, err: err }));
});

router.post("/withdraw_user", auth, (req, res) => {
  const user_id = req.body.user_id;

  Users.updateOne({ _id: user_id }, { active: false })
    .then(() => res.send({ status: 1 }))
    .catch((err) => res.send({ status: 0, err: err }));
});

// blog router
router.post("/blog", auth, uploadBlog.single("file"), async (req, res) => {
  const { author, title, content, parent_id } = req.body;

  try {
    const newBlog = new Blogs({
      author,
      title,
      content,
    });

    if (parent_id) {
      newBlog.parent_id = parent_id;
    }

    if (req.file?.filename !== undefined)
      newBlog.img_url = `uploads/blog/${req.file.filename}`;

    await newBlog.save();

    const blogs = await Blogs.find({ parent_id: undefined })
      .sort({ createdAt: -1 })
      .populate("author");

    let comments;
    if (parent_id) {
      comments = await Blogs.find({ parent_id: parent_id })
        .sort({ createdAt: -1 })
        .populate("author");
    }

    res.send({
      status: 1,
      msg: `${parent_id ? "successComment" : "successBlog"}.`,
      blogs: blogs,
      comments: comments,
    });
  } catch (error) {
    res.send({ status: 0, msg: "Failed to post blog.", err: error });
  }
});

router.get("/blog/:blogId", async (req, res) => {
  const blogId = req.params.blogId;
  let blogs;
  let comments;

  if (blogId === "0") {
    blogs = await Blogs.find({ parent_id: undefined })
      .sort({ createdAt: -1 })
      .populate("author");
  } else {
    blogs = await Blogs.findOne({ _id: blogId });
    comments = await Blogs.find({ parent_id: blogId })
      .sort({ createdAt: -1 })
      .populate("author");
  }

  try {
    res.send({ status: 1, blogs: blogs, comments: comments });
  } catch (error) {
    res.send({ status: 0, msg: "Something went wrong.", err: error });
  }
});

// get all shipping address of user
router.get("/shipping_address/:user_id", auth, async (req, res) => {
  const user_id = req.params.user_id;

  try {
    const shippingAddress = await ShippingAddress.find({ user_id: user_id });
    res.send({ status: 1, shippingAddress: shippingAddress });
  } catch (error) {
    res.send({ status: 0 });
  }
});

// add or update shipping addresss of user
router.post("/shipping_address", auth, async (req, res) => {
  const { update, shipAddress } = req.body;

  try {
    if (update) {
      const updateData = {
        country: shipAddress.country,
        lastName: shipAddress.lastName,
        firstName: shipAddress.firstName,
        lastNameKana: shipAddress.lastNameKana,
        firstNameKana: shipAddress.firstNameKana,
        postCode: shipAddress.postCode,
        prefecture: shipAddress.prefecture,
        address: shipAddress.address,
        building: shipAddress.building,
        phoneNumber: shipAddress.phoneNumber,
        addressLine1: shipAddress.addressLine1,
        addressLine2: shipAddress.addressLine2,
        districtCity: shipAddress.districtCity,
        cityTown: shipAddress.cityTown,
        cityDistrict: shipAddress.cityDistrict,
        islandCity: shipAddress.islandCity,
        suburbCity: shipAddress.suburbCity,
        state: shipAddress.state,
        stateProvinceRegion: shipAddress.stateProvinceRegion,
      };

      await ShippingAddress.updateOne({ _id: shipAddress._id }, updateData);
    } else {
      const newData = new ShippingAddress(shipAddress);
      await newData.save();
    }

    res.send({ status: 1, update });
  } catch (error) {
    res.send({ status: 0 });
  }
});

// set shipping address of user
router.post("/set_shipping_address", auth, async (req, res) => {
  const { userId, shipAddressId } = req.body;

  try {
    await Users.updateOne({ _id: userId }, { shipAddress_id: shipAddressId });
    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0 });
  }
});

// delete shipping address of user
router.delete("/del_shipping_address/:id", auth, async (req, res) => {
  const id = req.params.id;

  try {
    await ShippingAddress.deleteOne({ _id: id });
    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, err: error });
  }
});

// get all shipping address of user
router.get("/obtainedPrizes/:id", auth, async (req, res) => {
  const { id } = req.params;

  if (id == "undefined") {
    return res.send({ status: 0 });
  }

  try {
    const tickets = await adminSchemas.GachaTicketSchema.find({
      userID: id,
      deliverStatus: { $ne: "returned" },
    });
    const userShipAddress = await shipAddress.findOne({ user_id: id });

    res.send({
      status: 1,
      obtainedPrizes: tickets,
      shipAddress: userShipAddress,
    });
  } catch (error) {
    console.log("💥 Obtained Prize Error: ", error);

    res.send({ status: 0 });
  }
});

router.get("/check_invite_code", (req, res) => {
  adminSchemas.GachaVisitStatus.findOne().then((status) => {
    res.send(status);
  });
});

/*
 * * -----------------------------+
 * *      Membership Ranking      |
 * * -----------------------------+
 */

// Get all ranks
router.get("/membership", async (req, res) => {
  try {
    const ranks = await adminSchemas.MembershipRank.find().sort({
      requiredPoints: -1,
    });
    res.json(ranks);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Create a rank
router.post("/membership", async (req, res) => {
  try {
    const newRank = new adminSchemas.MembershipRank(req.body);
    await newRank.save();
    res.status(201).json(newRank);
  } catch (err) {
    res.status(400).json({ message: "Error creating rank" });
  }
});

// Update a rank
router.put("/membership/:id", async (req, res) => {
  try {
    const updatedRank = await adminSchemas.MembershipRank.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    if (!updatedRank) {
      return res.status(404).json({ message: "Rank not found" });
    }
    res.json(updatedRank);
  } catch (err) {
    res.status(400).json({ message: "Error updating rank" });
  }
});

// Delete a rank
router.delete("/membership/:id", async (req, res) => {
  try {
    const deletedRank = await adminSchemas.MembershipRank.findByIdAndDelete(
      req.params.id
    );
    if (!deletedRank) {
      return res.status(404).json({ message: "Rank not found" });
    }
    res.json({ message: "Rank deleted" });
  } catch (err) {
    res.status(400).json({ message: "Error deleting rank" });
  }
});

// * LINE Integration
router.post("/line_integration", async (req, res) => {
  //check userID
  function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  // Usage
  if (!isValidObjectId(req.body.userID)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  let lineUser = await Users.findOne({ line_user_id: req.body.lineID });
  if (lineUser != null)
    return res.send({
      status: 0,
      message: "Existing Line ID",
    });

  try {
    let user = await Users.findById(req.body.userID);
    user.line_user_id = req.body.lineID;
    await user.save();

    res.send({
      status: 1,
      message: "success!",
    });
  } catch (err) {
    res.send({
      status: 0,
      message: err,
    });
    console.log("💥 Line Integrating Error: ", err);
  }
});
0;

// * Check usaged points
router.post("/check_usage_points", async (req, res) => {
  try {
    const result = await PointLog.aggregate([
      {
        $match: { user_id: new mongoose.Types.ObjectId(req.body.userID) }, // apply your match condition
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: "$point_num" },
          count: { $sum: 1 },
        },
      },
    ]);

    return res.send({
      status: 1,
      totalPoints: result[0]?.totalPoints ? result[0].totalPoints : 0,
      count: result[0]?.count ? result[0].count : 0,
    });
  } catch (err) {
    console.log("💥 Check Usage Error: ", err);
    return res.send({
      status: 0,
      totalPoints: 0,
      count: 0,
    });
  }
});

// * Get Invite Bonus List
router.post("/get_invite_list", async (req, res) => {
  let list = await PointLog.find({
    usage: "invite_bonus_1",
    userID: req.body.userID,
  });

  res.send({
    list: list,
  });
});

router.post("/get_coupon_list", async (req, res) => {
  let list = await PointLog.find({
    usage: "coupon",
    user_id: req.body.userID,
  });

  res.send({
    list: list,
  });
});

function determineMembership(points, membershipConditions) {
  for (const condition of membershipConditions) {
    if (points >= condition.requiredPoints) {
      return condition;
    }
  }
  return membershipConditions[membershipConditions.length - 1]; // Rookie fallback
}

async function updateMembershipsAndBonuses() {
  const membershipConditions = await adminSchemas.MembershipRank.find();

  try {
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayPrevMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    // Aggregate points for previous month with usage "draw_gacha"
    const pointSums = await PointLog.aggregate([
      {
        $match: {
          usage: "draw_gacha",
          createdAt: { $gte: firstDayPrevMonth, $lt: firstDayThisMonth },
        },
      },
      {
        $group: {
          _id: "$user_id",
          totalPoints: { $sum: "$point_num" },
        },
      },
    ]);

    for (const { _id: userId, totalPoints } of pointSums) {
      const membership = determineMembership(totalPoints, membershipConditions);

      const user = await Users.findById(userId);
      if (!user) {
        console.warn(`User not found: ${userId}`);
        continue;
      }

      // Update membership and add bonus points
      user.membership = membership.rank;
      user.point_remain = (user.point_remain || 0) + membership.rankUpBonus;
      await user.save();

      // Record membership bonus PointLog if bonus > 0
      if (membership.rankUpBonus > 0) {
        await PointLog.create({
          user_id: userId,
          point_num: membership.rankUpBonus,
          usage: "membership_bonus",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    console.log("Memberships and bonuses updated successfully.");
  } catch (error) {
    console.error("Error updating memberships and bonuses:", error);
  }
}

schedule.scheduleJob(
  { date: 1, hour: 0, minute: 0 },
  updateMembershipsAndBonuses
);

async function sendSms(phoneNumber, message) {
  function formatPhoneNumber(phoneNumber) {
    // Check if the phone number starts with '0'
    if (phoneNumber.startsWith("0")) {
      // Remove the leading '0'
      phoneNumber = phoneNumber.slice(1);
    }

    // Validate the phone number format (10 digits after removing '0')
    const pattern = /^\d{10}$/;
    if (!pattern.test(phoneNumber)) {
      throw new Error("💥: Invalid phone number format");
    }

    return phoneNumber;
  }

  console.log(`📱 SNS SENT ➡️ ${phoneNumber}`);

  const params = {
    PhoneNumber: "+81" + formatPhoneNumber(phoneNumber), // E.164 format: +12345678901
    Message: message,
    MessageAttributes: {
      "AWS.SNS.SMS.SenderID": {
        DataType: "String",
        StringValue: "Oripa",
      },
      "AWS.SNS.SMS.SMSType": {
        DataType: "String",
        StringValue: "Transactional",
      },
    },
  };

  const command = new PublishCommand(params);

  try {
    const response = await snsClient.send(command);
    console.log("✅ Message Sent:", response);
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

module.exports = router;
