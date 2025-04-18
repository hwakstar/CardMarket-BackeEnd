const express = require("express");
const path = require("path");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { ObjectId } = require("mongodb");

const router = express.Router();

const uploadPrize = require("../../utils/multer/prize_multer");
const uploadRubbish = require("../../utils/multer/rubbish_multer");
const uploadPoint = require("../../utils/multer/point_multer");
const uploadRank = require("../../utils/multer/rank_multer");
const uploadLogo = require("../../utils/multer/logo_multer");
const uploadCarousel = require("../../utils/multer/carousel_multer");
const uploadPrizeVideo = require("../../utils/multer/prizevideo_multer");
const deleteFile = require("../../utils/delete");

const auth = require("../../middleware/auth");

const adminSchemas = require("../../models/admin");
const Users = require("../../models/user");
const PrizeVideo = require("../../models/prizeVideo");
const PoingLogs = require("../../models/pointLog");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await adminSchemas.Administrator.findOne({ email: email });

    if (admin && password == admin.password) {
      const payload = {
        user_id: admin._id,
        name: admin.name,
        authority: admin.authority,
        role: "admin",
      };
      const token = jwt.sign(payload, "RANDOM-TOKEN", { expiresIn: "1h" });

      res.send({ status: 1, msg: "successLogin", user: payload, token });
    } else {
      res.send({ status: 0, msg: "Password and Email is not correct." });
    }
  } catch (error) {
    res.send({ status: 0, msg: "failedReq", err: error });
  }
});

router.get("/get_admin/:id", auth, (req, res) => {
  const id = req.params.id;

  if (id) {
    adminSchemas.Administrator.findOne({ _id: id })
      .then((admin) => {
        res.send({
          status: 1,
          msg: "get User succeeded.",
          admin: {
            user_id: admin._id,
            name: admin.name,
            authority: admin.authority,
            role: "admin",
          },
        });
      })
      .catch((err) =>
        res.send({ status: 0, msg: "Get Admin failed.", err: err })
      );
  }
});

/* Category Management */
router.get("/get_category", async (req, res) => {
  const category = await adminSchemas.Category.find();

  if (category) {
    res.send({ status: 1, category: category });
  } else {
    res.send({ status: 0 });
  }
});

router.post("/add_category", auth, async (req, res) => {
  const { catId, jpName, enName, ch1Name, ch2Name, vtName } = req.body;

  try {
    const categoryData = { catId, jpName, enName, ch1Name, ch2Name, vtName };

    if (catId) {
      await adminSchemas.Category.updateOne({ _id: catId }, categoryData);
      res.send({ status: 2 });
    } else {
      const newCategory = new adminSchemas.Category(categoryData);
      await newCategory.save();
      res.send({ status: 1 });
    }
  } catch (error) {
    res.send({ status: 0 });
  }
});

router.post("/edit_category", auth, async (req, res) => {
  const { id, name, description } = req.body;

  adminSchemas.Category.findOne({ _id: id })
    .then((category) => {
      category.name = name;
      category.description = description;
      category
        .save()
        .then(() => res.send({ status: 1, msg: "successUpdated" }));
    })
    .catch((err) =>
      res.send({ status: 0, msg: "category update failed.", err: err })
    );
});

router.delete("/del_category/:id", auth, async (req, res) => {
  const id = req.params.id;

  adminSchemas.Category.deleteOne({ _id: id }).then((cat) =>
    res.send({ status: 1, msg: "successDeleted" })
  );
});

/* Prize Management */
router.post("/prize", uploadPrize.single("file"), async (req, res) => {
  const prizeData = {
    name: req.body.name,
    cashback: req.body.cashBack,
    kind: req.body.kind,
    trackingNumber: req.body.trackingNumber,
    deliveryCompany: req.body.deliveryCompany,
  };

  try {
    if (req.body.id) {
      if (req.file) {
        const prize = await adminSchemas.Prize.findOne({ _id: req.body.id });

        const filename = prize.img_url;
        const filePath = path.join("./", filename);

        prizeData.img_url = `uploads/prize/${req.file.filename}`;
      }

      const result = await adminSchemas.Prize.updateOne(
        { _id: req.body.id },
        prizeData
      );

      if (result) {
        res.send({ status: 1, msg: "successUpdated" });
      } else {
        res.send({ status: 0, msg: "failedUpdated" });
      }
    } else {
      prizeData.img_url = `uploads/prize/${req.file.filename}`;

      const newPrize = new adminSchemas.Prize(prizeData);
      const result = await newPrize.save();

      if (result) {
        res.send({ status: 1, msg: "successAdded" });
      } else {
        res.send({ status: 0, msg: "failedAdded" });
      }
    }
  } catch (error) {
    res.send({ status: 0, msg: "failedReq" });
  }
});

