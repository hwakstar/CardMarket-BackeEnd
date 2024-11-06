const express = require("express");
const path = require("path");
const router = express.Router();

const auth = require("../../middleware/auth");

const uploadGacha = require("../../utils/multer/gacha_multer");
const deleteFile = require("../../utils/delete");

const Gacha = require("../../models/gacha");
const adminSchemas = require("../../models/admin");
const CardDeliver = require("../../models/cardDeliver");
const Users = require("../../models/user");
const PointLog = require("../../models/pointLog");

// add gacha
router.post("/", auth, uploadGacha.single("file"), async (req, res) => {
  const { name, price, category, kind, awardRarity, order } = req.body;

  try {
    const newGacha = new Gacha({
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
    prize.status = true;
    await prize.save();

    const gacha = await Gacha.findOne({ _id: gachaId });
    switch (prize.kind) {
      case "round_number_prize":
        gacha.round_prizes.push(prize);
        break;

      case "last_prize":
        if (gacha.last_prizes.length > 0) {
          const lastPrize = gacha.last_prizes[0];
          await adminSchemas.Prize.updateOne(
            { _id: lastPrize._id.toString() },
            { status: false }
          );
          gacha.last_prizes = [];
          gacha.total_number -= 1;
        }
        gacha.last_prizes.push(prize);
        break;

      case "extra_prize":
        gacha.extra_prizes.push(prize);
        break;

      default:
        gacha.grade_prizes.push(prize);
        break;
    }
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
    switch (prize.kind) {
      case "last_prize":
        let lastPrizes = gacha.last_prizes;
        lastPrizes = lastPrizes.filter((data) => data._id != prizeId);
        gacha.last_prizes = lastPrizes;
        break;
      case "extra_prize":
        let extraPrizes = gacha.extra_prizes;
        extraPrizes = extraPrizes.filter((data) => data._id != prizeId);
        gacha.extra_prizes = extraPrizes;
        break;
      case "round_number_prize":
        let roundPrizes = gacha.round_prizes;
        roundPrizes = roundPrizes.filter((data) => data._id != prizeId);
        gacha.round_prizes = roundPrizes;
        break;

      default:
        let gradePrizes = gacha.grade_prizes;
        gradePrizes = gradePrizes.filter((data) => data._id != prizeId);
        gacha.grade_prizes = gradePrizes;
        break;
    }
    gacha.total_number -= 1;
    gacha.save();

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, msg: error });
  }

  // Gacha.findOne({ _id: gachaId })
  //   .then((gacha) => {
  //     if (last) {
  //       gacha.last_effect = true;
  //       gacha.last_prize = {};
  //     } else {
  //       let prize = gacha.remain_prizes;
  //       prize = prize.filter((data) => data._id != prizeId);
  //       gacha.remain_prizes = prize;
  //     }

  //     gacha
  //       .save()
  //       .then(() => {
  //         adminSchemas.Prize.findOne({ _id: prizeId }).then((selPrize) => {
  //           selPrize.status = "unset";
  //           selPrize.type = "";
  //           selPrize.last_effect = true;
  //           selPrize
  //             .save()
  //             .then(() => res.send({ status: 1 }))
  //             .catch((err) =>
  //               res.send({ status: 0, msg: "failedSaved", err: err })
  //             );
  //         });
  //       })
  //       .catch((err) =>
  //         res.send({ status: 0, msg: "gacha save failed.", err: err })
  //       );
  //   })
  //   .catch((err) => res.send({ status: 0, msg: "gacha not found", err: err }));
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
  const { gachaId, drawCounts, drawDate, user } = req.body;
  console.log(drawDate);
  console.log(new Date());

  try {
    // Find Gacha to draw
    const gacha = await Gacha.findOne({ _id: gachaId });

    // get total number of remain prizes
    const totalRemainPrizesNum =
      gacha.grade_prizes.length +
      gacha.extra_prizes.length +
      gacha.round_prizes.length +
      gacha.last_prizes.length;

    // get number of drawing prizes
    const drawPrizesNum =
      drawCounts === "all" ? totalRemainPrizesNum : drawCounts;

    // get poins of drwing prizes
    const drawPoints = gacha.price * drawPrizesNum;

    // get ramain poins of user
    // return if remain points is less than drawing points
    const userData = await Users.findOne({ _id: user._id });
    if (userData.point_remain < drawPoints)
      return res.send({ status: 0, msg: 0 });

    // return if remain prizes is less than drawing prizes
    if (totalRemainPrizesNum < drawCounts)
      return res.send({ status: 0, msg: 1 });

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
    //   // add poped prizes into gacha poped prize list
    //   drawedPrizes.map((drawedPrize) => gacha.poped_prizes.push(drawedPrize));
    // }

    // // Update Gacha
    // await gacha.save();

    // // New Card Deliver Data
    // const newDeliverData = new CardDeliver({
    //   user_id: userData._id,
    //   user_name: userData.name,
    //   gacha_id: gacha._id,
    //   gacha_name: gacha.name,
    //   gacha_price: gacha.price,
    //   prizes: drawedPrizes,
    //   status: "Pending",
    // });
    // await newDeliverData.save();

    // // Update user remain points
    // userData.point_remain -= drawPoints;
    // await userData.save();

    // // Add new points log
    // const newPointLog = new PointLog({
    //   user_id: userData._id,
    //   point_num: drawPoints,
    //   usage: "gacha_draw",
    //   ioFlag: 0,
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
