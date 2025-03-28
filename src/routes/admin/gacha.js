const express = require("express");
const path = require("path");
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
router.post("/pic", auth, uploadGachaDetail.single("file"), async (req, res) => {
  try {
    let gacha = await Gacha.findOne({ _id: req.body.id });
    if (!gacha) return res.send({ status: 0, msg: "failedReq" });
    gacha.detail_img_url = `uploads/gacha/detail/${req.file.filename}`;
    await gacha.save();

    res.send({ status: 1, msg: "successAdded" });
  } catch (error) {
    res.send({ status: 0, msg: "failedReq" });
  }
});

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
  const gachaid = req.params.id;
  try {
    const gachas = await Gacha.findOne({ _id: gachaid });
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
router.get("/:id", async (req, res) => {
  const gacha = await Gacha.findOne({ _id: req.params.id }).populate(
    "category"
  );
  const gachas = await Gacha.find()
    .sort({ order: 1, createdAt: -1 })
    .populate("category");

  if (gacha) res.send({ status: 1, gacha: gacha, gachas: gachas });
  else res.send({ status: 0 });
});

// get gacha by gacha category.id
router.get("/category/:id", async (req, res) => {
  const gacha = await Gacha.findOne({ _id: req.params.id }).populate(
    "category"
  );
  const data = await Gacha.find({ category: gacha.category._id });
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
  console.log("=========== set_prize =============");

  const { gachaID, prizes } = req.body;
  const gacha = await Gacha.findOne({ _id: gachaID });

  let is_err = false;

  for (let i = 0; i < prizes.length; i++) {
    const prize_item = prizes[i];

    try {
      // const prize = await adminSchemas.Prize.findOne({ _id: prize_item._id });

      console.log("============= ", i);

      if (!prize_item || !gacha) {
        is_err = true;
        break;
      }

      if (prize_item.kind === "last_prize") {
        const check = gacha.kind.filter((item) => item.value === "last_prize");
        if (!check.length) {
          is_err = true;
          break;
        }
      }

      // prize.status++;
      // prize.order = prize_item.order;
      // await prize.save();

      if (
        prize_item.kind === "last_prize" &&
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
        // gacha.show_prizes = noLastPrize;
        gacha.remain_prizes = noLastPrize;
      }

      console.log(`

      ======================================
        REMAIN_PRIZE_SIZE: ${gacha.remain_prizes.length}
      ======================================
      
      `);

      const newPrize = {
        _id: prize_item._id,
        img_url: prize_item.img_url,
        name: prize_item.name,
        cashback: prize_item.cashback,
        kind: prize_item.kind,
        trackingNumber: prize_item.trackingNumber,
        deliveryCompany: prize_item.deliveryCompany,
        status: prize_item.status,
        deliverStatus: prize_item.deliverStatus,
        createdAt: prize_item.createdAt,
        order: prize_item.order,
      };
      // gacha.show_prizes.push(newPrize);
      gacha.remain_prizes.push(newPrize);

      gacha.total_number = gacha.total_number + 1;
    } catch (error) {
      console.log(error);

      is_err = true;
      break;
    }
  }

  await gacha.save();

  if (is_err) res.send({ status: 0, msg: error });
  else res.send({ status: 1 });
});

// set rubbish to gacha
router.post("/set_rubbish", auth, async (req, res) => {
  const { gachaID, count, rubbishes } = req.body;

  is_err = false;

  const gacha = await Gacha.findOne({ _id: gachaID });

  for (let i = 0; i < rubbishes.length; i++) {
    const rubbish_item = rubbishes[i];
    try {
      if (!gacha) {
        is_err = true;
        break;
      }

      const rubbishBygacha = gacha.remain_rubbishs.find(
        (item) => item._id === rubbish_item._id
      );
      let cnt = Number(count);

      if (rubbishBygacha) {
        rubbishBygacha.count += cnt;
        gacha.rubbish_total_number += cnt;
        gacha.total_number += cnt;
        gacha.remain_rubbishs.forEach((item) => {
          if (item._id == rubbish_item._id) {
            item.order = 0;
          }
        });
        await Gacha.updateOne({ _id: gachaID }, gacha);
      } else {
        const newRubbish = {
          _id: rubbish_item._id.toString(),
          img_url: rubbish_item.img_url,
          name: rubbish_item.name,
          cashback: rubbish_item.cashback,
          nickname: rubbish_item.nickname,
          // kind: prize.kind,
          // trackingNumber: prize.trackingNumber,
          // deliveryCompany: prize.deliveryCompany,
          status: rubbish_item.status,
          // deliverStatus: prize.deliverStatus,
          createdAt: rubbish_item.createdAt,
          order: rubbish_item.order,
          count: 1,
        };
        if (cnt) newRubbish.count = cnt;
        gacha.remain_rubbishs.push(newRubbish);

        gacha.rubbish_total_number += cnt;
        gacha.total_number += cnt;
      }
    } catch (error) {
      is_err = true;
      break;
    }

    await gacha.save();
  }

  if (is_err) res.send({ status: 0, msg: error });
  else res.send({ status: 1 });
});

// unset prize from gacha
router.post("/unset_prize", auth, async (req, res) => {
  const { gachaID, prizeId } = req.body;

  try {
    const gacha = await Gacha.findOne({ _id: gachaID });
    const target = gacha.remain_prizes.find((item) => item._id == prizeId);
    if (!target) {
      return res.send({ status: 0, msg: error });
    }

    const remainPrizes = gacha.remain_prizes.filter(
      (data) => data._id != prizeId
    );

    // gacha.show_prizes = remainPrizes;
    gacha.remain_prizes = remainPrizes;
    gacha.total_number -= 1;
    await gacha.save();

    const prize = await adminSchemas.Prize.findOne({ _id: prizeId });
    prize.status--;
    await prize.save();

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
    const targetRubbish = gacha.remain_rubbishs.find(
      (item) => item._id == rubbishId
    );
    if (!targetRubbish) {
      return res.send({ status: 0, msg: error });
    }

    const count = targetRubbish.count;
    // console.log(count);
    const remainRubbishs = gacha.remain_rubbishs.filter(
      (data) => data._id != rubbishId
    );
    gacha.remain_rubbishs = remainRubbishs;
    gacha.rubbish_total_number -= count;
    gacha.total_number -= count;
    await gacha.save();

    const rubbish = await adminSchemas.Rubbish.findOne({ _id: rubbishId });
    // console.log(rubbish);
    rubbish.status -= 1;
    await rubbish.save();

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, msg: error });
  }
});

