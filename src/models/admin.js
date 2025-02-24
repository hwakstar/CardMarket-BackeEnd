const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Gacha's main category
const categorySchema = new Schema({
  jpName: { type: String, required: true },
  enName: { type: String, required: true },
  ch1Name: { type: String, required: true },
  ch2Name: { type: String, required: true },
  vtName: { type: String, required: true },
});

// Prize
const prizeSchema = new Schema({
  img_url: { type: String },
  name: { type: String },
  cashback: { type: Number },
  kind: { type: String },
  trackingNumber: { type: String },
  deliveryCompany: { type: String },
  status: { type: Boolean, default: false },
  order: {type: Number, default: 0},
  deliverStatus: {type: String, default: "notSelected"},
  createdAt: { type: Date, default: Date.now },
});

// Rubbish
const rubbishSchema = new mongoose.Schema({
  img_url: { type: String },
  name: { type: String },
  cashback: { type: Number },
  totalNumber: {type: Number},
  nickname: {type: String},
  status: { type: Number, default: 0 },
  count: {type: Number, default: 0},
  createdAt: { type: Date, default: Date.now },
});

// Coupon
const couponSchema = new Schema({
  name: { type: String },
  cashback: { type: Number },
  code: {type: String},
  allow: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Point
const pointSchema = new Schema({
  point_num: { type: Number, required: true },
  price: { type: Number, required: true },
  img_url: { type: String, required: true },
});

// User rank
const rankSchema = new Schema({
  name: { type: String, required: true },
  bonus: { type: Number, required: true },
  start_amount: { type: Number },
  end_amount: { type: Number },
  img_url: { type: String, required: true },
  last: { type: Boolean, required: true },
});

// Theme
const themeSchema = new Schema({
  logoUrl: { type: String },
  bgColor: { type: String },
});

// Terms of service
const termsSchema = new Schema({
  content: { type: String, required: true },
  lang: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Gacha visit status
const gachavisitSchema = new Schema({
  currentGacha: { type: Boolean, default: false },
  currentInvite: { type: Boolean, default: false },
});

// Carousel
const carouselSchema = new Schema({
  link: { type: String, required: true },
  img_url: { type: String, required: true },
});

// Admin
const AdminSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  authority: { type: Object },
});

const Category = mongoose.model("Category", categorySchema, "category");
const Prize = mongoose.model("Prize", prizeSchema, "prize");
const Rubbish = mongoose.model("Rubbish", rubbishSchema, "rubbish");
const Point = mongoose.model("Point", pointSchema, "point");
const Coupon = mongoose.model("Coupon", couponSchema, "coupon");
const Rank = mongoose.model("Rank", rankSchema, "rank");
const Terms = mongoose.model("Term", termsSchema, "terms");
const Themes = mongoose.model("Theme", themeSchema, "themes");
const Carousels = mongoose.model("carousels", carouselSchema, "carousels");
const Administrator = mongoose.model("Admin", AdminSchema, "admin");
const GachaVisitStatus = mongoose.model("GachaVisitStatus", gachavisitSchema, "gachavisitstatus")

const adminSchemas = {
  Category: Category,
  Prize: Prize,
  Rubbish: Rubbish,
  Point: Point,
  Rank: Rank,
  Terms: Terms,
  Themes: Themes,
  Carousels: Carousels,
  Coupon: Coupon,
  Administrator: Administrator,
  GachaVisitStatus: GachaVisitStatus
};

module.exports = adminSchemas;
