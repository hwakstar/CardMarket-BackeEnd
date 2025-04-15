const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    hashedPass: { type: String },
    address: { type: String },
    city: { type: String },
    country: { type: String },
    point_remain: { type: Number, default: 0 },
    obtained_prizes: { type: Array },
    inviteCode: { type: String },
    otherCode: { type: String },
    inviteCount: { type: Number, default: 15 },
    invited: { type: String, default: "" },
    isVerify: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    aff_id: { type: String },
    resetPasswordLink: { type: String, default: "" },
    shipAddress_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShippingAddress",
    },
    rank_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ranks",
    },
    line_user_id: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Users = mongoose.model("Users", UserSchema, "users");
module.exports = mongoose.model.Users || Users;
