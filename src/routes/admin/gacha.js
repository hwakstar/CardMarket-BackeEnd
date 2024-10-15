const express = require("express");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const path = require("path");
const router = express.Router();

const auth = require("../../middleware/auth");

const uploadGacha = require("../../utils/multer/gacha_multer");
const deleteFile = require("../../utils/delete");

const Gacha = require("../../models/gacha");
const adminSchemas = require("../../models/admin");
const CardDeliver = require("../../models/card_delivering");
const Users = require("../../models/user");
const PointLog = require("../../models/point_log");

//Gacha add
router.post("/add", auth, uploadGacha.single("file"), async (req, res) => {
  const { name, price, totalNum, category } = req.body;

  const newGacha = new Gacha({
    name: name,
    price: price,
    total_number: totalNum,
    category: category,
    gacha_thumnail_url: `/uploads/gacha/${req.file.filename}`,
    create_date: Date.now(),
  });

  const saved = await newGacha.save();
  if (saved) {
    res.send({ status: 1, msg: "New Gacha Saved successfully." });
  } else res.send({ status: 0, msg: "Gacha Save failed." });
});

//set prizes from csv file
router.post("/upload_bulk", auth, async (req, res) => {
  try {
    const { gachaId, prizes } = req.body;

    let newPrizes = await adminSchemas.Prize.create(prizes);
    let gacha = await Gacha.findOne({ _id: gachaId });

    if (gacha.remain_prizes.length > 0) {
      let remainPrizes = gacha.remain_prizes;
      newPrizes.map((newPrize) => remainPrizes.push(newPrize));
      gacha.remain_prizes = remainPrizes;
    } else gacha.remain_prizes = newPrizes;

    await gacha.save();
    res.send({ status: 1, msg: "Upload prizes successfully." });
  } catch (error) {
    res.send({ status: 0, msg: "Upload prizes failed." });
  }
});

//get all registered gachas
router.get("/", async (req, res) => {
  await Gacha.find()
    .sort({ create_date: -1 })
    .then((gachalist) => {
      res.send({ status: 1, gachaList: gachalist });
    })
    .catch((err) => {
      res.send({ status: 0, err: err });
    });
});

//get gacha by id
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  await Gacha.find({ _id: id })
    .then((gacha) => {
      res.send({ status: 1, gacha: gacha });
    })
    .catch((err) => {
      res.send({ status: 0, err: err });
    });
});

//get prizes setted to gacha by id
router.get("/get_prize/:id", auth, (req, res) => {
  const id = req.params.id;

  Gacha.findOne({ _id: id })
    .then((gacha) => {
      res.send({ status: 1, prizeList: gacha.remain_prizes });
    })
    .catch((err) => res.send({ status: 0, err: err }));
});

//set gacah release
router.get("/set_release/:id", auth, (req, res) => {
  const id = req.params.id;

  Gacha.findOne({ _id: id })
    .then((gacha) => {
      gacha.isRelease = !gacha.isRelease;
      gacha.save().then(() => res.send({ status: 1 }));
    })
    .catch((err) => res.send({ status: 0, msg: "Not Found Gacha", err: err }));
});

//unset prize from gacha
router.post("/unset_prize", auth, (req, res) => {
  const { gachaId, prizeId, last } = req.body;

  Gacha.findOne({ _id: gachaId })
    .then((gacha) => {
      if (last) {
        gacha.last_effect = true;
        gacha.last_prize = {};
      } else {
        let prize = gacha.remain_prizes;
        prize = prize.filter((data) => data._id != prizeId);
        gacha.remain_prizes = prize;
      }

      gacha
        .save()
        .then(() => {
          adminSchemas.Prize.findOne({ _id: prizeId }).then((selPrize) => {
            selPrize.status = "unset";
            selPrize.type = "";
            selPrize.last_effect = true;
            selPrize
              .save()
              .then(() => res.send({ status: 1 }))
              .catch((err) =>
                res.send({ status: 0, msg: "Prize save failed.", err: err })
              );
          });
        })
        .catch((err) =>
          res.send({ status: 0, msg: "gacha save failed.", err: err })
        );
    })
    .catch((err) => res.send({ status: 0, msg: "gacha not found", err: err }));
});

