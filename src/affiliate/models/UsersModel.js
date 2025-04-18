const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UsersModel = mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, unique: true, requried: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    country: { type: String, required: true },
    role: { type: String, default: "Affiliate" },
    affiliateId: { type: String },
    rank: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// populate the posts
UsersModel.virtual("Posts", {
  ref: "Post",
  foreignField: "author",
  localField: "_id",
});

// encrypt password before saving
UsersModel.pre("save", async function (next) {
  // Only run this line if password gets modded but not on other update functions
  if (!this.isModified("password")) return next();

  // hash password with strength of 10
  const saltRounds = 10;

  // vs code might suggest await is unneccessary so remove it but then the hashing won't work(tried and tested)
  this.password = await bcrypt.hash(this.password, saltRounds);

  // affilitId generate
  const d = new Date();

  let affiliateId =
    "affiliate" + d.getMonth() + d.getDate() + d.getMilliseconds();
  this.affiliateId = affiliateId;

  next();
});

UsersModel.methods.CheckPass = async function (pass) {
  return await bcrypt.compare(pass, this.password);
};

const Users = mongoose.model("affi_user", UsersModel);

module.exports = Users;
