const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const uploadPrize = require("../../utils/multer/prize_multer");
const uploadPoint = require("../../utils/multer/point_multer");
const path = require("path");
const auth = require("../../middleware/auth");
const adminSchemas = require("../../models/admin");
const CardDeliver = require("../../models/card_delivering");
const Users = require("../../models/user");
const deleteFile = require("../../utils/delete");
const Gacha = require("../../models/gacha");
const config = require('../../../config')

router.get("/admin_test", (req, res) => {
  res.send("amdin test is sucessful.");
});

/* Category Management */
router.get("/get_category", async (req, res) => {
  const category = await adminSchemas.Category.find().sort("display_order");
  if (category) {
    // console.log(category)
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
  console.log("Category name", name);
  if (name && description) {
    const newCategory = new adminSchemas.Category({
      name: name,
      description: description,
    });
    const saveCategory = await newCategory.save();
    if (saveCategory) {
      res.send({ status: 1, msg: "New category added." });
    } else {
      res.send({ status: 0, msg: "Failed to add." });
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
        .then(() =>
          res.send({ status: 1, msg: "Category updated successfully." })
        );
    })
    .catch((err) =>
      res.send({ status: 0, msg: "category update failed.", err: err })
    );
});
router.delete("/del_category/:id", auth, async (req, res) => {
  const id = req.params.id;
  console.log("del_id", id);
  adminSchemas.Category.deleteOne({ _id: id }).then((cat) =>
    res.send({ status: 1, msg: "Deleted!" })
  );
});

/* Prize Management */
router.post("/prize_upload", uploadPrize.single("file"), async (req, res) => {
  const { id, name, rarity, cashBack } = req.body;
  const prizeData = {
    name: name,
    rarity: rarity,
    cashback: cashBack,
  };
  if (req.file == null || req.file == undefined) {
    return res.send({ status: 2, msg: "file is not selected." });
  }
  prizeData.img_url = `/uploads/prize/${req.file.filename}`;
  console.log("req.file", req.file);

  if (id != "") {
    console.log("update id----->", id);
    await adminSchemas.Prize.updateOne({ _id: id }, prizeData)
      .then((res) => {
        return res.send({ status: 1, msg: "Updated successfully." });
      })
      .catch((err) => {
        return res.send({ status: 0, msg: "Update failed" });
      });
  } else {
    const newPrize = new adminSchemas.Prize(prizeData);
    const saved = await newPrize.save();
    if (saved) {
      res.send({
        status: 1,
        msg: "New prize added",
      });
    } else {
      res.send({
        status: 0,
        msg: "Prize save failed.",
      });
    }
  }
});
router.get("/get_prize", auth, async (req, res) => {
  const prize = await adminSchemas.Prize.find();
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
router.delete("/del_prize/:id", auth, async (req, res) => {
  const id = req.params.id;
  adminSchemas.Prize.findOne({ _id: id })
    .then(async (prize) => {
      if (prize.status == "set")
        return res.send({ status: 0, msg: "Can't delete setted prize" });
      const filename = prize.img_url;
      const filePath = path.join("./", filename);
      console.log("filepath------->", filePath);
      try {
        await deleteFile(filePath);
        prize.deleteOne();
        res.send({ status: 1, msg: "prize deleted successfully." });
      } catch (err) {
        console.error("Error deleting file:", err);
        res.status(500).send({ status: 0, msg: "Error deleting file" });
      }
    })
    .catch((err) =>
      res.send({ status: 0, msg: "prize find error", err: err })
    );
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
    if (req.file?.filename != undefined)
      pointData.img_url = `/uploads/point/${req.file.filename}`;

    if (id != "" && id != undefined) {
      console.log("update id----->", id);
      adminSchemas.Point.findOne({ _id: id })
        .then(async (point) => {
          try {
            const filePath = path.join("./", point.img_url);
            await deleteFile(filePath);
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

router.post("/add_admin", auth, (req, res) => {
  const { adminId, name, email, password } = req.body;

  const admin_data = {
    name: name,
    email: email,
    password: password,
  };
  authority = {}
  const admin_authority = config.admin_authority;
  for (key in admin_authority) {
    let item = admin_authority[key];
    authority[item] = 1;  //set read authority by default
  }
  admin_data.authority = authority;
  console.log("admin_data", admin_data);
  if (adminId == undefined || adminId == "") {
    adminSchemas.Administrator.create(admin_data)
      .then(() => res.send({ status: 1 }))
      .catch((err) => res.send({ status: 0, err: err }));
  } else {
    console.log("admin update");
    adminSchemas.Administrator.updateOne({ _id: adminId }, admin_data)
      .then(() => res.send({ status: 2 }))
      .catch((err) => res.send({ status: 0, err: err }));
  }
});

router.delete("/del_admin/:id", auth, (req, res) => {
  const id = req.params.id;
  adminSchemas.Administrator.deleteOne({ _id: id })
    .then(() => res.send({ status: 1 }))
    .catch((err) => res.send({ status: 0, err: err }));
});


//change admin authority
router.post("/chang_auth", auth, (req, res) => {
  const {adminId, authority} = req.body;
  adminSchemas.Administrator.findOne({_id: adminId}).then((admin) => {
      admin.authority = authority;
      admin.save().then(() => res.send({status: 1})).catch(() => res.send({status: 0}))
  }).catch((err) => res.send({status: 0, msg: "Not Found Admin", err: err}))
})

//get deliver data
router.get("/get_deliver", auth,  async (req, res) => {
  CardDeliver.find()
    .then((deliver) => {
      return res.send({ status: 1, deliverData: deliver });
    })
    .catch((err) => res.send({ status: 0, err: err }));
});

router.post("/set_deliver_status", auth, async (req, res) => {
  const { id, user_id, status } = req.body;
  if (status == "delivering") {
    const deliver = await CardDeliver.findOne({ _id: id });
    Users.findOne({ _id: user_id })
      .then((user) => {
        user.obtain_cards.push(deliver);
        user
          .save()
          .then(() => res.send({ status: 1 }))
          .catch((err) => res.send({ status: 0, err: err }));
      })
      .catch((err) => res.send({ status: 0, msg: "Not Found User" }));
    await CardDeliver.deleteOne({ _id: id });
  } else
    CardDeliver.findOne({ _id: id })
      .then((deliver) => {
        deliver.status = "delivering";
        deliver
          .save()
          .then(() => res.send({ status: 1 }))
          .catch((err) => res.send({ status: 0, err: err }));
      })
      .catch((err) => res.send({ status: 0, err: err }));
});
module.exports = router;