/* Rubbish Management */
router.post("/rubbish", uploadRubbish.single("file"), async (req, res) => {
  const rubbishData = {
    name: req.body.name,
    cashback: req.body.cashBack,
    totalNumber: req.body.totalNumber,
    nickname: req.body.nickname,
  };

  try {
    if (req.body.id) {
      if (req.file) {
        const rubbish = await adminSchemas.Rubbish.findOne({
          _id: req.body.id,
        });

        rubbishData.img_url = `uploads/rubbish/${req.file.filename}`;
      }

      const result = await adminSchemas.Rubbish.updateOne(
        { _id: req.body.id },
        rubbishData
      );

      if (result) {
        res.send({ status: 1, msg: "successUpdated" });
      } else {
        res.send({ status: 0, msg: "failedUpdated" });
      }
    } else {
      rubbishData.img_url = `uploads/rubbish/${req.file.filename}`;

      const newRubbish = new adminSchemas.Rubbish(rubbishData);
      const result = await newRubbish.save();

      if (result) {
        res.send({ status: 1, msg: "successAdded" });
      } else {
        res.send({ status: 0, msg: "failedAdded" });
      }
    }
  } catch (error) {
    res.send({ status: 0, msg: "failedReq" });
  }
});

router.get("/prize", auth, async (req, res) => {
  try {
    const prizes = await adminSchemas.Prize.aggregate([
      { $match: { gachaID: null } },
      { $sort: { createdAt: -1 } },
      { $limit: 70000 },
    ]).allowDiskUse(true);

    res.send({ status: 1, prizes: prizes });
  } catch (error) {
    console.log("💥 Get Prize Error: ", error);

    res.send({ status: 0 });
  }
});

router.get("/rubbish", auth, async (req, res) => {
  try {
    const rubbishs = await adminSchemas.Rubbish.find({
      gachaID: null,
    })
      .sort({
        createdAt: -1,
      })
      .limit(70000);

    res.send({ status: 1, rubbishs: rubbishs });
  } catch (error) {
    res.send({ status: 0 });
  }
});

router.delete("/prize/:id", auth, async (req, res) => {
  try {
    const prize = await adminSchemas.Prize.findOne({ _id: req.params.id });

    const filename = prize.img_url;
    const filePath = path.join("./", filename);

    try {
      await prize.deleteOne();
      res.send({ status: 1, msg: "successDeleted" });
    } catch (err) {
      res.send({ status: 0, msg: "failedDeleted" });
    }
  } catch (error) {
    res.send({ status: 0, msg: "failedReq" });
  }
});

router.delete("/rubbish/:id", auth, async (req, res) => {
  try {
    const rubbish = await adminSchemas.Rubbish.findOne({ _id: req.params.id });

    const filename = rubbish.img_url;
    const filePath = path.join("./", filename);

    try {
      await rubbish.deleteOne();
      res.send({ status: 1, msg: "successDeleted" });
    } catch (err) {
      res.send({ status: 0, msg: "failedDeleted" });
    }
  } catch (error) {
    res.send({ status: 0, msg: "failedReq" });
  }
});

/* Point Management */
router.post(
  "/point_upload",
  auth,
  uploadPoint.single("file"),
  async (req, res) => {
    const { id, pointNum, price } = req.body;

    const pointData = {
      point_num: pointNum,
      price: price,
    };

    if (req.file?.filename !== undefined)
      pointData.img_url = `uploads/point/${req.file.filename}`;

    if (id !== "" && id !== undefined) {
      adminSchemas.Point.findOne({ _id: id })
        .then(async (point) => {
          try {
            const filePath = path.join("./", point.img_url);
            if (req.file) {
              await deleteFile(filePath);
            }
          } catch (err) {}

          adminSchemas.Point.updateOne({ _id: id }, pointData)
            .then(() => res.send({ status: 2 }))
            .catch((err) => res.send({ status: 0, err: err }));
        })
        .catch((err) => {
          return res.send({ status: 0, err: err });
        });
    } else {
      const newPoint = new adminSchemas.Point(pointData);
      newPoint
        .save()
        .then(() => {
          res.send({
            status: 1,
          });
        })
        .catch((err) =>
          res.send({
            status: 0,
            err: err,
          })
        );
    }
  }
);

