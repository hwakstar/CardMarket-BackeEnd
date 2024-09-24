const expressAsyncHandler = require("express-async-handler");

const getToken = require("../../utils/GetToken");

const Users = require("../../models/UsersModel");

const Login = expressAsyncHandler(async (req, res) => {
  const { affiliateId, password } = req.body;

  const user = await Users.findOne({ affiliateId });
  if (!user) throw new Error("Affiliate ID or Password not correct.");

  if (await user.CheckPass(password)) {
    res.json({
      name: user.fullName,
      token: getToken(user._id),
      message: "Login Successful",
    });
  } else {
    res.status(500);
    throw new Error("Invalid Password");
  }
});

module.exports = Login;
