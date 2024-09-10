const mongoose = require("mongoose");

const pointLogSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  point_num: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  usage: { type: String },
  ioFlag: { type: Number, require: true }, //flag if point consume or buy; 1: buy, 0: consume
});

const PointLog = mongoose.model("PointLog", pointLogSchema, "point_log");
module.exports = mongoose.model.PointLog || PointLog;
