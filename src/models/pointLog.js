const mongoose = require("mongoose");

const pointLogSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    user_name: { type: String },
    user_country: { type: String },
    point_num: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    usage: { type: String },
    aff_id: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const PointLog = mongoose.model("PointLog", pointLogSchema, "pointLog");
module.exports = mongoose.model.PointLog || PointLog;
