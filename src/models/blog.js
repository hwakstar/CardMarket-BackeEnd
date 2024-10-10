const mongoose = require("mongoose");

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String },
    content: { type: String },
    img_url: { type: String },
    parent_id: { type: String },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Blogs = mongoose.model("Blogs", BlogSchema, "blogs");
module.exports = mongoose.model.Blogs || Blogs;
