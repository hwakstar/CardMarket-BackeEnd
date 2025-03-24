const expressAsyncHandler = require("express-async-handler");

const isValid = require("../../utils/isValid");

const Users = require("../../models/UsersModel");

const GetTimeCtrl = expressAsyncHandler(async (req, res) => {
  try {
    const registerDate = req.user.createdAt;
    const currentTime = new Date();
    res.json({ registerDate, currentTime });
  } catch (error) {
    res.status(500).json({ error, message: "Server error" });
  }
});

module.exports = GetTimeCtrl;
