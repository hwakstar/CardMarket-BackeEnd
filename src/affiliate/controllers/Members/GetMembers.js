const expressAsyncHandler = require("express-async-handler");

const isValid = require("../../utils/isValid");

const Users = require("../../models/UsersModel");

const GetMembers = expressAsyncHandler(async (req, res) => {
  try {
    let members;

    if (req.body.role === "All") {
      members = await Users.find();
    } else {
      members = await Users.find(req.body);
    }

    res.json({ status: true, members, msg: "Success" });
  } catch (error) {
    res.json({ error, message: "Get members unsuccessful" });
  }
});

module.exports = GetMembers;
