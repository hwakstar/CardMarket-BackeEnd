const express = require("express");
const path = require("path");
const router = express.Router();
const Gacha = require("../../models/gacha");
const auth = require("../../middleware/auth");
const uploadGacha = require("../../utils/multer/gacha_multer");
const deleteFile = require("../../utils/delete");
const adminSchemas = require("../../models/admin");
const CardDeliver = require("../../models/card_delivering");
const User = require("../../models/user");
const PointLog = require("../../models/point_log");

//Gacha add
router.post("/add", auth, uploadGacha.single("file"), async (req, res) => {
  const { name, price, totalNum, category } = req.body;
  if (req.file == null || req.file == undefined) {
    res.send({ status: 2, msg: "file is not selected." });
  }
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
router.post("/upload_bulk", auth, (req, res) => {
  const { gachaId, prizes } = req.body;

  adminSchemas.Prize.create(prizes)
    .then((prize) => {
      Gacha.findOne({ _id: gachaId })
        .then((gacha) => {
          console.log("added prizes", prize);
          if (gacha.remain_prizes.length > 0) {
            let temp = gacha.remain_prizes;
            console.log("temp", temp);
            temp.push(prize);
            gacha.remain_prizes = temp;
          } else gacha.remain_prizes = prize;

          gacha
            .save()
            .then((res) => {
              res.send({ status: 1, msg: "upload prizes successfully." });
            })
            .catch((err) =>
              res.send({ status: 0, msg: "upload prizes failed.", err: err })
            );
        })
        .catch((err) =>
          res.send({ status: 0, msg: "Not Found Gacha", err: err })
        );
    })
    .catch((err) =>
      res.send({ status: 0, msg: "Invalid Prizes Data", err: err })
    );
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
  const { gachaId, prizeId, flag } = req.body;

  Gacha.findOne({ _id: gachaId })
    .then((gacha) => {
      if (flag === -1) gacha.last_prize = {};
      else {
        let prize = gacha.remain_prizes;
        console.log("prize set");
        prize = prize.filter((data) => data._id != prizeId);
        console.log("filtered prize-->", prize);
        gacha.remain_prizes = prize;
      }
      gacha
        .save()
        .then(() => {
          adminSchemas.Prize.findOne({ _id: prizeId }).then((selPrize) => {
            console.log("sel selPrize", selPrize);
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
router.post("/set_prize", auth, (req, res) => {
  const { isLastPrize, gachaId, prizeId } = req.body;
  Gacha.findOne({ _id: gachaId })
    .then((gacha) => {
      adminSchemas.Prize.findOne({ _id: prizeId })
        .then(async (prize) => {
          prize.status = "set";
          await prize.save();
          if (isLastPrize) {
            if (gacha.last_prize) {
              console.log("last prize", gacha.last_prize);
              await adminSchemas.Prize.updateOne(
                { _id: gacha.last_prize._id },
                { status: "unset" }
              );
            }
            gacha.last_prize = prize;
          } else gacha.remain_prizes.push(prize);
          gacha
            .save()
            .then(() => res.send({ status: 1 }))
            .catch((err) =>
              res.send({ status: 0, msg: "gacha save failed.", err: err })
            );
        })
        .catch((err) =>
          res.send({ status: 0, msg: "Not found Prize", err: err })
        );
    })
    .catch((err) => res.send({ status: 0, msg: "Not found gacha", err: err }));
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
  const { gachaId, draw, user } = req.body;
  if (user.role == "admin")
    return res.send({ status: 0, msg: "Can't Draw as Admin" });
  const userData = await User.findOne({ _id: user.user_id });
  Gacha.findOne({ _id: gachaId })
    .then((gacha) => {
      const drawPoint = gacha.price * draw;
      //return if the point is not enough
      if (userData.point_remain < drawPoint)
        return res.send({ status: 0, msg: "point not enough" });
      //return if the inventory is not enough
      console.log("prizenum", gacha.remain_prizes.length);
      if (gacha.remain_prizes.length < draw)
        return res.send({ status: 0, msg: "Not enough inventory" });
      //gacha draw with droprate
      let popPrize = [];
      for (let i = 0; i < draw; i++) {
        const index = Math.floor(Math.random() * gacha.remain_prizes.length);
        // console.log("index", index);
        popPrize.push(gacha.remain_prizes[index]); //poped prize
        // console.log("popPrize", popPrize);
        //remove popPrize from gacha remain_prize list
        gacha.remain_prizes = gacha.remain_prizes.filter(
          (prize) => prize._id != popPrize[i]._id
        );
        //add popPrize to gacha poped_prize
        gacha.poped_prizes.push(gacha.remain_prizes[index]);
      }
      gacha
        .save()
        .then(() => {
          console.log("gacha saved");
          adminSchemas.Prize.deleteMany({ _id: popPrize._id }) //remove from prizelist
            .then(() => {
              //new deliverData
              const newDeliverData = new CardDeliver({
                user_id: userData._id,
                user_name: userData.name,
                gacha_id: gacha._id,
                gacha_name: gacha.name,
                prizes: popPrize,
                status: "pending",
              });
              console.log(newDeliverData);
              newDeliverData.save().then(() => {
                userData.point_remain -= drawPoint;
                userData
                  .save()
                  .then(() => {
                    //new point log data
                    const newPointLog = new PointLog({
                      user_id: userData._id,
                      point_num: drawPoint,
                      usage: "Gacha Draw",
                      ioFlag: 0,
                    });
                    newPointLog
                      .save()
                      .then(() =>
                        res.send({
                          status: 1,
                          msg: "gachaDraw Success.",
                          prizes: popPrize,
                        })
                      )
                      .catch((err) =>
                        res.send({
                          status: 0,
                          msg: "Point log save failed.",
                          err: err,
                        })
                      );
                  })
                  .catch((err) =>
                    res.send({ status: 0, msg: "User save failed." })
                  );
              });
            })
            .catch((err) => res.send("remove Prizelist failed"));
        })
        .catch((err) =>
          res.send({ status: 0, msg: "gacha save failed", err: err })
        );
    })
    .catch({ status: 0, msg: "gacha not found" });
});
module.exports = router;
