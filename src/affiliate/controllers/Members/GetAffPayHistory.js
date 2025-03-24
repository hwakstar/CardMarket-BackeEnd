const expressAsyncHandler = require("express-async-handler");

const PaymentModel = require("../../models/PaymentModel");

const GetAffPayHistory = expressAsyncHandler(async (req, res) => {
  try {
    const affBalance = await PaymentModel.find({
      aff_id: req.body.aff_id,
      kind: { $ne: "Withdrawable" },
    }).sort({ createdAt: -1 });

    res.json({ status: true, affBalance: affBalance });
  } catch (error) {
    res.json({ status: false, error });
  }
});

module.exports = GetAffPayHistory;