router.get("/get_point", auth, async (req, res) => {
  const statis = await adminSchemas.GachaVisitStatus.findOne();

  adminSchemas.Point.find()
    .sort("point_num")
    .then((points) => {
      return res.send({
        status: 1,
        points: points,
        isStop: statis.currentMaintance,
      });
    })
    .catch((err) => res.send({ status: 0, err: err }));
});

router.delete("/del_point/:id", auth, (req, res) => {
  const id = req.params.id;

  adminSchemas.Point.findOne({ _id: id })
    .then(async (point) => {
      const filePath = path.join("./", point.img_url);
      try {
        await deleteFile(filePath);
      } catch (err) {}
      point
        .deleteOne()
        .then(() => {
          return res.send({ status: 1 });
        })
        .catch((err) => res.send({ status: 0, err: err }));
    })
    .catch((err) => res.send({ status: 0, err: err }));
});

/* Administator management */
router.get("/get_adminList", auth, (req, res) => {
  adminSchemas.Administrator.find()
    .then((admin) => res.send({ status: 1, adminList: admin }))
    .catch((err) => res.send({ status: 0, err: err }));
});

router.post("/add_admin", async (req, res) => {
  const { adminId, name, email, password, cuflag } = req.body;

  const admin_data = {
    name: name,
    email: email,
    password: password,
  };

  try {
    if (cuflag) {
      // update administrator data
      await adminSchemas.Administrator.updateOne({ _id: adminId }, admin_data);
      res.send({ status: 2 });
    } else {
      // check email is exist
      const isEmailExist = await adminSchemas.Administrator.findOne({
        email: email,
      });

      if (isEmailExist) {
        return res.send({
          status: 0,
          msg: "Email already exist. Try another.",
        });
      }

      const authorities = {
        administrators: { read: true, write: false, delete: false },
        users: { read: true, write: false, delete: false },
        carousel: { read: true, write: false, delete: false },
        category: { read: true, write: false, delete: false },
        coupon: { read: true, write: false, delete: false },
        prizeVideo: { read: true, write: false, delete: false },
        prize: { read: true, write: false, delete: false },
        rubbish: { read: true, write: false, delete: false },
        gacha: { read: true, write: false, delete: false },
        point: { read: true, write: false, delete: false },
        delivering: { read: true, write: false, delete: false },
        rank: { read: true, write: false, delete: false },
        userterms: { read: true, write: false, delete: false },
      };
      admin_data.authority = authorities;
      // create new administrator
      await adminSchemas.Administrator.create(admin_data);
      res.send({ status: 1 });
    }
  } catch (error) {
    res.send({ status: 0, err: error });
  }
});

router.delete("/del_admin/:id", auth, (req, res) => {
  const id = req.params.id;

  adminSchemas.Administrator.deleteOne({ _id: id })
    .then(() => res.send({ status: 1 }))
    .catch((err) => res.send({ status: 0, err: err }));
});

router.post("/chang_auth", auth, async (req, res) => {
  const { adminId, authority } = req.body;

  try {
    const admin = await adminSchemas.Administrator.findOne({ _id: adminId });
    admin.authority = authority;
    await admin.save();
    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, msg: "failedUpdated", err: error });
  }
});

/* Deliever management */
router.get("/deliveries", auth, async (req, res) => {
  try {
    let prizes = await adminSchemas.GachaTicketSchema.aggregate(
      // Pipeline
      [
        // Stage 1
        {
          $match: {
            // enter query here
            sold: true,
            deliverStatus: { $ne: "returned" },
          },
        },

        // Stage 2
        {
          $lookup: {
            from: "users",
            localField: "userID",
            foreignField: "_id",
            as: "userDetails",
          },
        },

        // Stage 3
        {
          $unwind: "$userDetails",
        },

        // Stage 4
        {
          $lookup: {
            from: "shipAddress",
            localField: "userID",
            foreignField: "user_id",
            as: "shipAddress",
          },
        },

        // Stage 5
        {
          $unwind: {
            path: "$shipAddress",
            preserveNullAndEmptyArrays: true,
          },
        },

        // Stage 6
        {
          $project: {
            // specifications
            _id: 1,
            userName: "$userDetails.name",
            userEmail: "$userDetails.email",
            shipAddress: {
              $cond: {
                if: { $gt: [{ $size: { $ifNull: ["$shipAddress", []] } }, 0] }, // Check if shipAddress is not empty
                then: "$shipAddress",
                else: null, // or you can set it to an empty object {}
              },
            },
            prizeName: "$name",
            prizeImg: "$img_url",
            prizeKind: "$kind",
            prizeType: "$type",
            prizeTrackingNumber: "$trackingNumber",
            prizeDeliveryCompany: "$deliveryCompany",
            prizeDeliverStatus: "$deliverStatus",
            prizeDeliverTime: "$deliveryTime",
          },
        },
      ],

      // Options
      {}

      // Created with Studio 3T, the IDE for MongoDB - https://studio3t.com/
    );

    res.send({ status: 1, prizes: prizes });
  } catch (error) {
    console.log("💥 Delivery Error: ", error);
    res.send({ status: 0, err: error });
  }
});

