const mongoose = require("mongoose");

const RankModel = mongoose.Schema(
  {
    name: { type: String },
    deposite_commission: { type: Number },
    register_commission: { type: Number },
    start_amount: { type: Number },
    end_amount: { type: Number },
    img_url: { type: String },
    last: { type: Boolean },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const AffRank = mongoose.model("affi_rank", RankModel);

module.exports = AffRank;
