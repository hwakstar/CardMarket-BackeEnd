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

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const { pipeline } = require("stream");
const { count } = require("console");

const logger = require("../../utils/logger");

const mutex = new Mutex();

const job = schedule.scheduleJob("0 * * * *", () => {
  console.log("I run once a day");
});

// static function
var gachaInfo = {};

// add gacha
router.post("/", auth, uploadGacha.single("file"), async (req, res) => {
  const { type, name, price, category, kind, awardRarity, order, time } =
    req.body;

  const gachaData = {
    type: type,
    name: name,
    price: price,
    category: category,
    kind: kind,
    award_rarity: awardRarity,
    order: order,
    // img_url: `uploads/gacha/${req.file.filename}`,
    time: time,
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
        return res.send({ status: 1, msg: "successUpdated" });
      } else {
        return res.send({ status: 0, msg: "failedUpdated" });
      }
    }

    gachaData.img_url = `uploads/gacha/${req.file.filename}`;
    const newG = new Gacha(gachaData);
    const result = await newG.save();
    if (result) res.send({ status: 1, msg: "successAdded" });
    else res.send({ status: 0, msg: "failedAdded" });
  } catch (error) {
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
router.get("/", async (req, res) => {
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

router.get("/:id", async (req, res) => {
  console.log(req.params.id);

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

  console.log(prizes);

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
  const { gachaID, counts, user } = req.body;

  let gacha = gachaInfo[gachaID];

  try {
    if (gacha.remove_number + Number(counts) > gacha.total_number)
      return res.send({ status: 0, msg: "SoldOutOrLittleNumber" });

    if (gacha.kind[0].label == "once_per_day") {
      let ticket = await adminSchemas.GachaTicketSchema.findOne({
        userID: user._id,
        gachaID: gachaID,
      });

      if (Date.now() - ticket.soldTime.getTime() < 86400000)
        return res.send({ status: 0, msg: "YouBoughtEarly" });
    }

    if (user.point_remain < counts * gacha.price)
      return res.send({ status: 0, msg: "NotEnoughMoney" });

    let prizes = await adminSchemas.GachaTicketSchema.find({
      gachaID: gachaID,
      order: {
        $lte: gacha.remove_number + Number(counts),
        $gt: gacha.remove_number,
      },
    });

    console.log(
      "/\\_/\\/\\_/\\/\\_/\\ GACHA REMOVE NUMBER /\\_/\\/\\_/\\/\\_/\\"
    );
    console.log("Gacha Remove Number: ", gacha.remove_number);
    console.log("Counts: ", Number(counts));
    console.log("Prizes Length: ", prizes.length);

    let user_ = await Users.findOne({ _id: user._id });

    user_.point_remain -= gacha.price * Number(counts);
    user_.save();

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
        },
      }
    )
      .then(() => {})
      .catch((err) => console.log(err));

    gacha.remove_number += Number(counts);

    let gacha__ = await Gacha.findOne({ _id: gachaID });
    gacha__.remove_number = gacha.remove_number;
    gacha__.save();

    res.send({ status: 1, prizes: prizes });
  } catch (err) {
    console.log(err);
  }
});

// handle draw gacha

// router.post("/draw_gacha", auth, async (req, res) => {
//   const { gachaID, counts, drawDate, user } = req.body;

//   // Acquire the mutex before proceeding
//   const release = await mutex.acquire();

//   try {
//     // Fetch gacha and user data
//     let gacha = await Gacha.findOne({ _id: gachaID });
//     const userData = await Users.findOne({ _id: user._id });
//     console.log("-------------------------start -----------------------------");

//     const testmode = req.headers["test"] === "true";
//     let drawPoints = gacha.price * counts;

//     if (!testmode && userData.point_remain < drawPoints) {
//       return res.send({ status: 0, msg: 1 }); // Insufficient points
//     }

//     // Fetch targeted prizes and rubbish
//     const target_prizes = await adminSchemas.Prize.find({
//       gachaID: gachaID,
//       status: 0,
//       order: {
//         $gte: gacha.remove_number + 1,
//         $lte: gacha.remove_number + counts,
//       },
//     });

//     const target_rubbishes = await adminSchemas.Rubbish.find({
//       gachaID: gachaID,
//       status: 0,
//       order: {
//         $gte: gacha.remove_number + 1,
//         $lte: gacha.remove_number + counts,
//       },
//     });

//     // Random prize/rubbish logic
//     let random_number = counts - target_prizes.length - target_rubbishes.length;
//     let random_n_p = Math.floor(Math.random() * random_number);
//     let random_n_r = random_number - random_n_p;

//     const un_random_prizes = await adminSchemas.Prize.find({
//       gachaID: gachaID,
//       order: 0,
//       status: 0,
//     });

//     const un_random_rubbishes = await adminSchemas.Rubbish.find({
//       gachaID: gachaID,
//       order: 0,
//       status: 0,
//     });

//     if (un_random_prizes.length < random_n_p) {
//       random_n_p = un_random_prizes.length;
//       random_n_r = random_number - random_n_p;
//     }

//     let random_n_r_total = 0;
//     for (let i = 0; i < un_random_rubbishes.length; i++) {
//       random_n_r_total += un_random_rubbishes[i].count;
//     }

