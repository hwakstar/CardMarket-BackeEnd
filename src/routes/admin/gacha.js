const express = require("express");
const path = require("path");
const router = express.Router();

const auth = require("../../middleware/auth");

const uploadGacha = require("../../utils/multer/gacha_multer");
const deleteFile = require("../../utils/delete");

const Gacha = require("../../models/gacha");
const adminSchemas = require("../../models/admin");
const CardDeliver = require("../../models/card_delivering");
const User = require("../../models/user");
const PointLog = require("../../models/point_log");

//Gacha add
router.post("/add", auth, uploadGacha.single("file"), async (req, res) => {
  const { name, price, totalNum, category } = req.body;

  const newGacha = new Gacha({
    name: name,
    price: price,
    total_number: totalNum,
    category: category,
    gacha_thumnail_url: `/uploads/gacha_thumnail/${req.file.filename}`,
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
      if (last) gacha.last_prize = {};
      else {
        let prize = gacha.remain_prizes;
        prize = prize.filter((data) => data._id != prizeId);
        gacha.remain_prizes = prize;
      }
      gacha
        .save()
        .then(() => {
          adminSchemas.Prize.findOne({ _id: prizeId }).then((selPrize) => {
            selPrize.status = "unset";
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
    const { isLastPrize, gachaId, prizeId } = req.body;

    const gacha = await Gacha.findOne({ _id: gachaId });
    const prize = await adminSchemas.Prize.findOne({ _id: prizeId });
    prize.status = "set";
    await prize.save();

    if (isLastPrize) {
      if (gacha.last_prize) {
        await adminSchemas.Prize.updateOne(
          { _id: gacha.last_prize._id },
          { status: "unset" }
        );
      }
      gacha.last_prize = prize;
    } else gacha.remain_prizes.push(prize);

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
  try {
    const { gachaId, drawCounts, user } = req.body;

    // Return if user is Admin
    if (user.role === "admin")
      return res.send({ status: 0, msg: "Can't Draw as Admin" });

    // Find Gacha to draw
    const gacha = await Gacha.findOne({ _id: gachaId });

    // Return if the inventory is not enough
    if (gacha.remain_prizes.length < drawCounts)
      return res.send({ status: 0, msg: "Not enough inventory" });

    // Draw gach by rarity (random currently)
    let popedPrizes = [];
    for (let i = 0; i < drawCounts; i++) {
      // Get popedPrizes list
      const index = Math.floor(Math.random() * gacha.remain_prizes.length);
      popedPrizes.push(gacha.remain_prizes[index]);

      // Remove popedPrize from gacha remain_prize list
      gacha.remain_prizes = gacha.remain_prizes.filter(
        (prize) => prize._id != popedPrizes[i]._id
      );
    }
    // Add popedPrize to gacha poped_prize
    popedPrizes.map((popedPrize) => gacha.poped_prizes.push(popedPrize));

    // Update Gacha
    await gacha.save();

    // Remove popedPrizes from the prize list
    // const newPrize = await adminSchemas.Prize.deleteMany({ _id: popedPrizes._id });

    // Find User draing gacha
    const userData = await User.findOne({ _id: user.user_id });

    // New Card Deliver Data
    const newDeliverData = new CardDeliver({
      user_id: userData._id,
      user_name: userData.name,
      gacha_id: gacha._id,
      gacha_name: gacha.name,
      gacha_price: gacha.price,
      prizes: popedPrizes,
      status: "Pending",
    });
    await newDeliverData.save();

    // Update user remain points
    const drawPoints = gacha.price * drawCounts;
    userData.point_remain -= drawPoints;
    await userData.save();

    // Add new points log
    const newPointLog = new PointLog({
      user_id: userData._id,
      point_num: drawPoints,
      usage: "Gacha Draw",
      ioFlag: 0,
    });
    await newPointLog.save();

    res.send({
      status: 1,
      msg: "Successfully drawing gacha.",
      prizes: popedPrizes,
    });
  } catch (error) {
    res.send({ status: 0, msg: "Failed to draw", err: error });
  }
});

module.exports = router;
