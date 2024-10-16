const mongoose = require("mongoose");

const RankSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    bonus: {
      type: Number,
      required: true,
    },
    start_deposite: {
      type: Number,
    },
    end_deposite: {
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

const Ranks = mongoose.model("Ranks", RankSchema, "rank");

module.exports = mongoose.model.RankSchema || Ranks;
