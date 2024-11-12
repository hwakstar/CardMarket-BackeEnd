const mongoose = require("mongoose");

const ShippingAddressSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    country: { type: String },
    lastName: { type: String },
    firstName: { type: String },
    lastNameKana: { type: String },
    firstNameKana: { type: String },
    zipCode: { type: String },
    prefecture: { type: String },
    address: { type: String },
    building: { type: String },
    phoneNumber: { type: String },
    addressLine1: { type: String },
    addressLine2: { type: String },
    districtCity: { type: String },
    cityTown: { type: String },
    cityDistrict: { type: String },
    islandCity: { type: String },
    suburbCity: { type: String },
    state: { type: String },
    stateProvinceRegion: { type: String },
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
  "shipAddress"
);

module.exports = mongoose.model.ShippingAddress || ShippingAddress;
