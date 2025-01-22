const mongoose = require("mongoose");

const pointLogSchema = new mongoose.Schema(
  {
    aff_id: { type: String },
    user_id: { type: String, required: true },
    user_name: { type: String },
    user_country: { type: String },
    point_num: { type: Number, required: true },
    usage: { type: String },
    gacha: { type: String, default: '' },
    number: {type: String, default: ''}
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const PointLog = mongoose.model("PointLog", pointLogSchema, "pointLog");
module.exports = mongoose.model.PointLog || PointLog;
