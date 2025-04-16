const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const schedule = require("node-schedule");
const router = express.Router();
const { ObjectId } = require("mongodb");

const { Mutex } = require("async-mutex");

const auth = require("../../middleware/auth");

const uploadGacha = require("../../utils/multer/gacha_multer");
const uploadGachaDetail = require("../../utils/multer/gachaDetail_multer");

const Gacha = require("../../models/gacha");
const adminSchemas = require("../../models/admin");
const Users = require("../../models/user");
const PointLog = require("../../models/pointLog");
const PrizeVideo = require("../../models/prizeVideo");

const logger = require("../../utils/logger");

// static function
var gachaInfo = {};

const oripaTimers = {};

// add gacha
router.post("/", auth, uploadGacha.single("file"), async (req, res) => {
  const {
    type,
    name,
    price,
    category,
    kind,
    awardRarity,
    order,
    time,
    secret,
    limitNumber,
    purchase,
    purchaseLimit,
    period,
    startTime,
    endTime,
    discountRate,
  } = req.body;

  const gachaData = {
    type: type,
    name: name,
    price: price,
    category: category,
    kind: kind,
    award_rarity: awardRarity,
    order: order,
    secret: secret,
    limitNumber: limitNumber,
    purchase: purchase,
    purchaseLimit: purchaseLimit,
    period: period,
    startTime: startTime,
    endTime: endTime,
    // img_url: `uploads/gacha/${req.file.filename}`,
    time: time,
    discountRate: discountRate,
  };
  try {
    if (req.body.id) {
      if (req.file) {
        let gacha = await Gacha.findOne({ _id: req.body.id });

        if (!gacha) return res.send({ status: 0, msg: "failedReq" });

        const filename = gacha.img_url;
        const filePath = path.join("./", filename);
        gachaData.img_url = `uploads/gacha/${req.file.filename}`;
      }

      const result = await Gacha.updateOne(
        { _id: req.body.id }, // Filter to find the document
        { $set: gachaData } // Update object using $set
      );

      if (result) {
        let gacha = await Gacha.findOne({ _id: req.body.id });

        if (gacha.period) {
          clearTimeout(oripaTimers[gacha._id]);
          let remainTime = gacha.endTime.getTime() - Date.now();

          let timer = setTimeout(async () => {
            let ugacha = await Gacha.findOne({ _id: req.body.id });
            ugacha.isRelease = false;
            ugacha.save();
          }, remainTime);
          oripaTimers[gacha._id] = timer;
        }

        return res.send({ status: 1, msg: "successUpdated" });
      } else {
        return res.send({ status: 0, msg: "failedUpdated" });
      }
    }

    gachaData.img_url = `uploads/gacha/${req.file.filename}`;
    const newG = new Gacha(gachaData);
    const result = await newG.save();
    if (result) {
      let remainTime = result.endTime.getTime() - Date.now();
      let timer = setTimeout(() => {
        result.isRelease = false;
        result.save();
      }, remainTime);
      oripaTimers[result._id] = timer;
      res.send({ status: 1, msg: "successAdded" });
    } else res.send({ status: 0, msg: "failedAdded" });
  } catch (error) {
    console.error(error);
    res.send({ status: 0, msg: "failedReq" });
  }
});

// add gacha detail pic
router.post(
  "/pic",
  auth,
  uploadGachaDetail.single("file"),
  async (req, res) => {
    try {
      let gacha = await Gacha.findOne({ _id: req.body.id });
      if (!gacha) return res.send({ status: 0, msg: "failedReq" });
      gacha.detail_img_url = `uploads/gacha/detail/${req.file.filename}`;
      await gacha.save();

      res.send({ status: 1, msg: "successAdded" });
    } catch (error) {
      console.log("💥 Post or Add Error: ", error);
      res.send({ status: 0, msg: "failedReq" });
    }
  }
);

