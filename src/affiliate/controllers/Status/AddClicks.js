const expressAsyncHandler = require("express-async-handler");

const ClickLinkModel = require("../../models/ClickLinkModel");

const AddClicks = expressAsyncHandler(async (req, res) => {
  try {
    const affId = req.body.aff_id;

    const clickLink = new ClickLinkModel({
      aff_id: affId,
    });
    await clickLink.save();

    res.json({ status: true, msg: "Success" });
  } catch (error) {
    res.json({ error, message: "Update Status Unsuccessful" });
  }
});

module.exports = AddClicks;
