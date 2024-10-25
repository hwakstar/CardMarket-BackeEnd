const mongoose = require("mongoose");

const RegisterModel = mongoose.Schema(
  {
    aff_id: { type: String, required: true },
    link_id: { type: String, required: true },
    user_id: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const RegisterByLink = mongoose.model("affi_register", RegisterModel);

module.exports = RegisterByLink;
