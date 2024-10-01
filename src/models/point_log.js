const mongoose = require("mongoose");

const pointLogSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    user_name: { type: String, required: true },
    user_country: { type: String, required: true },
    point_num: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    usage: { type: String },
    ioFlag: { type: Number, require: true },
    aff_id: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const PointLog = mongoose.model("PointLog", pointLogSchema, "point_log");
module.exports = mongoose.model.PointLog || PointLog;
