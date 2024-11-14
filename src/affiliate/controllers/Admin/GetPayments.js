const expressAsyncHandler = require("express-async-handler");

const AffUser = require("../../models/UsersModel");
const PaymentModel = require("../../models/PaymentModel");

const GetPayments = expressAsyncHandler(async (req, res) => {
  try {
    const allPayments = await PaymentModel.find({
      kind: { $ne: "Withdrawable" },
    }).sort("createdAt");

    const payments = [];
    for (const element of allPayments) {
      const payment = {};
      payment.pay = element;

      const affUser = await AffUser.findOne({ _id: element.aff_id });
      payment.user = affUser;

      payments.push(payment);
    }

    res.send({ status: true, payments: payments });
  } catch (error) {
    res.json({ status: false, error: error });
  }
});

module.exports = GetPayments;