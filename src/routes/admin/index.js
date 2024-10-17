const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const path = require("path");
const moment = require("moment");

const uploadPrize = require("../../utils/multer/prize_multer");
const uploadPoint = require("../../utils/multer/point_multer");
const uploadRank = require("../../utils/multer/rank_multer");
const deleteFile = require("../../utils/delete");

const auth = require("../../middleware/auth");

const adminSchemas = require("../../models/admin");
const CardDeliver = require("../../models/card_delivering");
const Users = require("../../models/user");
const Gacha = require("../../models/gacha");

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
  const category = await adminSchemas.Category.find().sort("display_order");

  if (category) {
    res.send({
      status: 1,
      category: category,
    });
  } else {
    res.send({
      status: 0,
    });
  }
});

router.post("/add_category", auth, async (req, res) => {
  const { name, description } = req.body;

  if (name && description) {
    const newCategory = new adminSchemas.Category({
      name: name,
      description: description,
    });

    const saveCategory = await newCategory.save();

    if (saveCategory) {
      res.send({ status: 1, msg: "successAdded" });
    } else {
      res.send({ status: 0, msg: "failedAdded" });
    }
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
router.post("/prize_upload", uploadPrize.single("file"), async (req, res) => {
  const { id, name, rarity, cashBack, grade } = req.body;

  const prizeData = {
    name: name,
    rarity: rarity,
    cashback: cashBack,
    grade: grade,
  };

  if (id !== "") {
    if (req.file) {
      prizeData.img_url = `/uploads/prize/${req.file.filename}`;
    }
    await adminSchemas.Prize.updateOne({ _id: id }, prizeData)
      .then(() => {
        return res.send({ status: 1, msg: "successUpdated" });
      })
      .catch((err) => {
        return res.send({ status: 0, msg: "failedUpdated" });
      });
  } else {
    prizeData.img_url = `/uploads/prize/${req.file.filename}`;
    const newPrize = new adminSchemas.Prize(prizeData);
    const saved = await newPrize.save();
    if (saved) {
      res.send({
        status: 1,
        msg: "successAdded",
      });
    } else {
      res.send({
        status: 0,
        msg: "failedAdded",
      });
    }
  }
});

router.get("/get_prize", auth, async (req, res) => {
  const prize = await adminSchemas.Prize.find({ status: "unset" });

  if (prize) {
    res.send({
      status: 1,
      prize: prize,
    });
  } else {
    res.send({
      status: 0,
    });
  }
});

//new point add or update point with point image uploading
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
      pointData.img_url = `/uploads/point/${req.file.filename}`;

    if (id !== "" && id !== undefined) {
      adminSchemas.Point.findOne({ _id: id })
        .then(async (point) => {
          try {
            const filePath = path.join("./", point.img_url);
            if (req.file) {
              await deleteFile(filePath);
            }
          } catch (err) {
            console.log("point image file deleting error", err);
          }

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

router.delete("/del_prize/:id", auth, async (req, res) => {
  const id = req.params.id;

  adminSchemas.Prize.findOne({ _id: id })
    .then(async (prize) => {
      if (prize.status == "set")
        return res.send({ status: 0, msg: "Can't delete setted prize" });
      const filename = prize.img_url;
      const filePath = path.join("./", filename);
      try {
        await deleteFile(filePath);
        prize.deleteOne();
        res.send({ status: 1, msg: "successDeleted" });
      } catch (err) {
        console.error("Error deleting file:", err);
        res.status(500).send({ status: 0, msg: "failedDeleted" });
      }
    })
    .catch((err) => res.send({ status: 0, msg: "prize find error", err: err }));
});

/* Point management */
//get all registered point
router.get("/get_point", auth, async (req, res) => {
  adminSchemas.Point.find()
    .sort("point_num")
    .then((points) => {
      return res.send({ status: 1, points: points });
    })
    .catch((err) => res.send({ status: 0, err: err }));
});

//delete point with image deleting by id
router.delete("/del_point/:id", auth, (req, res) => {
  const id = req.params.id;

  adminSchemas.Point.findOne({ _id: id })
    .then(async (point) => {
      const filePath = path.join("./", point.img_url);
      try {
        await deleteFile(filePath);
      } catch (err) {
        console.log("point iamge deleting error", err);
      }
      point
        .deleteOne()
        .then(() => {
          return res.send({ status: 1 });
        })
        .catch((err) => res.send({ status: 0, err: err }));
    })
    .catch((err) => res.send({ status: 0, err: err }));
});

/* administator management */
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
    // check email is exist
    const isEmailExist = await adminSchemas.Administrator.findOne({
      email: email,
    });
    if (!cuflag && isEmailExist) {
      return res.send({ status: 0, msg: "Email already exist. Try another." });
    }

    if (adminId === undefined || adminId === "") {
      // make autority permission object
      const authorities = {
        administrators: { read: true, write: false, delete: false }, //authority for managing administrator
        users: { read: true, write: false, delete: false }, //authority for managing users
        category: { read: true, write: false, delete: false }, //authority for managing category
        prize: { read: true, write: false, delete: false }, //authority for managing prize
        gacha: { read: true, write: false, delete: false }, //authority for managing gacha
        point: { read: true, write: false, delete: false }, //authority for managing point
        delivering: { read: true, write: false, delete: false }, //authority for managing deliver
        rank: { read: true, write: false, delete: false }, //authority for managing rank
        notion: { read: true, write: false, delete: false }, //authority for managing notion
        userterms: { read: true, write: false, delete: false }, //authority for managing notion
      };

      admin_data.authority = authorities;

      // create new administrator
      await adminSchemas.Administrator.create(admin_data);
      res.send({ status: 1 });
    } else {
      // update administrator data
      await adminSchemas.Administrator.updateOne({ _id: adminId }, admin_data);
      res.send({ status: 2 });
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

//change admin authority
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

//get deliver data
router.get("/get_deliver", auth, async (req, res) => {
  CardDeliver.find()
    .then((deliver) => {
      return res.send({ status: 1, deliverData: deliver });
    })
    .catch((err) => res.send({ status: 0, err: err }));
});

router.post("/set_deliver_status", auth, async (req, res) => {
  const { id, user_id, status } = req.body;

  try {
    const deliver = await CardDeliver.findOne({ _id: id });

    if (status === "Delivering") {
      deliver.status = "Delivered";
      await deliver.save();

      const user = await Users.findOne({ _id: user_id });
      user.obtain_cards.push(deliver);
      await user.save();

      res.send({ status: 1, msg: "successUpdated" });
    } else {
      if (deliver) {
        deliver.status = "Delivering";
        const result = await deliver.save();

        if (result) {
          res.send({ status: 1, msg: "successUpdated" });
        }
      }
    }
  } catch (error) {
    res.send({ status: 0, msg: "Failed to change status." });
  }
});

// get statistics data such as total income and gacha status
router.get("/get_statistics", auth, async (req, res) => {
  try {
    const deliverCards = await CardDeliver.find();

    let totalIncome = 0;
    let pendings = 0;
    let deliverings = 0;
    let delieverd = 0;

    deliverCards.map((deliverCard) => {
      switch (deliverCard.status) {
        case "Pending":
          pendings += deliverCard.prizes.length;
          break;
        case "Delivering":
          deliverings += deliverCard.prizes.length;
          break;
        case "Delivered":
          delieverd += deliverCard.prizes.length;
          totalIncome += deliverCard.prizes.length * deliverCard.gacha_price;
          break;

        default:
          break;
      }
    });

    res.send({
      status: 1,
      totalIncome: totalIncome,
      gachaData: [pendings, deliverings, delieverd],
    });
  } catch (error) {
    res.send({ status: 0, msg: "Failed to get data." });
  }
});

// get statistics data such as total income and gacha status
router.post("/getStatusIncome", auth, async (req, res) => {
  try {
    const { status, startDate } = req.body;

    // make incomes array
    const deliverCards = await CardDeliver.find({
      status: status,
      gacha_date: { $gte: startDate },
    });

    // Create an object to hold totals by date
    const totalPriceByDate = {};

    // Iterate over the deliverCards to sum prices by date
    deliverCards.forEach((card) => {
      const dateKey = moment(card.gacha_date).format("YYYY-MM-DD"); // Format date to YYYY-MM-DD

      if (!totalPriceByDate[dateKey]) {
        totalPriceByDate[dateKey] = 0; // Initialize if it doesn't exist
      }

      totalPriceByDate[dateKey] += card.gacha_price; // Add the price to the corresponding date
    });

    // Convert the result to an array if needed
    const totalPriceArray = Object.entries(totalPriceByDate).map(
      ([date, total]) => ({ date, total })
    );

    res.send({
      status: 1,
      startDate: startDate,
      pendingIncomes: totalPriceArray,
    });
  } catch (error) {
    res.send({ status: 0, msg: "Failed to get data." });
  }
});

// save terms of service content
router.post("/save_terms", auth, async (req, res) => {
  const content = req.body.content;

  try {
    const terms = new adminSchemas.Terms({
      content: content,
    });
    await terms.save();

    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0 });
  }
});

// save terms of service content
router.get("/get_terms", async (req, res) => {
  try {
    await adminSchemas.Terms.find();
    const terms = await adminSchemas.Terms.findOne().sort({ createdAt: -1 });
    res.send({ status: 1, terms: terms });
  } catch (error) {
    res.send({ status: 0 });
  }
});

// get all  rank
router.get("/get_rank", auth, async (req, res) => {
  adminSchemas.Rank.find()
    .sort("start_amount")
    .then((ranks) => {
      return res.send({ status: 1, ranks: ranks });
    })
    .catch((err) => res.send({ status: 0, err: err }));
});

// new rank add or update rank with rank image uploading
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
      rankData.img_url = `/uploads/rank/${req.file.filename}`;
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

//delete rank with image deleting by id
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

module.exports = router;