router.post("/seo", auth, async (req, res) => {
  const { gachaID, title, desc } = req.body;

  const seoData = {
    title: title,
    desc: desc,
  };
  try {
    let result;
    if (!gachaID) {
      result = await adminSchemas.Themes.updateOne({}, { $set: seoData });
    } else {
      let gacha = await Gacha.findOne({ _id: gachaID });
      if (!gacha) return res.send({ status: 0, msg: "failedReq" });

      result = await Gacha.updateOne(
        { _id: gachaID }, // Filter to find the document
        { $set: seoData } // Update object using $set
      );
    }

    if (result) {
      return res.send({ status: 1, msg: "successUpdated" });
    } else {
      return res.send({ status: 0, msg: "failedUpdated" });
    }
  } catch (error) {
    res.send({ status: 0, msg: "failedReq" });
  }
});

// get all gachas
router.get("/admin", async (req, res) => {
  const gachas = await Gacha.find()
    .sort({ order: 1, createdAt: -1 })
    .populate("category");
  const homeSeo = await adminSchemas.Themes.findOne();
  const statis = await adminSchemas.GachaVisitStatus.findOne();
  const home = { title: homeSeo.title, desc: homeSeo.desc };

  if (gachas)
    res.send({
      status: 1,
      gachaList: gachas,
      home: home,
      isStop: statis.currentMaintance,
    });
  else res.send({ status: 0 });
});

router.get("/user", async (req, res) => {
  const gachas = await Gacha.find({ isRelease: true, secret: false })
    .sort({ order: 1, createdAt: -1 })
    .populate("category");
  const homeSeo = await adminSchemas.Themes.findOne();
  const statis = await adminSchemas.GachaVisitStatus.findOne();
  const home = { title: homeSeo.title, desc: homeSeo.desc };

  if (gachas)
    res.send({
      status: 1,
      gachaList: gachas,
      home: home,
      isStop: statis.currentMaintance,
    });
  else res.send({ status: 0 });
});

// get user count by gacha id
router.get("/count/:id", async (req, res) => {
  const gachaID = req.params.id;

  try {
    const gachas = await Gacha.findOne({ _id: gachaID });
    const currentTime = Math.floor(Date.now() / 1000);
    const yeasterday = currentTime - (currentTime % 86400) - 86400;
    const count = gachas.userLogs.filter(
      (item) => item.time >= yeasterday && item.time < yeasterday + 86400
    ).length;
    const allow = await adminSchemas.GachaVisitStatus.findOne();
    res.send({ status: 1, count: count, allow: allow.currentGacha });
  } catch (err) {
    res.send({ status: 1 });
  }
});

// get gacha by id
router.get("/user/:id", async (req, res) => {
  const gacha = await Gacha.findOne({ _id: req.params.id }).populate(
    "category"
  );
  const gachas = await Gacha.find()
    .sort({ order: 1, createdAt: -1 })
    .populate("category");

  if (gacha)
    res.send({
      status: 1,
      gacha: gacha,
      gachas: gachas,
    });
  else res.send({ status: 0 });
});

router.get("/check_hidden", auth, async (req, res) => {
  console.log("✅ Hidden Gacha");
  const specifiedDate = new Date();
  const startOfDay = new Date(specifiedDate.setHours(0, 0, 0, 0)); // Start of the day
  const endOfDay = new Date(specifiedDate.setHours(23, 59, 59, 999)); // End of the day
  let userRecord = await adminSchemas.HiddenGachaRecord.findOne({
    userID: req.body.user._id,
    date: {
      $gte: startOfDay,
      $lt: endOfDay,
    },
  });
  if (userRecord) {
    return res.send({ status: 0 });
  } else {
    let counts = await PointLog.countDocuments({
      user_id: req.body.user._id,
      usage: "draw_gacha",
      createdAt: {
        $gte: new Date(new Date().getTime() - 10 * 60 * 1000), // 10 minutes ago
      },
    });
    console.log("✔️ Counts: ", counts);
    if (counts > 0) {
      let hiddenGachas = await Gacha.find({ secret: true, isRelease: true });
      let random_num = Math.floor(Math.random() * hiddenGachas.length);

      if (hiddenGachas.length != 0) {
        let newHiddenGachaRecord = new adminSchemas.HiddenGachaRecord({
          userID: req.body.user._id,
          gachaID: hiddenGachas[random_num]._id,
        });
        newHiddenGachaRecord.save();
        res.send({
          status: 1,
          gachaName: hiddenGachas[random_num].name,
          gachaImgUrl: hiddenGachas[random_num].img_url,
          gachaID: hiddenGachas[random_num]._id,
        });
      }
    }
  }
});

