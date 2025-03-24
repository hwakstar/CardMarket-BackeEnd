const expressAsyncHandler = require("express-async-handler");

const RegisterModel = require("../../models/RegisterModel");

const AddRegisters = expressAsyncHandler(async (req, res) => {
  try {
    const affId = req.body.aff_id;

    const registerByLink = new RegisterModel({
      aff_id: affId,
    });
    await registerByLink.save();

    res.json({ status: true, msg: "Success" });
  } catch (error) {
    res.json({ error, message: "Update Status Unsuccessful" });
  }
});

module.exports = AddRegisters;
