const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");

const Users = require("../../models/user");
const PointLog = require("../../models/point_log");

router.post("/purchase", auth, async (req, res) => {
  const { user_id, point_num, price } = req.body;

  if (user_id == undefined)
    return res.status(401).json({ msg: "authorization denied" });

  try {
    const user = await Users.findOne({ _id: user_id });

    if (user) {
      const newPointLog = new PointLog({
        user_id: user_id,
        point_num: point_num,
        price: price,
        date: Date.now(),
        usage: "Purchase Point",
        ioFlag: 1,
      });

      await newPointLog.save();

      user.point_remain += point_num;
      await user.save();

      res.send({ status: 1, msg: "Point Purchase Succeeded." });
    } else {
      return res.send({ status: 0, msg: "Thers is no your info." });
    }
  } catch (error) {
    res.send({ status: 0, msg: "Point Purchase Failed.", error: error });
  }
});

module.exports = router;
