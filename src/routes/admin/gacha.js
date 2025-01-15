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
const Rubbish = require('../../models/rubbish');

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
  const { gachaId, prizeId, order } = req.body;

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

    const newPrize = {
      _id: prize._id,
      img_url: prize.img_url,
      name: prize.name,
      cashback: prize.cashback,
      kind: prize.kind,
      trackingNumber: prize.trackingNumber,
      deliveryCompany: prize.deliveryCompany,
      status: prize.status,
      deliverStatus: prize.deliverStatus,
      createdAt: prize.createdAt,
    };
    if (order) newPrize.order = order;

    gacha.remain_prizes.push(newPrize);
    if (order != 0) gacha.total_number += 1;
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
    const targetPrize = gacha.remain_prizes.find((item) => item._id == prizeId);
    const order = targetPrize.order;

    const remainPrizes = gacha.remain_prizes.filter(
      (data) => data._id != prizeId
    );
    gacha.remain_prizes = remainPrizes;
    if (order != 0) gacha.total_number -= 1;
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
    const rubbish = await Rubbish.find();

    // get total number of remain prizes
    const remainPrizesNum = gacha.remain_prizes.filter(
      (item) => item.order != 0
    ).length;
    // get total number of rubbish
    let rubbishNum = rubbish.length;
    // get number of drawing prizes
    let drawPrizesNum = counts === "all" ? remainPrizesNum : counts;

    // get random value as a drawPrizesNum
    drawPrizesNum = Math.floor(counts * Math.random() * 0.3);
    if (rubbishNum < counts - drawPrizesNum) drawPrizesNum = counts - rubbishNum;
    // get rubbish number to select
    const drawRubbishNum = counts - drawPrizesNum;
    // get poins of drwing prizes
    const drawPoints = gacha.price * drawPrizesNum;

    // return if remain prizes is less than drawing prizes
    if (remainPrizesNum < drawPrizesNum) return res.send({ status: 0, msg: 0 });
    // return if remain points is less than drawing points
    if (userData.point_remain < drawPoints)
      return res.send({ status: 0, msg: 1 });

    // Get drawedPrizes list randomly
    let drawedPrizes = [];
    // get all prizes isn't last one
    const gradePrizes = gacha.remain_prizes.filter(
      (item) => item.kind !== "last_prize" && item.order != 0
    );

    // Sort the array by the 'order' property
    gradePrizes.sort((a, b) => {
      // Handle cases where 'order' might be undefined
      const orderA = a.order ? parseInt(a.order, 10) : Infinity; // Use Infinity for undefined
      const orderB = b.order ? parseInt(b.order, 10) : Infinity; // Use Infinity for undefined

      return orderA - orderB; // Sort in ascending order
    });

    // get last one prize
    const lastOnePrize = gacha.remain_prizes.find(
      (item) => item.kind === "last_prize"
    );

    // add last one prize into drawedPrizes
    if (
      lastOnePrize &&
      drawPrizesNum ===
        gacha.remain_prizes.filter((item) => item.order != 0).length
    ) {
      // Find the video for the selected prize
      const video = await PrizeVideo.findOne({ kind: "last_prize" });
      lastOnePrize.video = video.url;
      lastOnePrize.gacha_id = gachaId;

      gradePrizes.push(lastOnePrize);
    }

    // add grade prizes into drawedprizs list
    for (let i = 0; i < drawPrizesNum; i++) {
      // Find the video for the selected prize
      const video = await PrizeVideo.findOne({
        kind: gradePrizes[i].kind,
      });

      // Assign video URL and gacha_id to the selected prize
      gradePrizes[i].video = video.url;
      gradePrizes[i].gacha_id = gachaId;

      // Add the selected prize to the drawn prizes
      drawedPrizes.push(gradePrizes[i]);
    }

    // Remove rubbish container
    let removeRubbish = [];
    // add rubbish into drawedeprizs list
    for (let i = 0; i < drawRubbishNum; i++) {
      // Find the random value;
      const id = Math.floor(Math.random() *  rubbishNum);

      // Add the selected rubbish to the drawn prizes
      drawedPrizes.push(rubbish[i]);
      
      rubbish[i].total_number -= 1;
      if (!rubbish[i].total_number) {
        removeRubbish.push(rubbish[i]);
        rubbish.splice(id, 1); 
        rubbishNum--;
      }
    }

    // Update Rubbish
    let reRubNum = removeRubbish.length;
    for (let i = 0; i < rubbishNum; i++)  await Rubbish.updateOne({ _id: rubbish[i]._id }, { total_number: rubbish[i].total_number });
    for (let i = 0; i < reRubNum; i++) await Rubbish.deleteOne({_id: removeRubbish[i]._id});

    // Add drawedPrizes into optainedPrizes of user
    for (let i = 0; i < drawedPrizes.length; i++) {
      drawedPrizes[i].drawDate = drawDate;
      userData.obtained_prizes.push(drawedPrizes[i]);

      // Remove drawedPrize from gacha remainPrizes
      if (i < drawPrizesNum) {
        gacha.remain_prizes = gacha.remain_prizes.filter(
          (prize) => prize._id !== drawedPrizes[i]._id
        );
      }
    }

    // Update remain points of user
    userData.point_remain -= drawPoints;

    // Update gacha & userData & rubbish
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

    // return all prizes
    if (shippingPrizes.length === 0) {
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

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0 });
  }
});

module.exports = router;
