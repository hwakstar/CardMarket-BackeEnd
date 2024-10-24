const mongoose = require("mongoose");

const ClickLinkModel = mongoose.Schema(
  {
    aff_id: { type: String, required: true },
    link_id: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const ClickLink = mongoose.model("affi_click", ClickLinkModel);

module.exports = ClickLink;
