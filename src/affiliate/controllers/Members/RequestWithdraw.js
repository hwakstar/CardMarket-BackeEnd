const expressAsyncHandler = require("express-async-handler");

const BankAccs = require("../../models/BankModel");

const RequestWithdraw = expressAsyncHandler(async (req, res) => {
  try {
    console.log(req.body);
    // const bankInfo = await BankAccs.findOne({ aff_id: req.body.aff_id });

    // res.json({ status: true, bankInfo, message: "Success" });
  } catch (error) {
    res.json({ error, message: "Get members unsuccessful" });
  }
});

module.exports = RequestWithdraw;