//set prize to gacha
router.post("/set_prize", auth, async (req, res) => {
  try {
    const { isLastPrize, lastEffect, gachaId, prizeId } = req.body;

    const gacha = await Gacha.findOne({ _id: gachaId });

    const prize = await adminSchemas.Prize.findOne({ _id: prizeId });
    prize.status = "set";

    // if the request is to change last effect
    if (lastEffect === 1) {
      prize.last_effect = !prize.last_effect;
      gacha.last_effect = !gacha.last_effect;
      await prize.save();
      gacha.last_prize = prize;
    } else if (isLastPrize) {
      prize.type = "last";
      await prize.save();

      if (gacha.last_prize) {
        await adminSchemas.Prize.updateOne(
          { _id: gacha.last_prize._id },
          { status: "unset" }
        );
      }
      gacha.last_prize = prize;
    } else {
      await prize.save();
      gacha.remain_prizes.push(prize);
    }

    await gacha.save();
    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, msg: error });
  }
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  Gacha.findOne({ _id: id })
    .then(async (gacha) => {
      const filePath = path.join("./", gacha.gacha_thumnail_url);
      try {
        await deleteFile(filePath);
        gacha.deleteOne();
        res.send({ status: 1 });
      } catch (err) {
        res.send({ status: 0, err: err });
      }
    })
    .catch((err) => {
      res.send({ status: 0, msg: "Delete failed!", error: err });
    });
});

//handle draw gacha
router.post("/draw_gacha", auth, async (req, res) => {
  const { gachaId, drawCounts, user } = req.body;

  try {
    // return if user admin
    if (user.role == "admin") return res.send({ status: 0, msg: 0 });

    // Find Gacha to draw
    const gacha = await Gacha.findOne({ _id: gachaId });
    let existLastFlag = false;
    const lastEffect = gacha.last_effect;

    // return if drawpoints is less than remain points
    const drawPoints = gacha.price * drawCounts;
    const userData = await Users.findOne({ _id: user.user_id });
    if (userData.point_remain < drawPoints)
      return res.send({ status: 0, msg: 1 });

    // calculate remain prizes count
    const remainPrizeCounts =
      !gacha.last_prize || Object.entries(gacha.last_prize).length === 0
        ? gacha.remain_prizes.length
        : gacha.remain_prizes.length + 1;

    // return if remain prizes is less than drawing prizes
    if (remainPrizeCounts < drawCounts) return res.send({ status: 0, msg: 3 });

    // Draw gach by rarity (random currently) and add it into poped prize
    let drawedPrizes = [];
    // if draw counts and remain prize counts are the same
    if (drawCounts === remainPrizeCounts) {
      // if gacha has last prize, add last prize into drawedPrizes
      if (gacha.last_prize && Object.entries(gacha.last_prize).length !== 0) {
        drawedPrizes.push(gacha.last_prize);
        gacha.last_prize = {};
        gacha.last_effect = true;
        existLastFlag = true;
      }
    }

    // if remain prize is exist, add all remaining prizes into popped prize
    if (gacha.remain_prizes.length > 0) {
      // check last prize exist
      const counts =
        gacha.last_prize &&
        Object.entries(gacha.last_prize).length !== 0 &&
        drawCounts >= remainPrizeCounts
          ? drawCounts - 1
          : drawCounts;

      for (let i = 0; i < counts; i++) {
        // Get drawedPrizes list
        const index = Math.floor(Math.random() * gacha.remain_prizes.length);
        drawedPrizes.push(gacha.remain_prizes[index]);

        // Remove drawedPrize from gacha remain_prize list
        gacha.remain_prizes = gacha.remain_prizes.filter(
          (prize) => prize._id != drawedPrizes[i]._id
        );
      }
      // add poped prizes into gacha poped prize list
      drawedPrizes.map((drawedPrize) => gacha.poped_prizes.push(drawedPrize));
    }

    // Update Gacha
    await gacha.save();

    // New Card Deliver Data
    const newDeliverData = new CardDeliver({
      user_id: userData._id,
      user_name: userData.name,
      gacha_id: gacha._id,
      gacha_name: gacha.name,
      gacha_price: gacha.price,
      prizes: drawedPrizes,
      status: "Pending",
    });
    await newDeliverData.save();

    // Update user remain points
    userData.point_remain -= drawPoints;
    await userData.save();

    // Add new points log
    const newPointLog = new PointLog({
      user_id: userData._id,
      point_num: drawPoints,
      usage: "gacha_draw",
      ioFlag: 0,
    });
    await newPointLog.save();

    res.send({
      status: 1,
      prizes: drawedPrizes,
      existLastFlag: existLastFlag,
      lastEffect: lastEffect,
    });
  } catch (error) {
    res.send({ status: 0, msg: "Failed to draw", err: error });
  }
});

module.exports = router;
