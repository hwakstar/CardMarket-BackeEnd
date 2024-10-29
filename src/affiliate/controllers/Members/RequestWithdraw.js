const expressAsyncHandler = require("express-async-handler");

const PaymentModel = require("../../models/PaymentModel");

const RequestWithdraw = expressAsyncHandler(async (req, res) => {
  try {
    const { aff_id, amount, bankInfo } = req.body;

    // update payment
    const affPayment = await PaymentModel.findOne({
      aff_id: aff_id,
      kind: "Withdrawable",
    });
    if (affPayment) {
      // update withdrawable balance
      affPayment.price -= amount;
      await affPayment.save();
    }

    // add new payment pending
    const newPayment = new PaymentModel({
      aff_id: aff_id,
      price: amount,
      kind: "Pending",
      bank_address: bankInfo.accountNumber,
    });
    await newPayment.save();

    const updatedAffPayment = await PaymentModel.find({ aff_id: aff_id });
    // Calculate sum of price where kind is "pending"
    const sumOfPendingPrices = updatedAffPayment
      .filter((item) => item.kind === "Pending")
      .reduce((sum, item) => sum + item.price, 0);
    const sumOfWithdrawablePrices = updatedAffPayment.find(
      (item) => item.kind === "Withdrawable"
    ).price;
    const sumOfWithdrawnPrices = updatedAffPayment.find(
      (item) => item.kind === "Withdrawn"
    ).price;

    res.json({
      status: true,
      pendingPrices: sumOfPendingPrices,
      withdrawablePrices: sumOfWithdrawablePrices,
      withdrawnPrices: sumOfWithdrawnPrices,
      message: "Success",
    });
  } catch (error) {
    res.json({ status: true, error });
  }
});

module.exports = RequestWithdraw;
