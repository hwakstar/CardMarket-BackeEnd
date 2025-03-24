// balance of affiliate
const mongoose = require("mongoose");

const PaymentModel = mongoose.Schema(
  {
    aff_id: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    kind: {
      type: String,
    },
    bank_address: {
      type: String,
      default: null,
    },
    bank_id: {
      type: String,
      default: null,
    },
    withdrawnDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Payment = mongoose.model("affi_payment", PaymentModel);

module.exports = Payment;
