const expressAsyncHandler = require("express-async-handler");

const LinkModel = require("../../models/LinkModel");
const ClickLinkModel = require("../../models/ClickLinkModel");
const RegisterModel = require("../../models/RegisterModel");

const GetLinkStatus = expressAsyncHandler(async (req, res) => {
  try {
    const affId = req.body.affId;
    const period = req.body.period;

    const affLinks = await LinkModel.find({ aff_id: affId });
    const affClicks = await ClickLinkModel.find({ aff_id: affId });
    const affRegisters = await RegisterModel.find({ aff_id: affId });
    
    

    // get clicks data

    // res.json({ status: true, msg: "Success", links: links });
  } catch (error) {
    res.json({ error, message: "Update Status Unsuccessful" });
  }
});

module.exports = GetLinkStatus;
