const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  hashedPass: { type: String },
  firstname: { type: String },
  lastname: { type: String },
  address: { type: String },
  city: { type: String },
  country: { type: String },
  postalCode: { type: Number },
  description: { type: String },
  point_remain: { type: Number, default: 0 },
  obtain_cards: { type: Array },
});

const Users = mongoose.model("Users", UserSchema, "users");
module.exports = mongoose.model.Users || Users;