router.post("/changeDeliverStatus", auth, async (req, res) => {
  const { ticketId } = req.body;
  try {
    let dd = await adminSchemas.GachaTicketSchema.updateOne(
      { _id: ticketId },
      { deliverStatus: "shipped", deliveryTime: Date.now() }
    );

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, msg: "Failed to change status." });
  }
});

// get statistics data such as total income and gacha status
router.post("/statistics", auth, async (req, res) => {
  const { pendingStartDate, deliveringStartDate } = req.body;

  try {
    // get total income (purchase points)
    const pointLogs = await PoingLogs.aggregate([
      { $match: { usage: "purchasePoints" } },
      { $group: { _id: null, totalPoints: { $sum: "$point_num" } } },
    ]);

    const users = await Users.find();

    // ? get prize status
    let pendings = await adminSchemas.GachaTicketSchema.find({
      deliverStatus: "notSelected",
    }).count();
    let deliverings = await adminSchemas.GachaTicketSchema.find({
      deliverStatus: "awaiting",
    }).count();

    let periodPendings = [];
    let periodDeliverings = [];
    users.map((user) => {
      for (let i = 0; i < user.obtained_prizes.length; i++) {
        const prize = user.obtained_prizes[i];

        if (
          prize.deliverStatus === "awaiting" &&
          prize.drawDate > pendingStartDate
        )
          periodPendings.push(prize);
        if (
          prize.deliverStatus === "shipped" &&
          prize.drawDate > deliveringStartDate
        )
          periodDeliverings.push(prize);
      }
    });
    const gachaVisitStatus = await adminSchemas.GachaVisitStatus.findOne();
    const currentStatus = {
      gacha: gachaVisitStatus.currentGacha,
      invite: gachaVisitStatus.currentInvite,
    };
    const maintance = gachaVisitStatus.currentMaintance;

    res.send({
      status: 1,
      totalIncome: pointLogs[0] ? pointLogs[0].totalPoints : 0,
      prizeStatus: [pendings, deliverings],
      periodPendings,
      periodDeliverings,
      currentStatus: currentStatus,
      maintance: maintance,
    });
  } catch (error) {
    res.send({ status: 0, msg: "Failed to get data." });
  }
});

// save Gacha visit status
router.post("/gachastatus", auth, async (req, res) => {
  const current = req.body.current;

  try {
    const gachaVisitStatus = await adminSchemas.GachaVisitStatus.findOne();
    gachaVisitStatus.currentGacha = current.gacha;
    gachaVisitStatus.currentInvite = current.invite;
    await gachaVisitStatus.save();
    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0 });
  }
});

// save Maintance mode status
router.post("/maintance", auth, async (req, res) => {
  const current = req.body.current;

  try {
    const gachaVisitStatus = await adminSchemas.GachaVisitStatus.findOne();
    gachaVisitStatus.currentMaintance = current;
    await gachaVisitStatus.save();

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0 });
  }
});

// save terms of service content
router.post("/save_terms", auth, async (req, res) => {
  const content = req.body.content;
  const lang = req.body.lang;

  try {
    const terms = new adminSchemas.Terms({
      lang: lang,
      content: content,
    });
    await terms.save();

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0 });
  }
});

// save terms of service content
router.get("/terms/:lang", async (req, res) => {
  const lang = req.params.lang;

  try {
    const terms = await adminSchemas.Terms.findOne({ lang: lang }).sort({
      createdAt: -1,
    });

    res.send({ status: 1, terms: terms });
  } catch (error) {
    res.send({ status: 0 });
  }
});

