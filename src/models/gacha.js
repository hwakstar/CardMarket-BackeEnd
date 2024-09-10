const mongoose = require("mongoose");

const gachaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  total_number: { type: Number, required: true },
  category: { type: String, required: true },
  remain_prizes: { type: Array },
  poped_prizes: { type: Array },
  last_prize: { type: Object },
  gacha_thumnail_url: { type: String, required: true },
  isRelease: { type: Boolean, default: false },
  create_date: { type: Date, default: Date.now },
});

const Gacha = mongoose.model("Gacha", gachaSchema, "admin_gacha");

module.exports = Gacha;
