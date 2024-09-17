const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Users = require("../../models/user");
const PointLog = require("../../models/point_log");

router.post("/purchase", auth, async (req, res) => {
  const { user_id, point_num, price } = req.body;
  if (user_id == undefined)
    return res.status(401).json({ msg: "authorization denied" });

  Users.findOne({ _id: user_id })
    .then((user) => {
      const newPointLog = new PointLog({
        user_id: user_id,
        point_num: point_num,
        price: price,
        date: Date.now(),
        usage: "Purchase Point",
        ioFlag: 1,
      });
      newPointLog
        .save()
        .then((data) => {
          //   user.remain = data.point_num;
          user.point_remain = user.point_remain
            ? user.point_remain + point_num
            : point_num;
          user
            .save()
            // .updateOne({ _id: user_id }, { point_remain: point_num })
            .then(() => {
              console.log("user update succeed");
              res.send({ status: 1, msg: "Point Purchase Succeeded." });
            })
            .catch((err) => console.log("user update err", err));
        })
        .catch((err) =>
          res.send({ status: 0, msg: "Point Purchase Failed.", err: err })
        );
    })
    .catch((err) => {
      return res.send({ status: 0, msg: "Thers is no your info.", err: err });
    });
});

module.exports = router;
