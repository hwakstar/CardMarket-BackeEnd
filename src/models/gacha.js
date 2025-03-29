const mongoose = require("mongoose");

const gachaSchema = new mongoose.Schema(
  {
    img_url: { type: String, required: true },
    detail_img_url: { type: String, default: "" },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    kind: { type: Array },
    type: { type: String },
    award_rarity: { type: Number },
    order: { type: Number, default: 1 },
    time: { type: Number, default: 0 },
    total_number: { type: Number, default: 0 },
    remove_number: { type: Number, default: 0 },
    isRelease: { type: Boolean, default: false },
    title: { type: String, default: "" },
    desc: { type: String, default: "" },
    userLogs: { type: Array },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


const Gacha = mongoose.model("Gacha", gachaSchema, "gacha");

module.exports = mongoose.model.Gacha || Gacha;
