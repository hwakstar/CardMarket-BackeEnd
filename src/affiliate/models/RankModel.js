const mongoose = require("mongoose");

const RankModel = mongoose.Schema(
  {
    level: {
      type: Number,
      default: 1, // 1: Normal, 2: Bronze, 3: Silver, 4: Gold, 5: Platinum
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    deposite_commission: {
      type: Number,
      default: 3, // means 3%
      required: true,
    },
    register_commission: {
      type: Number,
      default: 2, // means ¥2
      required: true,
    },
    start_deposite: {
      type: Number,
    },
    limit_deposite: {
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