router.get("/:id", async (req, res) => {
  const gacha = await Gacha.findOne({ _id: req.params.id }).populate(
    "category"
  );
  const gachas = await Gacha.find()
    .sort({ order: 1, createdAt: -1 })
    .populate("category");

  let gachaID_ = new mongoose.Types.ObjectId(req.params.id);

  let prizes = await adminSchemas.GachaTicketSchema.aggregate(
    // Pipeline
    [
      // Stage 1
      {
        $match: {
          // enter query here
          gachaID: gachaID_,
        },
      },

      // Stage 2
      {
        $group: {
          _id: "$img_url",
          count: { $count: {} },
          kind: { $first: "$kind" },
          img_url: { $first: "$img_url" },
          name: { $first: "$name" },
          //...
        },
      },
    ]
  );

  if (gacha)
    res.send({
      status: 1,
      gacha: gacha,
      gachas: gachas,
      prizes: prizes,
    });
  else res.send({ status: 0 });
});

// get gacha by gacha category.id
router.get("/category/:id", async (req, res) => {
  const gacha = await Gacha.findOne({ _id: req.params.id }).populate(
    "category"
  );
  const data = await Gacha.find({ category: gacha?.category._id });
  if (gacha) res.send({ status: 1, gacha: data });
  else res.send({ status: 0 });
});

// delete gacha
router.delete("/:id", async (req, res) => {
  try {
    const gacha = await Gacha.findOne({ _id: req.params.id });
    const filePath = path.join("./", gacha.img_url);
    if (!gacha) res.send({ status: 0, msg: "failedReq" });

    try {
      await gacha.deleteOne();

      adminSchemas.deleteMany({
        gachaID: req.params._id,
      });

      res.send({ status: 1 });
    } catch (err) {
      res.send({ status: 0 });
    }
  } catch (error) {
    res.send({ status: 0, msg: "failedReq" });
  }
});

// set gacah release
router.get("/set_release/:id", auth, async (req, res) => {
  try {
    const gacha = await Gacha.findOne({ _id: req.params.id });
    gacha.isRelease = !gacha.isRelease;

    await gacha.save();
    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, msg: "failedReq" });
  }
});

router.post("/set_prize", auth, async (req, res) => {
  const { gachaID, prizes } = req.body;

  prizes.forEach((item) => (item["gachaID"] = gachaID));

  let gacha = await Gacha.findOne({ _id: gachaID });
  gacha.total_number += prizes.length;
  gacha.save();

  adminSchemas.GachaTicketSchema.insertMany(prizes)
    .then(() => {
      setPreInfo();
      res.send({ status: 1 });
    })
    .catch((err) => {
      logger.error("An error occured: ", err);
      res.send({ status: 0 });
    });
});

// set prize to gacha
// router.post("/set_prize", auth, async (req, res) => {
//   const { gachaID, prizes, prizeId, order } = req.body;

//   let gacha = await Gacha.findOne({ _id: gachaID });

//   let Is_LastPrize = false;

//   try {
//     if (prizeId) {
//       let target_prize = await adminSchemas.Prize.findOne({ _id: prizeId });

//       if (
//         gacha.kind.find((item) => item.value == "last_prize") == undefined &&
//         target_prize.kind == "last_prize"
//       ) {
//         return res.send({ status: 0 });
//       }

//       if (target_prize.kind == "last_prize") {

//         const count = await adminSchemas.Prize.countDocuments({
//           gachaID: gachaID,
//           kind: "last_prize",
//         });

