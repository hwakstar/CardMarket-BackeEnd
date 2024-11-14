const mongoose = require("mongoose");

const prizeVideoSchema = new mongoose.Schema(
  {
    kind: { type: String, required: true },
    url: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const PrizeVideo = mongoose.model("PrizeVideo", prizeVideoSchema, "prizeVideo");

module.exports = mongoose.model.PrizeVideo || PrizeVideo;
