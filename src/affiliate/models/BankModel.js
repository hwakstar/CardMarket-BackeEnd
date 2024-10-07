const mongoose = require("mongoose");

const BankModel = mongoose.Schema(
  {
    aff_id: {
      type: String,
      required: true,
    },
    transType: {
      type: String,
      default: "other", // 1: Normal, 2: Bronze, 3: Silver, 4: Gold, 5: Platinum
      required: true,
    },
    nameOfFinacial: {
      type: String,
      required: true,
    },
    accountType: {
      type: String,
      default: "ordinary", // means 3%
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
