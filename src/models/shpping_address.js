const mongoose = require("mongoose");

const ShippingAddressSchema = new mongoose.Schema(
  {
    country: { type: String },
    lastName: { type: String },
    firstName: { type: String },
    lastNameKana: { type: String },
    firstNameKana: { type: String },
    postCode: { type: String },
    prefecture: { type: String },
    address: { type: String },
    building: { type: String },
    phoneNumber: { type: String },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const ShippingAddress = mongoose.model(
  "ShippingAddress",
  ShippingAddressSchema,
  "shipping_address"
);
module.exports = mongoose.model.ShippingAddress || ShippingAddress;
