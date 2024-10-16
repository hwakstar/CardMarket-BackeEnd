const mongoose = require("mongoose");

const RankModel = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    deposite_commission: {
      type: Number,
      default: 3,
      required: true,
    },
    register_commission: {
      type: Number,
      default: 2,
      required: true,
    },
    start_amount: {
      type: Number,
    },
    limit_amount: {
      type: Number,
    },
    img_url: {
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

const Earn = mongoose.model("affi_rank", RankModel);

module.exports = Earn;
