const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

const router = express.Router();

const auth = require("../../middleware/auth");
const Users = require("../../models/user");
const adminSchemas = require("../../models/admin");
const PointLog = require("../../models/pointLog");
const RegisterModel = require("../../affiliate/models/RegisterModel");
const AffUsers = require("../../affiliate/models/UsersModel");
const Blogs = require("../../models/blog");
const ShippingAddress = require("../../models/shipAddress");
const AffRanks = require("../../affiliate/models/RankModel");
const EarnModel = require("../../affiliate/models/EarnModel");
const AffPayment = require("../../affiliate/models/PaymentModel");

const uploadBlog = require("../../utils/multer/blog_multer");
const userRankData = require("../../utils/userRnkData");

router.post("/register", async (req, res) => {
  const { name, country, email, password, affId, linkId } = req.body;

  try {
    // check email exist
    const isEmailExist = await Users.findOne({ email: email });
    if (isEmailExist) {
      return res.send({ status: 0, msg: "exsitEmail" });
    }

    // hass password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create new user object
    const userObj = {
      name: name,
      country: country,
      email: email,
      hashedPass: hashedPassword,
    };

    // add affiliate id if user introduced by affiliate
    if (affId) userObj.aff_id = affId;

    // add new rank id
    const userRank = await adminSchemas.Rank.findOne({ start_amount: 0 });
    userObj.rank_id = userRank._id;

    // save new user into db
    const newUser = await new Users(userObj).save();

    // if new user is someone invited by affiliate
    if (affId && linkId) {
      // add affiliate status for register counts
      const registerByLink = new RegisterModel({
        aff_id: affId,
        link_id: linkId,
        user_id: newUser._id,
      });
      await registerByLink.save();

      // get affiliate's rank data
      const affUser = await AffUsers.findOne({ _id: affId });
      let affRank;
      if (affUser.rank) {
        affRank = await AffRanks.findOne({ _id: affUser.rank });
      } else {
        affRank = await AffRanks.findOne({ start_amount: 0 });
      }

      // add register reward to affiliate
      const registerCommission = affRank.register_commission;

      // add payment for affiliate
      const affPayment = await AffPayment.findOne({
        aff_id: affId,
        kind: "Withdrawable",
      });
      if (affPayment) {
        // update withdrawable balance
        affPayment.price += registerCommission;
        await affPayment.save();
      } else {
        // create new withdrawable balance
        const newAffPayment = new AffPayment({
          aff_id: affId,
          price: registerCommission,
          kind: "Withdrawable",
        });
        await newAffPayment.save();
      }

      // add deposit rewards to affiliate
      const newAffEarn = new EarnModel({
        aff_id: affId,
        link_id: linkId,
        reward: registerCommission,
        kind: "register",
      });
      await newAffEarn.save();
    }

    res.send({ status: 1, msg: "successRegistered" });
  } catch (error) {
    res.send({ status: 0, msg: "failedReq" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Users.findOne({ email: email });

    if (!user) return res.send({ status: 0, msg: "invalidLoginInfo" });
    if (!user.active) return res.send({ status: 0, msg: "withdrawedAccount" });

    const checkPass = await bcrypt.compare(password, user.hashedPass);
    if (!checkPass) return res.send({ status: 0, msg: "invalidLoginInfo" });

    // make user data for token
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      point_remain: user.point_remain,
      shipAddress_id: user.shipAddress_id,
      address: user.address,
      city: user.city,
      country: user.country,
    };

    // get rank data
    const rank = await userRankData(user._id);
    userData.rankData = rank;

    const token = jwt.sign(userData, "RANDOM-TOKEN", { expiresIn: "1h" });

    res.send({ status: 1, msg: "successLogin", user: userData, token });
  } catch (error) {
    res.send({ status: 0, msg: "failedReq", err: error });
  }
});

router.post("/changePwd", auth, async (req, res) => {
  const { currentPwd, newPwd } = req.body;

  try {
    const user = await Users.findOne({ _id: req.body.user._id });

    // check current password
    const checkPass = await bcrypt.compare(currentPwd, user.hashedPass);
    if (!checkPass) {
      return res.send({ status: 2 });
    }

    // hass password
    const hashedPassword = await bcrypt.hash(newPwd, 10);
    user.hashedPass = hashedPassword;
    await user.save();
    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, err: error });
  }
});