/* Rank management */
// get all
router.get("/get_rank", auth, async (req, res) => {
  adminSchemas.Rank.find()
    .sort("start_amount")
    .then((ranks) => {
      return res.send({ status: 1, ranks: ranks });
    })
    .catch((error) => res.send({ status: 0, error: error }));
});

// add or update
router.post("/rank_save", auth, uploadRank.single("file"), async (req, res) => {
  const { id, name, bonus, start_amount, end_amount, last } = req.body;

  try {
    const rankData = {
      name: name,
      bonus: bonus,
      start_amount: start_amount,
      end_amount: end_amount,
      last: JSON.parse(last),
    };

    if (req.file?.filename !== undefined) {
      rankData.img_url = `uploads/rank/${req.file.filename}`;
    }

    if (id !== "" && id !== undefined) {
      const rank = await adminSchemas.Rank.findOne({ _id: id });

      if (rankData.img_url && rank.img_url) {
        const filePath = path.join("./", rank.img_url);
        await deleteFile(filePath);
      }

      await adminSchemas.Rank.updateOne({ _id: id }, rankData);
      res.send({ status: 2 });
    } else {
      const newRank = new adminSchemas.Rank(rankData);
      await newRank.save();
      res.send({ status: 1 });
    }
  } catch (error) {
    res.send({ status: 0, msg: error });
  }
});

//delete
router.delete("/del_rank/:id", auth, async (req, res) => {
  const id = req.params.id;

  try {
    const rank = await adminSchemas.Rank.findOne({ _id: id });

    if (rank.img_url) {
      const filePath = path.join("./", rank.img_url);
      await deleteFile(filePath);
    }

    await adminSchemas.Rank.deleteOne({ _id: id });
    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, msg: error });
  }
});

/* Theme management */
// change color
router.post("/changeBgColor", auth, async (req, res) => {
  const { bgColor } = req.body;

  try {
    const themes = await adminSchemas.Themes.find();
    if (themes.length === 0) {
      // create new theme data
      const newTheme = adminSchemas.Themes({ bgColor: bgColor });
      await newTheme.save();
    } else {
      await adminSchemas.Themes.updateOne(
        { _id: themes[0] },
        { bgColor: bgColor }
      );
    }

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, msg: error });
  }
});

// change logo
router.post(
  "/changeLogo",
  auth,
  uploadLogo.single("file"),
  async (req, res) => {
    try {
      let logoUrl;
      if (req.file?.filename !== undefined) {
        logoUrl = `uploads/logo/${req.file.filename}`;
      }

      const themes = await adminSchemas.Themes.find();
      if (themes.length === 0) {
        // create new theme data
        const newTheme = adminSchemas.Themes({ logoUrl: logoUrl });
        await newTheme.save();
      } else {
        await adminSchemas.Themes.updateOne(
          { _id: themes[0] },
          { logoUrl: logoUrl }
        );
      }

      res.send({ status: 1 });
    } catch (error) {
      res.send({ status: 0, msg: error });
    }
  }
);

// get theme
router.get("/getThemeData", async (req, res) => {
  try {
    const themes = await adminSchemas.Themes.find();
    if (themes.length > 0) {
      res.send({ status: 1, theme: themes[0] });
    } else {
      res.send({ status: 0, msg: error });
    }
  } catch (error) {
    res.send({ status: 0, msg: error });
  }
});

/* Carousel management */
// add or update
router.post(
  "/carousel",
  auth,
  uploadCarousel.single("file"),
  async (req, res) => {
    const { id, link } = req.body;
    const carouselData = { link: link };

    try {
      if (req.file?.filename !== undefined)
        carouselData.img_url = `uploads/carousel/${req.file.filename}`;

      if (id !== "" && id !== undefined) {
        const carousel = await adminSchemas.Carousels.findOne({ _id: id });
        const filePath = path.join("./", carousel.img_url);
        if (req.file) {
          await deleteFile(filePath);
        }

        await adminSchemas.Carousels.updateOne({ _id: id }, carouselData);
        res.send({ status: 2 });
      } else {
        const newCarousel = new adminSchemas.Carousels(carouselData);
        await newCarousel.save();
        res.send({ status: 1 });
      }
    } catch (error) {
      res.send({ status: 0 });
    }
  }
);

