const expressAsyncHandler = require("express-async-handler");

const AffModel = require("../../models/UsersModel");

const DeleteMember = expressAsyncHandler(async (req, res) => {
  try {
    await AffModel.deleteOne({ _id: req.body._id });
    const members = await AffModel.find({ role: req.body.role });

    res.send({ status: true, members: members });
  } catch (error) {
    res.json({ status: false, error: error });
  }
});

module.exports = DeleteMember;
