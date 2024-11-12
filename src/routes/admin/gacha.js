const express = require("express");
const path = require("path");
const router = express.Router();

const auth = require("../../middleware/auth");

const uploadGacha = require("../../utils/multer/gacha_multer");
const deleteFile = require("../../utils/delete");

const Gacha = require("../../models/gacha");
const adminSchemas = require("../../models/admin");
const Users = require("../../models/user");
const CardDeliver = require("../../models/cardDeliver");
const PointLog = require("../../models/pointLog");

// add gacha
router.post("/", auth, uploadGacha.single("file"), async (req, res) => {
  const { type, name, price, category, kind, awardRarity, order } = req.body;

  try {
    const newGacha = new Gacha({
      type: type,
      name: name,
      price: price,
      category: category,
      kind: kind,
      award_rarity: awardRarity,
      order: order,
      img_url: `uploads/gacha/${req.file.filename}`,
    });

    const result = await newGacha.save();
    if (result) res.send({ status: 1, msg: "successAdded" });
    else res.send({ status: 0, msg: "failedAdded" });
  } catch (error) {
    res.send({ status: 0, msg: "failedReq" });
  }
});

// get all gachas
router.get("/", async (req, res) => {
  const gachas = await Gacha.find()
    .sort({ order: 1, createdAt: -1 })
    .populate("category");

  if (gachas) res.send({ status: 1, gachaList: gachas });
  else res.send({ status: 0 });
});

// get gacha by id
router.get("/:id", async (req, res) => {
  const gacha = await Gacha.findOne({ _id: req.params.id }).populate(
    "category"
  );

  if (gacha) res.send({ status: 1, gacha: gacha });
  else res.send({ status: 0 });
});

// delete gacha
router.delete("/:id", async (req, res) => {
  try {
    const gacha = await Gacha.findOne({ _id: req.params.id });
    const filePath = path.join("./", gacha.img_url);

    try {
      await deleteFile(filePath);
      gacha.deleteOne();

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
  const { gachaId, prizeId } = req.body;

  try {
    const prize = await adminSchemas.Prize.findOne({ _id: prizeId });
    const gacha = await Gacha.findOne({ _id: gachaId });

    prize.status = true;
    await prize.save();

    if (
      prize.kind === "last_prize" &&
      gacha.remain_prizes.some((prize) => prize.kind === "last_prize")
    ) {
      const lastPrize = gacha.remain_prizes.find(
        (prize) => prize.kind === "last_prize"
      );
      await adminSchemas.Prize.updateOne(
        { _id: lastPrize._id },
        { status: false }
      );
      gacha.total_number -= 1;

      const noLastPrize = gacha.remain_prizes.filter(
        (prize) => prize.kind !== "last_prize"
      );
      gacha.remain_prizes = noLastPrize;
    }
    gacha.remain_prizes.push(prize);
    gacha.total_number += 1;
    await gacha.save();

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, msg: error });
  }
});

// unset prize from gacha
router.post("/unset_prize", auth, async (req, res) => {
  const { gachaId, prizeId } = req.body;

  try {
    const prize = await adminSchemas.Prize.findOne({ _id: prizeId });
    prize.status = false;
    await prize.save();

    const gacha = await Gacha.findOne({ _id: gachaId });
    const remainPrizes = gacha.remain_prizes.filter(
      (data) => data._id != prizeId
    );
    gacha.remain_prizes = remainPrizes;
    gacha.total_number -= 1;
    gacha.save();

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, msg: error });
  }
});

// set prizes from csv file
router.post("/upload_bulk", auth, async (req, res) => {
  const { prizes } = req.body;

  try {
    const newPrizes = await adminSchemas.Prize.create(prizes);

    newPrizes.map(async (prize) => {
      await prize.save();
    });

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0 });
  }
});

// handle draw gacha
router.post("/draw_gacha", auth, async (req, res) => {
  const { gachaId, counts, user } = req.body;

  try {
    // Find Gacha to draw
    const gacha = await Gacha.findOne({ _id: gachaId });

    // get total number of remain prizes
    const remainPrizesNum = gacha.remain_prizes.length;
    // get number of drawing prizes
    const drawPrizesNum = counts === "all" ? remainPrizesNum : counts;
    // get poins of drwing prizes
    const drawPoints = gacha.price * drawPrizesNum;
    // get draw date time of server
    const drawDate = new Date();

    // return if remain prizes is less than drawing prizes
    if (remainPrizesNum < drawPrizesNum) return res.send({ status: 0, msg: 0 });
    // return if remain points is less than drawing points
    if (user.point_remain < drawPoints) return res.send({ status: 0, msg: 1 });

    // Draw prize of gach by rarity (random currently) and add it into poped prize
    // let drawedPrizes = [];
    // // if draw counts and remain prize counts are the same
    // if (drawCounts === remainPrizeCounts) {
    //   // if gacha has last prize, add last prize into drawedPrizes
    //   if (gacha.last_prize && Object.entries(gacha.last_prize).length !== 0) {
    //     drawedPrizes.push(gacha.last_prize);
    //     gacha.last_prize = {};
    //     gacha.last_effect = true;
    //     existLastFlag = true;
    //   }
    // }

    // // if remain prize is exist, add all remaining prizes into popped prize
    // if (gacha.remain_prizes.length > 0) {
    //   // check last prize exist
    //   const counts =
    //     gacha.last_prize &&
    //     Object.entries(gacha.last_prize).length !== 0 &&
    //     drawCounts >= remainPrizeCounts
    //       ? drawCounts - 1
    //       : drawCounts;

    //   for (let i = 0; i < counts; i++) {
    //     // Get drawedPrizes list
    //     const index = Math.floor(Math.random() * gacha.remain_prizes.length);
    //     drawedPrizes.push(gacha.remain_prizes[index]);

    //     // Remove drawedPrize from gacha remain_prize list
    //     gacha.remain_prizes = gacha.remain_prizes.filter(
    //       (prize) => prize._id != drawedPrizes[i]._id
    //     );
    //   }
    // }

    // // Update Gacha
    // await gacha.save();

    // New Card Deliver Data
    const userData = await Users.findOne({ _id: user._id });

    // Update remain points of user
    // userData.point_remain -= drawPoints;
    // await userData.save();

    // const newDeliver = new CardDeliver({
    //   user_id: userData._id,
    //   user_name: userData.name,
    //   gacha_id: gacha._id,
    //   gacha_name: gacha.name,
    //   gacha_price: gacha.price,
    //   prizes: drawedPrizes,
    //   status: "Pending",
    // });
    // await newDeliver.save();

    // Add new points log
    // const newPointLog = new PointLog({
    //   user_id: userData._id,
    //   point_num: drawPoints,
    //   usage: "drawGacha",
    // });
    // await newPointLog.save();

    res.send({
      status: 1,
      // prizes: drawedPrizes,
      // existLastFlag: existLastFlag,
      // lastEffect: lastEffect,
    });
  } catch (error) {
    res.send({ status: 0 });
  }
});

module.exports = router;
