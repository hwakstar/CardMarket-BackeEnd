const expressAsyncHandler = require("express-async-handler");

const BankAccs = require("../../models/BankModel");
const AffBalance = require("../../models/PaymentModel");

const GetBankInfo = expressAsyncHandler(async (req, res) => {
  try {
    const bankInfo = await BankAccs.findOne({ aff_id: req.body.aff_id });
    const affBalance = await AffBalance.findOne({
      aff_id: req.body.aff_id,
      kind: "Withdrawable",
    });

    res.json({
      status: true,
      bankInfo,
      affBalance: affBalance.price,
      message: "Success",
    });
  } catch (error) {
    res.json({ status: false, error });
  }
});

module.exports = GetBankInfo;