//         if(count > 0) {
//           await adminSchemas.Prize.findOneAndDelete({
//             gachaID: gachaID,
//             kind: "last_prize",
//           });
//           Is_LastPrize = true;
//         } else if (count > 1) {
//           return res.send({ status: 0 })
//         }

//       }

//       let aa = await adminSchemas.Prize.create({
//         gachaID: gachaID,
//         img_url: target_prize.img_url,
//         name: target_prize.name,
//         cashback: target_prize.cashback,
//         kind: target_prize.kind,
//         trackingNumber: target_prize.trackingNumber,
//         deliveryCompany: target_prize.deliveryCompany,
//         order: order,
//       });

//       gacha.total_number++;
//     } else {
//       let last_prize = prizes.filter((item) => item.kind == "last_prize");

//       if (last_prize.length > 1) return res.send({ status: 0 });

//       if (
//         gacha.kind.find((item) => item.value == "last_prize") == undefined &&
//         last_prize.length == 1
//       )
//         return res.send({ status: 0 });

//       if (last_prize.length == 1) {
//         const count = await adminSchemas.Prize.countDocuments({
//           gachaID: gachaID,
//           kind: "last_prize",
//         });

//         if(count > 0) {
//           await adminSchemas.Prize.findOneAndDelete({
//             gachaID: gachaID,
//             kind: "last_prize",
//           });
//           Is_LastPrize = true;
//         } else if (count > 1) {
//           return res.send({ status: 0 })
//         }
//       }

//       prizes.forEach((item) => (item["gachaID"] = gachaID));

//       await adminSchemas.Prize.insertMany(prizes);

//       gacha.total_number += prizes.length;
//     }

//     if (Is_LastPrize) {
//       gacha.total_number--;
//     }

//     await gacha.save();

//     res.send({ status: 1 });
//   } catch (error) {
//     res.send({
//       status: 0,
//     });
//   }
// });
// set rubbish to gacha
router.post("/set_rubbish", auth, async (req, res) => {
  const { gachaID, rubbishes, rubbishId, count } = req.body;

  let gacha = await Gacha.findOne({ _id: gachaID });

  try {
    if (rubbishId) {
      let target_rubbish = await adminSchemas.Rubbish.findOne({
        _id: rubbishId,
      });

      let aa = await adminSchemas.Rubbish.create({
        gachaID: gachaID.toString(),
        img_url: target_rubbish.img_url,
        name: target_rubbish.name,
        cashback: target_rubbish.cashback,
        nickname: target_rubbish.nickname,
        count: count,
      });

      gacha.total_number += Number(count);
    } else {
      rubbishes.forEach((item) => (item["gachaID"] = gachaID));

      await adminSchemas.Rubbish.insertMany(rubbishes);
      gacha.total_number += rubbishes.length;
    }

    await gacha.save();

    res.send({ status: 1 });
  } catch (error) {
    res.send({
      status: 0,
    });
  }
});

// unset prize from gacha
router.post("/unset_prize", auth, async (req, res) => {
  const { gachaID, prizeId } = req.body;

  try {
    const gacha = await Gacha.findOne({ _id: gachaID });

    await adminSchemas.Prize.findOneAndDelete({
      _id: prizeId,
    });

    gacha.total_number--;
    await gacha.save();

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, msg: error });
  }
});

// unset rubbish from gacha
router.post("/unset_rubbish", auth, async (req, res) => {
  const { gachaID, rubbishId } = req.body;

  try {
    const gacha = await Gacha.findOne({ _id: gachaID });

    let rubbish = await adminSchemas.Rubbish.findOne({ _id: rubbishId });
    await adminSchemas.Rubbish.findOneAndDelete({ _id: rubbishId });
    gacha.total_number -= rubbish.count;
    await gacha.save();

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, msg: error });
  }
});

// set prizes from csv file
router.post("/upload_bulk", auth, async (req, res) => {
  const { prizes } = req.body;

  try {
    if (req.body.type == "prize") {
      await adminSchemas.Prize.insertMany(prizes);
    }

    if (req.body.type == "rubbish") {
      await adminSchemas.Rubbish.insertMany(prizes);
    }

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0 });
  }
});

