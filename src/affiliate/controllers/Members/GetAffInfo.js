const expressAsyncHandler = require("express-async-handler");

const isValid = require("../../utils/isValid");

const Users = require("../../models/UsersModel");

const GetAffInfo = expressAsyncHandler(async (req, res) => {
  try {
    const affId = req.body.affId;

    const affInfo = await Users.findOne({ _id: affId });

    res.json({ status: true, affInfo, msg: "Success" });
  } catch (error) {
    res.json({ error, message: "Get members unsuccessful" });
  }
});

module.exports = GetAffInfo;
