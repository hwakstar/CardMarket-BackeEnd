const expressAsyncHandler = require("express-async-handler");

const Users = require("../../models/UsersModel");

const getToken = require("../../utils/GetToken");
const AffRankData = require("../../utils/affRankData");

const Login = expressAsyncHandler(async (req, res) => {
  const { affiliateId, password } = req.body;

  try {
    const user = await Users.findOne({ affiliateId });

    if (!user) {
      res.json({
        status: false,
        message: "Affiliate ID or Password not correct.",
      });
    } else {
      if (await user.CheckPass(password)) {
        // get rank data
        const rank = await AffRankData(user._id, user.rank_id);
        // userData.rankData = rank;

        res.json({
          status: true,
          name: user.fullName,
          token: getToken({
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            rank: user.rank,
            totalPointsAmount: rank.totalPointsAmount,
          }),
          message: "Login Successful",
        });
      } else {
        res.json({
          status: false,
          message: "Affiliate ID or Password not correct.",
        });
      }
    }
  } catch (error) {
    res.json({ error, message: "Login unsuccessful" });
  }
});

module.exports = Login;