router.get("/get_user/:id", auth, async (req, res) => {
  const id = req.params.id;

  try {
    // create user data
    const user = await Users.findOne({ _id: id });
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      point_remain: user.point_remain,
      shipAddress_id: user.shipAddress_id,
      address: user.address,
      city: user.city,
      country: user.country,
    };

    // get rank data
    const rank = await userRankData(user._id, user.rank_id);
    userData.rankData = rank;

    res.send({
      status: 1,
      msg: "get User succeeded.",
      user: userData,
    });
  } catch (error) {
    res.send({ status: 0, msg: "failedReq", error: error });
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
router.post("/update_user", auth, async (req, res) => {
  const userData = req.body;

  try {
    await Users.updateOne({ _id: userData._id }, userData);
    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, err: error });
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

// blog router
router.post("/blog", auth, uploadBlog.single("file"), async (req, res) => {
  const { author, title, content, parent_id } = req.body;

  try {
    const newBlog = new Blogs({
      author,
      title,
      content,
    });

    if (parent_id) {
      newBlog.parent_id = parent_id;
    }

    if (req.file?.filename !== undefined)
      newBlog.img_url = `uploads/blog/${req.file.filename}`;

    await newBlog.save();

    const blogs = await Blogs.find({ parent_id: undefined })
      .sort({ createdAt: -1 })
      .populate("author");

    let comments;
    if (parent_id) {
      comments = await Blogs.find({ parent_id: parent_id })
        .sort({ createdAt: -1 })
        .populate("author");
    }

    res.send({
      status: 1,
      msg: `${parent_id ? "successComment" : "successBlog"}.`,
      blogs: blogs,
      comments: comments,
    });
  } catch (error) {
    res.send({ status: 0, msg: "Failed to post blog.", err: error });
  }
});

router.get("/blog/:blogId", async (req, res) => {
  const blogId = req.params.blogId;
  let blogs;
  let comments;

  if (blogId === "0") {
    blogs = await Blogs.find({ parent_id: undefined })
      .sort({ createdAt: -1 })
      .populate("author");
  } else {
    blogs = await Blogs.findOne({ _id: blogId });
    comments = await Blogs.find({ parent_id: blogId })
      .sort({ createdAt: -1 })
      .populate("author");
  }

  try {
    res.send({ status: 1, blogs: blogs, comments: comments });
  } catch (error) {
    res.send({ status: 0, msg: "Something went wrong.", err: error });
  }
});

// get all shipping address of user
router.get("/shipping_address/:user_id", auth, async (req, res) => {
  const user_id = req.params.user_id;

  try {
    const shippingAddress = await ShippingAddress.find({ user_id: user_id });
    res.send({ status: 1, shippingAddress: shippingAddress });
  } catch (error) {
    res.send({ status: 0 });
  }
});

// add or update shipping addresss of user
router.post("/shipping_address", auth, async (req, res) => {
  const { update, shipAddress } = req.body;

  try {
    if (update) {
      const updateData = {
        country: shipAddress.country,
        lastName: shipAddress.lastName,
        firstName: shipAddress.firstName,
        lastNameKana: shipAddress.lastNameKana,
        firstNameKana: shipAddress.firstNameKana,
        postCode: shipAddress.postCode,
        prefecture: shipAddress.prefecture,
        address: shipAddress.address,
        building: shipAddress.building,
        phoneNumber: shipAddress.phoneNumber,
        addressLine1: shipAddress.addressLine1,
        addressLine2: shipAddress.addressLine2,
        districtCity: shipAddress.districtCity,
        cityTown: shipAddress.cityTown,
        cityDistrict: shipAddress.cityDistrict,
        islandCity: shipAddress.islandCity,
        suburbCity: shipAddress.suburbCity,
        state: shipAddress.state,
        stateProvinceRegion: shipAddress.stateProvinceRegion,
      };

      await ShippingAddress.updateOne({ _id: shipAddress._id }, updateData);
    } else {
      const newData = new ShippingAddress(shipAddress);
      await newData.save();
    }

    res.send({ status: 1, update });
  } catch (error) {
    res.send({ status: 0 });
  }
});

// set shipping address of user
router.post("/set_shipping_address", auth, async (req, res) => {
  const { userId, shipAddressId } = req.body;

  try {
    await Users.updateOne({ _id: userId }, { shipAddress_id: shipAddressId });
    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0 });
  }
});

// delete shipping address of user
router.delete("/del_shipping_address/:id", auth, async (req, res) => {
  const id = req.params.id;

  try {
    await ShippingAddress.deleteOne({ _id: id });
    res.send({ status: 1 });
  } catch (error) {
    res.send({ status: 0, err: error });
  }
});

// get all shipping address of user
router.get("/obtainedPrizes/:id", auth, async (req, res) => {
  const id = req.params.id;

  try {
    const userData = await Users.findOne({ _id: id }).populate(
      "shipAddress_id"
    );

    res.send({
      status: 1,
      obtainedPrizes: userData.obtained_prizes,
      shipAddress: userData.shipAddress_id,
    });
  } catch (error) {
    res.send({ status: 0 });
  }
});

module.exports = router;
