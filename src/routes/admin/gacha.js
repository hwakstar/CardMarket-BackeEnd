const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const router = express.Router();
const { ObjectId } = require("mongodb");

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

// Configure the AWS SDK
const s3Client = new S3Client({
  region: process.env.AWS_REGION, // Change to your bucket's region
  credentials: {
    accessKeyId: process.env.AMAZON_S3_ACCESS_KEY, // Use environment variable
    secretAccessKey: process.env.AMAZON_S3_SECRET_KEY, // Use environment variable
  },
});

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
  const gacha = await Gacha.findOne({ _id: req.params.id }).populate(
    "category"
  );
  const gachas = await Gacha.find()
    .sort({ order: 1, createdAt: -1 })
    .populate("category");
  const prizes = await adminSchemas.Prize.find({
    gachaID: req.params.id,
    status: 0,
  });
  const rubbishs = await adminSchemas.Rubbish.find({
    gachaID: req.params.id,
    status: 0,
  });

  if (gacha)
    res.send({
      status: 1,
      gacha: gacha,
      gachas: gachas,
      prizes: prizes,
      rubbishs: rubbishs,
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

// set prize to gacha
router.post("/set_prize", auth, async (req, res) => {
  const { gachaID, prizes, prizeId, order } = req.body;

  let gacha = await Gacha.findOne({ _id: gachaID });

  let Is_LastPrize = false;

  try {
    if (prizeId) {
      let target_prize = await adminSchemas.Prize.findOne({ _id: prizeId });

      if (
        gacha.kind.find((item) => item.value == "last_prize") == undefined &&
        target_prize.kind == "last_prize"
      ) {
        return res.send({ status: 0 });
      }

      if (target_prize.kind == "last_prize") {
        await adminSchemas.Prize.findOneAndDelete({
          gachaID: gachaID,
          kind: "last_prize",
        });
        Is_LastPrize = true;
      }

      let aa = await adminSchemas.Prize.create({
        gachaID: gachaID,
        img_url: target_prize.img_url,
        name: target_prize.name,
        cashback: target_prize.cashback,
        kind: target_prize.kind,
        trackingNumber: target_prize.trackingNumber,
        deliveryCompany: target_prize.deliveryCompany,
        order: order,
      });

      gacha.total_number++;
    } else {
      let last_prize = prizes.filter((item) => item.kind == "last_prize");

      if (last_prize.length > 1) return res.send({ status: 0 });

      if (
        gacha.kind.find((item) => item.value == "last_prize") == undefined &&
        last_prize.length == 1
      )
        return res.send({ status: 0 });

      if (last_prize.length == 1) {
        Is_LastPrize = true;
        await adminSchemas.Prize.findOneAndDelete({
          gachaID: gachaID,
          kind: "last_prize",
        });
      }

      prizes.forEach((item) => (item["gachaID"] = gachaID));

      await adminSchemas.Prize.insertMany(prizes);

      gacha.total_number += prizes.length;
    }

    if (Is_LastPrize) {
      gacha.total_number--;
    }

    await gacha.save();

    res.send({ status: 1 });
  } catch (error) {
    res.send({
      status: 0,
    });
  }
});

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

// handle draw gacha
router.post("/draw_gacha", auth, async (req, res) => {
  const { gachaID, counts, drawDate, user } = req.body;
  let gacha = await Gacha.findOne({ _id: gachaID });
  const userData = await Users.findOne({ _id: user._id });

  try {
    const testmode = req.headers["test"] === "true";
    let drawPoints = gacha.price * counts;

    if (!testmode && userData.point_remain < drawPoints)
      return res.send({ status: 0, msg: 1 });

    target_prizes = await adminSchemas.Prize.find({
      gachaID: gachaID,
      status: 0,
      order: {
        $gte: gacha.remove_number + 1,
        $lte: gacha.remove_number + counts,
      },
    });

    target_rubbishes = await adminSchemas.Rubbish.find({
      gachaID: gachaID,
      status: 0,
      order: {
        $gte: gacha.remove_number + 1,
        $lte: gacha.remove_number + counts,
      },
    });



    let random_number = counts - target_prizes.length - target_rubbishes.length;
    let random_n_p = Math.floor(Math.random() * random_number);

    let random_n_r = random_number - random_n_p;

    let un_random_prizes = await adminSchemas.Prize.find({
      gachaID: gachaID,
      order: 0,
      status: 0,
    });

    let un_random_rubbishes = await adminSchemas.Rubbish.find({
      gachaID: gachaID,
      order: 0,
      status: 0,
    });

    if (un_random_prizes.length < random_n_p) {
      random_n_p = un_random_prizes.length;
      random_n_r = random_number - random_n_p;
    }

    let random_n_r_total = 0;
    for (let i = 0; i < un_random_rubbishes.length; i++) {
      random_n_r_total += un_random_rubbishes[i].count;
    }

    if (random_n_r_total < random_n_r) {
      random_n_r = random_n_r_total;
      random_n_p = random_number - random_n_r;
    }

    let res_data = [];

    for (let i = 0; i < target_prizes.length; i++) {
      const item = target_prizes[i];
      let video = await PrizeVideo.findOne({ kind: item.kind });
      item["video"] = video.url;
      res_data.push(item);
    }

    for (let i = 0; i < target_rubbishes.length; i++) {
      const item = target_rubbishes[i];
      let video = await PrizeVideo.findOne({ kind: "rubbish" });
      item["kind"] = "rubbish";
      item["video"] = video.url;
      res_data.push(item);
    }

    while (1) {
      if (!random_n_p) break;

      let r_n = Math.floor(Math.random() * un_random_prizes.length);
      let r_n_el = un_random_prizes[r_n];
      let video = await PrizeVideo.findOne({ kind: r_n_el.kind });
      r_n_el["video"] = video.url;
      res_data.push(r_n_el);
      un_random_prizes.splice(r_n, 1);
      random_n_p--;
    }

    while (1) {
      if (!random_n_r) break;
      let r_r = Math.floor(Math.random() * un_random_rubbishes.length);
      let r_r_el = un_random_rubbishes[r_r];
      let video = await PrizeVideo.findOne({ kind: "rubbish" });
      r_r_el["kind"] = "rubbish";
      r_r_el["video"] = video.url;
      res_data.push(r_r_el);

      un_random_rubbishes[r_r].count--;

      if (un_random_rubbishes[r_r].count == 0) {
        un_random_rubbishes.splice(r_r, 1);
      }
      random_n_r--;
    }

    if (!testmode) {
      for (let i = 0; i < res_data.length; i++) {
        const item = res_data[i];
        let data = item;
        data.drawDate = drawDate;
        await userData.obtained_prizes.push(data);
        if (item.kind == "rubbish") {
          if (item.count == 0) {
            await adminSchemas.Rubbish.updateOne(
              { _id: item._id },
              { status: 1 }
            );
          } else {
            await adminSchemas.Rubbish.updateOne(
              { _id: item._id },
              { count: item.count }
            );
          }
        } else {
          await adminSchemas.Prize.updateOne({ _id: item._id }, { status: 1 });
        }
      }
      userData.point_remain -= drawPoints;
      gacha.remove_number += counts;
      console.log("gacha_remove_number: ");
      console.log(gacha.remove_number);

      await userData.save();
      await gacha.save();
    }

    // Add new points log
    const newPointLog = new PointLog({
      aff_id: userData.aff_id,
      user_id: userData._id,
      user_name: userData.name,
      user_country: userData.country,
      point_num: drawPoints,
      usage: "drawGacha",
      gacha: gacha.name,
      number: counts,
    });
    await newPointLog.save();

    res.send({
      status: 1,
      prizes: res_data,
    });
  } catch (error) {
    console.log(error);

    res.send({
      status: 0,
    });
  }
});

router.post("/shipping", auth, async (req, res) => {
  const { shippingPrizes, returningPrizes, cashback, user } = req.body;

  try {
    const userData = await Users.findOne({ _id: user._id });
    const statis = await adminSchemas.GachaVisitStatus.findOne();
    if (statis.currentMaintance) return res.send({ status: 2 });
    // return all prizes
    if (shippingPrizes.length === 0) {
      let len = returningPrizes.length;
      let obtainedData = userData.obtained_prizes;
      for (let i = 0; i < len; i++) {
        let L = obtainedData.length;
        for (let j = 0; j < L; j++) {
          if (returningPrizes[i]._id == obtainedData[j]._id) {
            obtainedData.splice(j, 1);
            break;
          }
        }
      }
      userData.obtained_prizes = obtainedData;
      await userData.save();

      // add cashback of user
      userData.point_remain += cashback;
    }

    // Change obtainedPrizes status from notSelected to awaiting
    userData.obtained_prizes.forEach((obtained_prize) => {
      const found = shippingPrizes.some(
        (shippingPrize) => shippingPrize._id === obtained_prize._id.toString()
      );

      if (found) {
        // Change deliveryStatus of obtainedPrizes if a matching _id is found
        obtained_prize.deliverStatus = "awaiting";
        delete obtained_prize.selected;
      }
    });

    // update user data
    await Users.updateOne({ _id: user._id }, userData);

    const gachas = await Gacha.find()
      .sort({ order: 1, createdAt: -1 })
      .populate("category");

    res.send({ status: 1, gachas: gachas });
  } catch (error) {
    res.send({ status: 0 });
  }
});

module.exports = router;
