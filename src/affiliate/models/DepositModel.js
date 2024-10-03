const mongoose = require("mongoose");

const DepositModel = mongoose.Schema(
  {
    aff_id: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Earn = mongoose.model("affi_deposit", DepositModel);

module.exports = Earn;
