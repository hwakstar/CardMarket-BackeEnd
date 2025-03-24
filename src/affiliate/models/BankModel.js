const mongoose = require("mongoose");

const BankModel = mongoose.Schema(
  {
    aff_id: {
      type: String,
      required: true,
    },
    transType: {
      type: String,
      default: "other",
      required: true,
    },
    nameOfFinacial: {
      type: String,
      required: true,
    },
    accountType: {
      type: String,
      default: "ordinary",
      required: true,
    },
    accountNumber: {
      type: String,
      default: "0000000",
      required: true,
    },
    accountHolder: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Earn = mongoose.model("affi_bank", BankModel);

module.exports = Earn;
