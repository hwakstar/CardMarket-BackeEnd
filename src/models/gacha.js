const mongoose = require("mongoose");

const gachaSchema = new mongoose.Schema(
  {
    img_url: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    kind: { type: Array },
    award_rarity: { type: Number },
    order: { type: Number, default: 1 },
    total_number: { type: Number, default: 0 },
    isRelease: { type: Boolean, default: false },
    remain_prizes: { type: Array },
    poped_prizes: { type: Array },
    // grade_prizes: { type: Array },
    // extra_prizes: { type: Array },
    // round_prizes: { type: Array },
    // last_prizes: { type: Array },
    // last_prize: { type: Object },
    // last_effect: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Gacha = mongoose.model("Gacha", gachaSchema, "gacha");

module.exports = mongoose.model.Gacha || Gacha;
