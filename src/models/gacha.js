const mongoose = require("mongoose");

const gachaSchema = new mongoose.Schema(
  {
    img_url: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    kind: { type: Array },
    type: { type: String },
    award_rarity: { type: Number },
    order: { type: Number, default: 1 },
    time: {type: Number, default: 0},
    total_number: { type: Number, default: 0 },
    rubbish_total_number: { type: Number, default: 0 },
    isRelease: { type: Boolean, default: false },
    show_prizes: {type: Array},
    remain_prizes: { type: Array },
    remain_rubbishs: {type: Array },
    userLogs: {type: Array}
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Gacha = mongoose.model("Gacha", gachaSchema, "gacha");

module.exports = mongoose.model.Gacha || Gacha;
