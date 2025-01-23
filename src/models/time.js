const mongoose = require("mongoose");

const TimeSchema = new mongoose.Schema(
  {
    time: {type: Number, default: 0},
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Times = mongoose.model("Times", TimeSchema, "times");
module.exports = mongoose.model.Times || Times;