router.post("/draw_gacha", auth, async (req, res) => {
  const { gachaID, counts } = req.body;

  let user = await Users.findOne({ _id: req.body.user._id });

  let gacha = gachaInfo[gachaID];
  let gachaLimit = gacha.limitNumber;
  let purchaseLimit = gacha.purchaseLimit;
  let discountRate = 0;

  // ✅ Check New Registered User
  let userCreateTime = new Date(user.createtime);

  if (Date.now() - userCreateTime.getTime() < 24 * 3 * 3600) {
    discountRate = gacha.discountRate * 1.5;
  } else {
    discountRate = gacha.discountRate;
  }

  // ✅ Check Purchase Only Gacha
  if (purchaseLimit > 0) {
    let userPurchase = await PointLog.aggregate([
      {
        $match: {
          user_id: user._id,
          usage: "purchase",
        },
      },
      {
        $group: {
          _id: "$user_id",
          total: {
            $sum: "$point_num",
          },
        },
      },
    ]);

    if (userPurchase.total < purchaseLimit || userPurchase.length == 0) {
      return res.send({ status: 0, msg: "PurchaseOnlyGacha" });
    }
  }

  // ✅ Check Limit Gacha
  if (gachaLimit != -1) {
    let userlimit = await adminSchemas.GachaLimit.findOne({
      gachaID: gachaID,
      userID: user._id,
    });

    if (userlimit == null) {
      let newUserLimit = new adminSchemas.GachaLimit({
        gachaID: gachaID,
        userID: user._id,
        number: 1,
      });

      newUserLimit.save();
    } else {
      if (userlimit?.number == gachaLimit) {
        return res.send({ status: 0, msg: "OutOfLimit" });
      } else {
        userlimit.number++;
        userlimit.save();
      }
    }
  }

  try {
    // ✅ Check Gacha Remain Number
    if (gacha.remove_number + Number(counts) > gacha.total_number)
      return res.send({ status: 0, msg: "SoldOutOrLittleNumber" });

    // ✅ Check Gacha Type 🔂 ➡ ONCE_PER_DAY
    if (gacha.kind[0].label == "once_per_day") {
      let ticket = await adminSchemas.GachaTicketSchema.findOne({
        userID: user._id,
        gachaID: gachaID,
      });

      if (Date.now() - ticket.soldTime.getTime() < 86400000)
        return res.send({ status: 0, msg: "YouBoughtEarly" });
    }

    // 💰 Check User Remain Points
    if (
      user.point_remain <
      Number(counts) * gacha.price * (100 - discountRate) * 0.01
    )
      return res.send({ status: 0, msg: "NotEnoughMoney" });

    // 🏆 Find Prizes
    let prizes = await adminSchemas.GachaTicketSchema.find({
      gachaID: gachaID,
      order: {
        $lte: gacha.remove_number + Number(counts),
        $gt: gacha.remove_number,
      },
    });

    console.log("📦 Remain: ", gacha.remove_number);
    console.log("🔄 Counts: ", Number(counts));
    console.log("🛒 Prizes: ", prizes.length);

    let user_ = await Users.findOne({ _id: user._id });

    // 💳 Discount User Points
    user_.point_remain -=
      gacha.price * (100 - discountRate) * 0.01 * Number(counts);
    user_.save();

    // ⌛ 14 Days Later, Prize Return ➡ 🚚
    const currentDate = new Date();
    const expireTime = new Date(currentDate);
    expireTime.setDate(currentDate.getDate() + 14);

    // 🛒 Set User's Tickets
    adminSchemas.GachaTicketSchema.updateMany(
      {
        gachaID: gachaID,
        order: {
          $lte: gacha.remove_number + Number(counts),
          $gt: gacha.remove_number,
        },
      },
      {
        $set: {
          userID: user._id,
          sold: true,
          deliverStatus: "notSelected",
          soldTime: Date.now(),
          expireTime: expireTime,
        },
      }
    )
      .then(() => {})
      .catch((err) => console.log("💥 Draw Gacha Error: ", err));

    // 🥃 Set Gacha Remain Number
    gacha.remove_number += Number(counts);

    let gacha__ = await Gacha.findOne({ _id: gachaID });
    gacha__.remove_number = gacha.remove_number;
    gacha__.save();

    // 🧾 Remain User Record
    const newPointLog = new PointLog({
      aff_id: user.aff_id,
      user_id: user._id,
      user_name: user.name,
      user_country: user.country,
      point_num: gacha.price * (100 - discountRate) * 0.01 * Number(counts),
      usage: "draw_gacha",
      gacha: gacha.name,
      number: counts,
    });
    await newPointLog.save();

    res.send({ status: 1, prizes: prizes });
  } catch (err) {
    console.log("💥 Draw Gacha Error: ", err);
  }
});

