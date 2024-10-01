const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const router = express.Router();

const auth = require("../../middleware/auth");
const Users = require("../../models/user");
const adminSchemas = require("../../models/admin");
const PointLog = require("../../models/point_log");
const CardDeliver = require("../../models/card_delivering");
const Gacha = require("../../models/gacha");
const RegisterByLinkModel = require("../../affiliate/models/RegisterByLinkModel");

router.post("/register", async (req, res) => {
  const { name, email, password, affId } = req.body;

  try {
    // check email exist
    const isEmailExist = await Users.findOne({ email: email });
    if (isEmailExist) {
      return res.send({ status: 0, msg: "Email already exist." });
    }

    // hass password
    const hashedPassword = await bcrypt.hash(password, 10);
    // create new user model
    const newUser = new Users({
      name: name,
      email: email,
      hashedPass: hashedPassword,
      aff_id: affId,
    });
    // save new user into db
    const result = await newUser.save();

    // if new user is someone invited by affiliate
    // add affiliate status for register counts
    if (affId) {
      const registerByLink = new RegisterByLinkModel({
        aff_id: affId,
        user_id: result._id
      });
      await registerByLink.save();
      // add Reward Points to affiliate
    }

    res.send({
      status: 1,
      msg: "User Created Successfully",
      result,
    });
  } catch (error) {
    res.status(500).send({ message: "Error creating user", error });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let payload;

  const admin = await adminSchemas.Administrator.findOne({ email: email });

  if (admin) {
    if (password == admin.password) {
      payload = {
        user_id: admin._id,
        name: admin.name,
        authority: admin.authority,
        role: "admin",
      };
      const token = jwt.sign(payload, "RANDOM-TOKEN", { expiresIn: "1h" });

      res.send({
        status: 1,
        msg: "Login Successful",
        user: payload,
        token,
      });
    } else {
      res.send({ status: 0, msg: "Password and Email is not correct." });
    }
  } else {
    try {
      const user = await Users.findOne({ email: email });

      if (!user.active) {
        return res.send({
          status: 0,
          msg: "Your account has withdrawn. Please log in with another account.",
        });
      }

      const checkPass = await bcrypt.compare(password, user.hashedPass);
      if (!checkPass) {
        return res.send({
          status: 0,
          msg: "Password and Email is not correct.",
        });
      }

      payload = {
        _id: user._id,
        user_id: user._id,
        name: user.name,
        email: user.email,
        point_remain: user.point_remain,
      };
      const token = jwt.sign(payload, "RANDOM-TOKEN", {
        expiresIn: "1h",
      });

      res.send({
        status: 1,
        msg: "Login Successful",
        user: payload,
        token,
      });
    } catch (error) {
      res.send({
        status: 0,
        msg: "Password and Email is not correct.",
        err: error,
      });
    }
  }
});

router.get("/get_user/:id", auth, (req, res) => {
  const id = req.params.id;

  if (id) {
    Users.findOne({ _id: id })
      .then((user) => {
        res.send({
          status: 1,
          msg: "get User succeeded.",
          user: {
            _id: user._id,
            name: user.name,
            point_remain: user.point_remain,
          },
        });
      })
      .catch((err) =>
        res.send({ status: 0, msg: "get User failed.", err: err })
      );
  }
});

router.get("/get_userList", auth, (req, res) => {
  Users.find()
    .then((users) => res.send({ status: 1, userList: users }))
    .catch((err) => res.send({ status: 0, err: err }));
});

router.get("/get_point_log/:id", auth, (req, res) => {
  const id = req.params.id;

  PointLog.find({ user_id: id })
    .then((log) => res.send({ status: 1, pointLog: log }))
    .catch((err) => res.send({ status: 0, err: err }));
});

//save user data from user profile page
router.post("/save_user", auth, (req, res) => {
  const userData = req.body;
  Users.updateOne({ _id: userData._id }, userData)
    .then(() => res.send({ status: 1 }))
    .catch((err) => res.send({ status: 0, err: err }));
});

//get deliver data by user id
router.get("/get_deliver/:user_id", auth, async (req, res) => {
  const user_id = req.params.user_id;
  const delievers = await CardDeliver.find({
    user_id: user_id,
    status: { $ne: "Delivered" },
  });

  if (delievers) {
    res.send({ status: 1, deliver: delievers });
  } else {
    res.send({ status: 0, msg: "Something went wrong", err: err });
  }
});

router.get("/get_cards/:user_id", auth, (req, res) => {
  const user_id = req.params.user_id;
  Users.findOne({ _id: user_id })
    .then((user) => res.send({ status: 1, cards: user.obtain_cards }))
    .catch((err) => res.send({ status: 0, err: err }));
});

//return obtained prizes
router.post("/return_prize", auth, async (req, res) => {
  try {
    const { deliver_id, prize_id } = req.body;

    // Find Card that has Returned Prize from Deliver List
    const deliver = await CardDeliver.findOne({ _id: deliver_id });

    // Remove ReturnedPrize from the prizes List of Pending Card
    const updatedDeliverPrizes = deliver.prizes.filter(
      (prize) => prize._id.toString() !== prize_id
    );
    deliver.prizes = updatedDeliverPrizes;

    if (deliver.prizes.length === 0) {
      await deliver.deleteOne();
    } else {
      await deliver.save();
    }

    // Find Gacha that has ReturnedPrize from Gacha List
    const gacha = await Gacha.findOne({ _id: deliver.gacha_id });

    // Add ReturnedPrize into Remain Prizes List of Gacha
    const popedPrize = gacha.poped_prizes.find(
      (prize) => prize._id.toString() === prize_id
    );
    gacha.remain_prizes.push(popedPrize);

    // Remove Returned Prize from PopedPrizes List of Gacha
    const updatedPopedPrizes = gacha.poped_prizes.filter(
      (prize) => prize._id.toString() !== prize_id
    );
    gacha.poped_prizes = updatedPopedPrizes;

    // Save updated gacha
    await gacha.save();

    // Change PointRemain of User
    const user = await Users.findOne({ _id: deliver.user_id });
    user.point_remain += popedPrize.cashback;
    await user.save();

    res.send({ status: 1, msg: "Successfully returned your card." });
  } catch (error) {
    res.send({ status: 0, msg: "Failed to return the card.", err: error });
  }
});

router.delete("/del_user/:id", auth, (req, res) => {
  const id = req.params.id;

  Users.deleteOne({ _id: id })
    .then(() => res.send({ status: 1 }))
    .catch((err) => res.send({ status: 0, err: err }));
});

router.post("/withdraw_user", auth, (req, res) => {
  const user_id = req.body.user_id;

  Users.updateOne({ _id: user_id }, { active: false })
    .then(() => res.send({ status: 1 }))
    .catch((err) => res.send({ status: 0, err: err }));
});

module.exports = router;
