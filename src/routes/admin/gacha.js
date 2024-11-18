const express = require("express");
const path = require("path");
const router = express.Router();
const { ObjectId } = require("mongodb");

const auth = require("../../middleware/auth");

const uploadGacha = require("../../utils/multer/gacha_multer");
const deleteFile = require("../../utils/delete");

const Gacha = require("../../models/gacha");
const adminSchemas = require("../../models/admin");
const Users = require("../../models/user");
const PointLog = require("../../models/pointLog");
const PrizeVideo = require("../../models/prizeVideo");

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
  const { gachaId, counts, drawDate, user } = req.body;

  try {
    const gacha = await Gacha.findOne({ _id: gachaId });
    const userData = await Users.findOne({ _id: user._id });

    // get total number of remain prizes
    const remainPrizesNum = gacha.remain_prizes.length;
    // get number of drawing prizes
    const drawPrizesNum = counts === "all" ? remainPrizesNum : counts;
    // get poins of drwing prizes
    const drawPoints = gacha.price * drawPrizesNum;

    // return if remain prizes is less than drawing prizes
    if (remainPrizesNum < drawPrizesNum) return res.send({ status: 0, msg: 0 });
    // return if remain points is less than drawing points
    if (userData.point_remain < drawPoints)
      return res.send({ status: 0, msg: 1 });

    // Get drawedPrizes list randomly
    let drawedPrizes = [];
    // Create an array to keep track of available indices
    let availableIndices = Array.from(gacha.remain_prizes.keys());
    for (let i = 0; i < drawPrizesNum; i++) {
      if (availableIndices.length === 0) {
        break; // Exit if there are no more unique indices
      }

      // Get a random index from the available indices
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      const selectedIndex = availableIndices[randomIndex];

      // Find the video for the selected prize
      const video = await PrizeVideo.findOne({
        kind: gacha.remain_prizes[selectedIndex].kind,
      });

      // Assign video URL and gacha_id to the selected prize
      gacha.remain_prizes[selectedIndex].video = video.url;
      gacha.remain_prizes[selectedIndex].gacha_id = gachaId;

      // Add the selected prize to the drawn prizes
      drawedPrizes.push(gacha.remain_prizes[selectedIndex]);

      // Remove the selected index from available indices
      availableIndices.splice(randomIndex, 1);
    }

    // Add drawedPrizes into optainedPrizes of user
    for (let i = 0; i < drawedPrizes.length; i++) {
      drawedPrizes[i].drawDate = drawDate;
      userData.obtained_prizes.push(drawedPrizes[i]);

      // Remove drawedPrize from gacha remainPrizes
      gacha.remain_prizes = gacha.remain_prizes.filter(
        (prize) => prize._id !== drawedPrizes[i]._id
      );
    }

    // Update remain points of user
    userData.point_remain -= drawPoints;

    // Update gacha & userData
    await gacha.save();
    await userData.save();

    // Add new points log
    const newPointLog = new PointLog({
      aff_id: userData.aff_id,
      user_id: userData._id,
      user_name: userData.name,
      user_country: userData.country,
      point_num: drawPoints,
      usage: "drawGacha",
    });
    await newPointLog.save();

    res.send({ status: 1, prizes: drawedPrizes });
  } catch (error) {
    res.send({ status: 0 });
  }
});

router.post("/shipping", auth, async (req, res) => {
  const { shippingPrizes, returningPrizes, cashback, user } = req.body;

  try {
    const userData = await Users.findOne({ _id: user._id });

    // remove returningPrizes from obtainedPrizes of user
    for (let i = 0; i < returningPrizes.length; i++) {
      userData.obtained_prizes = userData.obtained_prizes.filter(
        (prize) => prize._id.toString() !== returningPrizes[i]._id
      );
    }
    await userData.save();

    // add returningPrizes into remainPrizes of gacha
    for (let i = 0; i < returningPrizes.length; i++) {
      const gachaId = returningPrizes[i].gacha_id;
      const gacha = await Gacha.findOne({ _id: gachaId });

      returningPrizes[i]._id = new ObjectId(returningPrizes[i]._id);
      delete returningPrizes[i].selected;
      delete returningPrizes[i].gacha_id;
      delete returningPrizes[i].drawDate;
      delete returningPrizes[i].video;
      gacha.remain_prizes.push(returningPrizes[i]);

      await Gacha.updateOne({ _id: gachaId }, gacha);
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
    // add cashback of user
    userData.point_remain += cashback;
    // update user data
    await Users.updateOne({ _id: user._id }, userData);

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0 });
  }
});

module.exports = router;
