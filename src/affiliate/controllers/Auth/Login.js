const expressAsyncHandler = require("express-async-handler");

const Users = require("../../models/UsersModel");

const getToken = require("../../utils/GetToken");

const Login = expressAsyncHandler(async (req, res) => {
  const { affiliateId, password } = req.body;

  try {
    const user = await Users.findOne({ affiliateId });

    if (!user) {
      res.json({
        status: false,
        message: "wrongUser",
      });
    } else {
      if (await user.CheckPass(password)) {
        // make token
        const token = getToken({
          id: user._id,
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
      } else {
        res.json({
          status: false,
          message: "wrongUser",
        });
      }
    }
  } catch (error) {
    res.json({ error, status: false, message: "failedLogin" });
  }
});

module.exports = Login;
