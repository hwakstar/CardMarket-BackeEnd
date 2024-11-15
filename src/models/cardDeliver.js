const mongoose = require("mongoose");

const cardDeliverSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    prize: { type: Object, required: true },
    status: { type: String, required: true, default: "Pending" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const CardDeliver = mongoose.model(
  "CardDeliver",
  cardDeliverSchema,
  "cardDeliver"
);

module.exports = mongoose.model.CardDeliver || CardDeliver;