// set prizes from csv file
router.post("/upload_bulk", auth, async (req, res) => {

  console.log("dddddddddd");

  const { prizes } = req.body;

  // Function to download a file from S3

  // const bucketName = "oripacsv"; // Replace with your bucket name

  try {
    // Ensure the uploads directory exists

    let uploadDir = "uploads/prize";

    if (req.body.type == "rubbish") {
      uploadDir = "uploads/rubbish";
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    let rlt = [];
    // Create an array of promises for downloading files
    const downloadPromises = prizes.map(async (prize) => {
      // let img_els = prize.img_url.split("/");
      // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      // const fileName = img_els[img_els.length - 1];
      // const fName = uniqueSuffix + "-" + fileName;

      // const downloadPath = path.join(uploadDir, fName); // Local path to save the file

      // const filePath = prize.img_url.slice(49);

      try {
        //await downloadFile(bucketName, filePath, downloadPath); // Await the download
        //prize.img_url = downloadPath;
        if (req.body.type == "prize") {
          const newPrize = new adminSchemas.Prize(prize);
          const result = await newPrize.save();
          rlt.push(newPrize);
        }
        if (req.body.type == "rubbish") {
          const newRubbish = new adminSchemas.Rubbish(prize);
          const result = await newRubbish.save();
          rlt.push(newRubbish);
        }
      } catch (error) {
        console.error(`Failed to download or save prize ${fileName}:`, error);
        // Optionally, you can handle the error for this specific prize
      }
    });

    // Wait for all downloads to complete
    Promise.all(downloadPromises);
    res.send({ status: 1, prizes: rlt });
  } catch (err) {
    console.error("Error in upload_bulk:", err);
    res.send({
      status: 0,
      message: "An error occurred during the upload process.",
    });
  }
});

// handle draw gacha
router.post("/draw_gacha", auth, async (req, res) => {
  const { gachaID, counts, drawDate, user } = req.body;
  let countkind = counts;
  const testmode = req.headers["test"] === "true";

  try {
    const gacha = await Gacha.findOne({ _id: gachaID });
    const statis = await adminSchemas.GachaVisitStatus.findOne();
    let remainRu = [...gacha.remain_rubbishs];
    if (statis.currentMaintance) return res.send({ status: 2 });

    if (!gacha.isRelease) return res.send({ status: 0 });

    const userData = await Users.findOne({ _id: user._id });
    let drawedPrizes = [];

    if (counts === "all")
      countkind = gacha.remain_prizes.length + gacha.rubbish_total_number;
    // get poins of drwing prizes
    const drawPoints = gacha.price * countkind;

    // return if remain points is less than drawing points
    if (!testmode && userData.point_remain < drawPoints)
      return res.send({ status: 0, msg: 1 });

    /* -------- Determine ordered prizes -------- */
    // get all order prizes
    let orderprizes = gacha.remain_prizes.filter(
      (item) => item.order && item.kind !== "last_prize"
    );
    // get last one prize
    let lastOnePrize = gacha.remain_prizes.find(
      (item) => item.kind === "last_prize"
    );
    if (lastOnePrize) {
      lastOnePrize.order = gacha.total_number;
      orderprizes.push(lastOnePrize);
    }
    // Sort the array by the 'order' property
    orderprizes.sort((a, b) => {
      // Handle cases where 'order' might be undefined
      const orderA = a.order ? parseInt(a.order, 10) : Infinity; // Use Infinity for undefined
      const orderB = b.order ? parseInt(b.order, 10) : Infinity; // Use Infinity for undefined
      return orderA - orderB; // Sort in ascending order
    });
    const orderL = orderprizes.length;
    // get remain grades
    let remainGrade = gacha.remain_prizes.length + gacha.rubbish_total_number;

    for (let i = 0; i < orderL; i++) {
      const prize = orderprizes[i];
      if (gacha.total_number - remainGrade + countkind < prize.order) break;

      const video = await PrizeVideo.findOne({ kind: prize.kind });
      // Assign video URL and gacha_id to the selected prize
      prize.video = video.url;
      prize.gacha_id = gachaID;

      // Add the selected prize to the drawn prizes
      drawedPrizes.push(prize);
    }

    /* -------- Determine ordered rubbishes -------- */
    // get all order rubbishes
    let orderrubbishes = gacha.remain_rubbishs.filter(
      (item) => item.order != 0 && item.order != undefined
    );
    // Sort the array by the 'order' property
    orderrubbishes.sort((a, b) => {
      // Handle cases where 'order' might be undefined
      const orderA = a.order ? parseInt(a.order, 10) : Infinity; // Use Infinity for undefined
      const orderB = b.order ? parseInt(b.order, 10) : Infinity; // Use Infinity for undefined
      return orderA - orderB; // Sort in ascending order
    });

    const orderLRubbish = orderrubbishes.length;
    remainGrade = gacha.remain_prizes.length + gacha.rubbish_total_number;

    const rubbishVideo = await PrizeVideo.findOne({ kind: "rubbish" });
    for (let i = 0; i < orderLRubbish; i++) {
      const rubbish = orderrubbishes[i];

      if (gacha.total_number - remainGrade + countkind < rubbish.order) break;

      rubbish.kind = "rubbish";
      rubbish.video = rubbishVideo.url;
      rubbish.gacha_id = gachaID;
      gacha.rubbish_total_number -= 1;

      // Add the selected prize to the drawn prizes
      drawedPrizes.push(rubbish);
    }
    let remains = countkind - drawedPrizes.length;

    /* --------- Determine random prizes ---------- */
    // get all remain prizes order = 0
    let gradePrizes = gacha.remain_prizes.filter(
      (item) => item.order === 0 && item.kind !== "last_prize"
    );
    // get all rubbishs isn't count 0
    let remainRubbish = gacha.remain_rubbishs;
    let gradeRubbishs = remainRubbish.filter(
      (item) => item.order == 0 || item.order == undefined
    );

    // get remain prizes order = 0
    let remainPrizesNum = gradePrizes.length;
    // get total number of remain rubbishs
    let remainRubbishsNum = gradeRubbishs.length;

    // get random value as a drawPrizesNum
    let drawPrizesNum = Math.round(remains * Math.random() * Math.random());
    if (remainPrizesNum < drawPrizesNum) drawPrizesNum = remainPrizesNum;
    // get rubbish number to select

    let drawRubbishNum = remains - drawPrizesNum;
    if (gacha.rubbish_total_number < drawRubbishNum) {
      drawRubbishNum = gacha.rubbish_total_number;
      drawPrizesNum = remains - drawRubbishNum;
    }
    // add grade prizes into drawedprizs list
    for (let i = 0; i < drawPrizesNum; i++) {
      // Find the video for the selected prize
      const video = await PrizeVideo.findOne({ kind: gradePrizes[i].kind });

      // Assign video URL and gacha_id to the selected prize
      gradePrizes[i].video = video.url;
      gradePrizes[i].gacha_id = gachaID;
      prizeId.push(gradePrizes[i]._id);
      // Add the selected prize to the drawn prizes
      drawedPrizes.push(gradePrizes[i]);
    }

    // add rubbish into drawedeprizs list
    for (let i = 0; i < drawRubbishNum; i++) {
      // Find the random value;
      const id = Math.floor(Math.random() * remainRubbishsNum);

      gradeRubbishs[id].kind = "rubbish";
      gradeRubbishs[id].video = rubbishVideo.url;
      gradeRubbishs[id].gacha_id = gachaID;

      drawedPrizes.push(gradeRubbishs[id]);
      gacha.rubbish_total_number -= 1;

      gradeRubbishs[id].count -= 1;
      if (gradeRubbishs[id].count === 0) {
        gradeRubbishs.splice(id, 1);
        remainRubbishsNum--;
      }
    }

    if (!testmode) {
      // Add drawedPrizes into optainedPrizes of user

      let remainPr = gacha.remain_prizes;
      for (let i = 0; i < countkind; i++) {
        drawedPrizes[i].drawDate = drawDate;
        drawedPrizes[i].deliverStatus = "notSelected";
        userData.obtained_prizes.push(drawedPrizes[i]);

        if (drawedPrizes[i].kind == "rubbish") {
          // Assuming remainRu is an array of objects and drawedPrizes is defined
          for (let j = 0; j < remainRu.length; j++) {
            if (
              remainRu[j]._id == drawedPrizes[i]._id &&
              remainRu[j].order &&
              remainRu[j].order != undefined
            ) {
              // Decrement the count if the IDs match
              remainRu[j].count = remainRu[j].count - 1;
            }
          }
        } else {
          remainPr = remainPr.filter((item) => item._id != drawedPrizes[i]._id);
        }
      }

      // update remain rubbish
      gacha.remain_rubbishs = remainRu.filter((item) => item.count != 0);

      // update prize
      gacha.remain_prizes = remainPr;

      // Update remain points of user
      userData.point_remain -= drawPoints;

      // Update gacha & userData & rubbish
      await gacha.save();
      await userData.save();
      await Gacha.updateOne({ _id: gachaID }, gacha);

      // Add new points log
      const newPointLog = new PointLog({
        aff_id: userData.aff_id,
        user_id: userData._id,
        user_name: userData.name,
        user_country: userData.country,
        point_num: drawPoints,
        usage: "drawGacha",
        gacha: gacha.name,
        number: countkind,
      });
      await newPointLog.save();
    }
    res.send({ status: 1, prizes: drawedPrizes });
  } catch (error) {
    res.send({ status: 0 });
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
          if (
            returningPrizes[i]._id.toString() === obtainedData[j]._id.toString()
          ) {
            obtainedData.splice(j, 1);
            break;
          }
        }
      }
      userData.obtained_prizes = obtainedData;
      await userData.save();

      // add returningPrizes into remainPrizes of gacha
      // for (let i = 0; i < returningPrizes.length; i++) {
      //   const gachaID = returningPrizes[i].gacha_id;
      //   let gacha = await Gacha.findOne({ _id: gachaID });

      //   delete returningPrizes[i].selected;
      //   delete returningPrizes[i].gacha_id;
      //   delete returningPrizes[i].drawDate;
      //   delete returningPrizes[i].count
      //   delete returningPrizes[i].video;

      //   if (returningPrizes[i].kind == 'rubbish') {
      //     let len = gacha.remain_rubbishs.length;
      //     for (j = 0; j < len; j++)
      //       if (gacha.remain_rubbishs[j]._id == returningPrizes[i]._id) {
      //         gacha.remain_rubbishs[j].count += 1;
      //         break;
      //       }
      //     if (j == len) {
      //       let rub = returningPrizes[i];
      //       rub.count = 1;
      //       gacha.remain_rubbishs.push(rub);
      //     }
      //     gacha.rubbish_total_number += 1;
      //   }
      //   else {
      //     returningPrizes[i].order = 0;
      //     gacha.remain_prizes.push(returningPrizes[i]);
      //     await adminSchemas.Prize.updateOne({_id: returningPrizes[i]._id}, returningPrizes[i]);
      //   }

      //   await Gacha.updateOne({ _id: gachaID }, gacha);
      // }

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
