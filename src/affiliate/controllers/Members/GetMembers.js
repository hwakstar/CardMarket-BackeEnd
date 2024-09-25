const expressAsyncHandler = require("express-async-handler");

const isValid = require("../../utils/isValid");

const Users = require("../../models/UsersModel");

const GetMembers = expressAsyncHandler(async (req, res) => {
  try {
    const members = await Users.find();
    res.json({ status: true, members, msg: "Success" });
  } catch (error) {
    res.json({ error, message: "Get members unsuccessful" });
  }
});

module.exports = GetMembers;
