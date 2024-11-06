const expressAsyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

const Users = require("../../models/UsersModel");

const makeToken = require("../../utils/makeToken");

const Login = expressAsyncHandler(async (req, res) => {
  const { affiliateId, password } = req.body;

  try {
    const user = await Users.findOne({ affiliateId });

    if (!user) {
      return res.json({ status: false, message: "wrongUser" });
    }

    const checkPass = await bcrypt.compare(password, user.password);
    if (!checkPass) {
      return res.json({ status: false, message: "wrongUser" });
    }

    const token = makeToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    res.json({
      status: true,
      name: user.fullName,
      token: token,
      message: "successLogin",
    });
  } catch (error) {
    res.json({ error, status: false, message: "failedLogin" });
  }
});

module.exports = Login;