router.post("/shipping", auth, async (req, res) => {
  const { shippingPrizes, returningPrizes, user } = req.body;

  let cashback = 0;

  try {
    // 🔨 Check Maintenanence Mode
    const statis = await adminSchemas.GachaVisitStatus.findOne();
    if (statis.currentMaintance) return res.send({ status: 2 });

    // 🚛 Check Shipping Prizes
    const shipIds = [];
    for (let i = 0; i < shippingPrizes.length; i++) {
      shipIds.push(shippingPrizes[i]._id);
    }

    // 💰 Check Return Prizes
    const returnIds = [];
    for (let i = 0; i < returningPrizes.length; i++) {
      returnIds.push(returningPrizes[i]._id);
    }

    console.log("💰 Return Prizes: ", returnIds);

    // 🤚 Prevent Repeat
    let unreturnedTickets = await adminSchemas.GachaTicketSchema.find({
      _id: { $in: returnIds },
      deliverStatus: { $ne: "returned" },
      type: { $ne: "shipping" },
    });

    console.log("🎫 Selected Tickets For Returning: ", unreturnedTickets);

    for (let i = 0; i < unreturnedTickets.length; i++) {
      cashback += unreturnedTickets[i].cashback;
    }

    // 🤚 Prevent Repeat
    if (shipIds.length > 0) {
      await adminSchemas.GachaTicketSchema.updateMany(
        {
          _id: { $in: shipIds },
          type: "shipping",
        },
        { deliverStatus: "awaiting", deliveryTime: Date.now() }
      );
    } else {
      await adminSchemas.GachaTicketSchema.updateMany(
        { _id: { $in: returnIds } },
        { deliverStatus: "returned", deliveryTime: Date.now() }
      );

      let user_ = await Users.findOne({ _id: user._id });
      user_.point_remain += cashback;
      user_.save();
    }

    const gachas = await Gacha.find({ isRelease: true, secret: false })
      .sort({ order: 1, createdAt: -1 })
      .populate("category");

    res.send({ status: 1, gachas: gachas });
  } catch (error) {
    console.log("💥 Shipping or Returning Error: ", error);

    res.send({ status: 0 });
  }
});

router.post("/ticket", auth, async (req, res) => {
  const { gachaID } = req.body;

  let tickets = await adminSchemas.GachaTicketSchema.find({
    gachaID: gachaID,
  }).populate({
    path: "userID",
    select: "name email",
  });
  res.send({
    tickets: tickets,
  });
});

const setPreInfo = () => {
  Gacha.find({}).then((gcs) => {
    console.log("⚙️ Prepare Gacha Information");
    gcs.forEach((gc) => {
      // Gacha Info Storing
      gachaInfo[gc._id] = gc;

      // Timer Setting
      if (gc.period) {
        let remainTime = gc.endTime.getTime() - Date.now();
        let timer = setTimeout(() => {
          gc.isRelease = false;
          gc.save();
        }, remainTime);
        oripaTimers[gc._id] = timer;
      }
    });
  });
};

setPreInfo();

module.exports = router;