//     if (random_n_r_total < random_n_r) {
//       random_n_r = random_n_r_total;
//       random_n_p = random_number - random_n_r;
//     }

//     // Build response data
//     let res_data = [];

//     for (let item of target_prizes) {
//       const video = await PrizeVideo.findOne({
//         kind: item.kind,
//       });
//       item.video = video.url;
//       res_data.push(item);
//     }

//     for (let item of target_rubbishes) {
//       const video = await PrizeVideo.findOne({
//         kind: "rubbish",
//       });
//       item.kind = "rubbish";
//       item.video = video.url;
//       res_data.push(item);
//     }

//     let prizePool = [...un_random_prizes];
//     while (random_n_p > 0) {
//       const r_n = Math.floor(Math.random() * prizePool.length);
//       const r_n_el = prizePool[r_n];
//       const video = await PrizeVideo.findOne({
//         kind: r_n_el.kind,
//       });
//       r_n_el.video = video.url;
//       res_data.push(r_n_el);
//       prizePool.splice(r_n, 1);
//       random_n_p--;
//     }

//     let rubbishPool = [...un_random_rubbishes];
//     while (random_n_r > 0) {
//       const r_r = Math.floor(Math.random() * rubbishPool.length);
//       const r_r_el = rubbishPool[r_r];
//       const video = await PrizeVideo.findOne({
//         kind: "rubbish",
//       });
//       r_r_el.kind = "rubbish";
//       r_r_el.video = video.url;
//       res_data.push(r_r_el);
//       r_r_el.count--;
//       if (r_r_el.count === 0) rubbishPool.splice(r_r, 1);
//       random_n_r--;
//     }

//     // Update database (non-test mode)
//     if (!testmode) {
//       for (let item of res_data) {
//         item.drawDate = drawDate;
//         userData.obtained_prizes.push(item);
//         if (item.kind === "rubbish") {
//           if (item.count === 0) {
//             await adminSchemas.Rubbish.updateOne(
//               { _id: item._id },
//               { status: 1 }
//             );
//           } else {
//             await adminSchemas.Rubbish.updateOne(
//               { _id: item._id },
//               { count: item.count }
//             );
//           }
//         } else {
//           await adminSchemas.Prize.updateOne({ _id: item._id }, { status: 1 });
//         }
//       }
//       userData.point_remain -= drawPoints;
//       gacha.remove_number += counts;

//       await userData.save();
//       await gacha.save();
//       console.log("-------------------------end -----------------------------");
//     }

//     // Log points usage
//     const newPointLog = new PointLog({
//       aff_id: userData.aff_id,
//       user_id: userData._id,
//       user_name: userData.name,
//       user_country: userData.country,
//       point_num: drawPoints,
//       usage: "drawGacha",
//       gacha: gacha.name,
//       number: counts,
//     });
//     await newPointLog.save();

//     res.send({ status: 1, prizes: res_data });
//   } catch (error) {
//     console.log(error);
//     res.send({ status: 0 });
//   } finally {
//     // Release the mutex
//     release();
//   }
// });

router.post("/shipping", auth, async (req, res) => {
  const { shippingPrizes, returningPrizes, user } = req.body;

  let cashback = 0;

  try {
    const statis = await adminSchemas.GachaVisitStatus.findOne();
    if (statis.currentMaintance) return res.send({ status: 2 });
    // return all prizes

    const shipOrder = [];
    for (let i = 0; i < shippingPrizes.length; i++) {
      shipOrder.push(shippingPrizes[i].order);
    }

    ObjectId.createFromHexString;

    const returnIds = [];
    for (let i = 0; i < returningPrizes.length; i++) {
      returnIds.push(returningPrizes[i]._id);
    }

    console.log(returnIds);

    let unreturnedTickets = await adminSchemas.GachaTicketSchema.find({
      _id: { $in: returnIds },
      deliverStatus: { $ne: "returned" },
    });

    console.log(unreturnedTickets);

    for (let i = 0; i < unreturnedTickets.length; i++) {
      cashback += unreturnedTickets[i].cashback;
    }

    if (shipOrder.length > 0) {
      await adminSchemas.GachaTicketSchema.updateMany(
        {
          userID: ObjectId.createFromHexString(user._id),
          order: { $in: shipOrder },
        },
        { deliverStatus: "awaiting" }
      );
    } else {
      await adminSchemas.GachaTicketSchema.updateMany(
        { _id: { $in: returnIds } },
        { deliverStatus: "returned" }
      );

      let user_ = await Users.findOne({ _id: user._id });
      user_.point_remain += cashback;
      user_.save();
    }

    const gachas = await Gacha.find({ isRelease: true })
      .sort({ order: 1, createdAt: -1 })
      .populate("category");

    res.send({ status: 1, gachas: gachas });
  } catch (error) {
    console.log(error);

    res.send({ status: 0 });
  }
});

const setPreInfo = () => {
  Gacha.find({}).then((gcs) => {
    logger.info(" ========= PRE INFO ===========");
    gcs.forEach((gc) => {
      gachaInfo[gc._id] = gc;
    });
  });
};

setPreInfo();

module.exports = router;