// get all
router.get("/get_carousels", async (req, res) => {
  try {
    const carousels = await adminSchemas.Carousels.find();
    return res.send({ status: 1, carousels: carousels });
  } catch (error) {
    res.send({ status: 0, err: error });
  }
});

// delete
router.delete("/del_carousel/:id", auth, async (req, res) => {
  const id = req.params.id;
  try {
    const carousel = await adminSchemas.Carousels.findOne({ _id: id });

    if (carousel.img_url) {
      const filePath = path.join("./", carousel.img_url);
      if (filePath) await deleteFile(filePath);
    }
    await carousel.deleteOne();
    return res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, err: error });
  }
});

/* Prize video management */
// add or update
router.post(
  "/prizeVideo",
  auth,
  uploadPrizeVideo.single("file"),
  async (req, res) => {
    const vidData = { kind: req.body.kind };

    try {
      const existVidData = await PrizeVideo.findOne({ kind: req.body.kind });

      // if (existVidData) {
      //   const filePath = path.join("./", existVidData.url);
      //   if (filePath) await deleteFile(filePath);

      //   await existVidData.deleteOne();
      // }

      if (req.file) vidData.url = `uploads/prizeVideo/${req.body.kind}`;

      const newPrizeVideo = new PrizeVideo(vidData);
      await newPrizeVideo.save();

      existVidData ? res.send({ status: 2 }) : res.send({ status: 1 });
    } catch (error) {
      console.log("💥 Setting Prize Video Error: ", error);
      res.send({ status: 0 });
    }
  }
);

// get all
router.get("/get_prizeVideos", async (req, res) => {
  try {
    const prizeVideos = await PrizeVideo.find();

    return res.send({ status: 1, prizeVideos: prizeVideos });
  } catch (error) {
    res.send({ status: 0, err: err });
  }
});

// delete
router.delete("/del_prizeVideo/:id", auth, async (req, res) => {
  const id = req.params.id;

  try {
    const prizeVideo = await PrizeVideo.findOne({ _id: id });

    // if (prizeVideo.url) {
    //   const filePath = path.join("./", prizeVideo.url);
    //   if (filePath) await deleteFile(filePath);
    // }
    await prizeVideo.deleteOne();

    return res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, err: error });
  }
});

// Coupon management
const generateRandomCode = (length = 6) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let randomCode = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * letters.length);
    randomCode += letters[randomIndex];
  }
  return randomCode;
};

router.post("/coupon", auth, async (req, res) => {
  const { name, cashBack, allow, flag, code } = req.body;
  let randomCode = generateRandomCode();
  while (1) {
    const newcode = await adminSchemas.Coupon.findOne({ code: randomCode });
    if (newcode === null) break;
    randomCode = generateRandomCode();
  }

  try {
    const couponData = {
      name: name,
      code: randomCode,
      cashback: cashBack,
      allow: allow,
    };
    if (!flag) {
      const newCategory = new adminSchemas.Coupon(couponData);
      await newCategory.save();
      res.send({ status: 1, msg: "successAdded" });
    } else {
      couponData.code = code;
      await adminSchemas.Coupon.updateOne({ code: code }, couponData);
      res.send({ status: 1, msg: "successUpdated" });
    }
  } catch (error) {
    if (!flag) res.send({ status: 0, msg: "failedAdded" });
    else res.send({ status: 0, msg: "failedUpdated" });
  }
});

// get all
router.get("/coupon", async (req, res) => {
  try {
    const coupons = await adminSchemas.Coupon.find();

    return res.send({ status: 1, coupons: coupons });
  } catch (error) {
    res.send({ status: 0, err: err });
  }
});

// delete
router.delete("/coupon/:id", auth, async (req, res) => {
  const id = req.params.id;

  try {
    const coupon = await adminSchemas.Coupon.findOne({ _id: id });
    await coupon.deleteOne();

    return res.send({ status: 1, msg: "successDeleted" });
  } catch (error) {
    res.send({ status: 0, msg: "failedReq" });
  }
});

router.get("/popup_rate", auth, async (req, res) => {
  let popupRate = await adminSchemas.PopupRate.findOne();
  res.send({ status: 1, rate: popupRate });
});

router.post("/popup_update", auth, async (req, res) => {
  await adminSchemas.PopupRate.findOneAndUpdate(
    {},
    {
      $set: {
        ...req.body,
      },
    }
  );

  res.send({ status: 1 });
});

module.exports = router;
