const mongoose = require("mongoose");

const RankModel = mongoose.Schema(
  {
    name: { type: String },
    url: { type: String },
    title: { type: String },
    aff_id: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const AffRank = mongoose.model("affi_link", RankModel);

module.exports = AffRank;
