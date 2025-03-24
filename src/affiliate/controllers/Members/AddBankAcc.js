const expressAsyncHandler = require("express-async-handler");

const BankAccs = require("../../models/BankModel");

const AddBankAcc = expressAsyncHandler(async (req, res) => {
  try {
    const bankAcc = await BankAccs.findOne({ aff_id: req.body.aff_id });

    if (bankAcc) {
      await BankAccs.updateOne({ aff_id: req.body.aff_id }, req.body);
    } else {
      const newAffAcc = new BankAccs(req.body);
      await newAffAcc.save();
    }

    res.json({
      status: true,
      message: "Successfully saved transter account.",
    });
  } catch (error) {
    res.json({
      error,
      status: false,
      message: "Save transfer account unsuccessful",
    });
  }
});

module.exports = AddBankAcc;
