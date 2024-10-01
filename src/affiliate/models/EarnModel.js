const mongoose = require("mongoose");

const EarnModel = mongoose.Schema(
  {
    aff_id: {
      type: String,
      required: true,
    },
    reward: {
      type: Number,
      require: true,
      default: 0,
    },
    kind: {
      type: String,
      require: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Earn = mongoose.model("affi_earn", EarnModel);

module.exports = Earn;
