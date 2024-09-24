const expressAsyncHandler = require("express-async-handler");

const isValid = require("../../utils/isValid");

const Users = require("../../models/UsersModel");

const ChangePsd = expressAsyncHandler(async (req, res) => {
  console.log("Request Change Password");
  try {
    const user = req.user;
    await Users.findByIdAndUpdate();
    const registerDate = req.user.createdAt;
    const currentTime = new Date();
    res.json({ registerDate, currentTime });
  } catch (error) {
    res.status(500).json({ error, message: "Server error" });
  }
});

module.exports = ChangePsd;
