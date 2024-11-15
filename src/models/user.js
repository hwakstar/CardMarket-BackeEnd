const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  hashedPass: { type: String },
  address: { type: String },
  city: { type: String },
  country: { type: String },
  point_remain: { type: Number, default: 0 },
  obtained_prizes: { type: Array },
  active: { type: Boolean, default: true },
  aff_id: { type: String },
  shipAddress_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ShippingAddress",
  },
  rank_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ranks",
  },
});

const Users = mongoose.model("Users", UserSchema, "users");
module.exports = mongoose.model.Users || Users;
