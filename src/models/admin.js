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
  gachaID: { type: String },
  img_url: { type: String },
  video: { type: String },
  name: { type: String },
  cashback: { type: Number },
  kind: { type: String },
  trackingNumber: { type: String },
  deliveryCompany: { type: String },
  status: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  deliverStatus: { type: String, default: "notSelected" },
  drawDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// Rubbish
const rubbishSchema = new mongoose.Schema({
  gachaID: { type: String },
  img_url: { type: String },
  video: { type: String },
  name: { type: String },
  cashback: { type: Number },
  totalNumber: { type: Number },
  nickname: { type: String },
  status: { type: Number, default: 0 },
  count: { type: Number, default: 1 },
  order: { type: Number, default: 0 },
  kind: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const gachaTicketSchema = new mongoose.Schema({
  gachaID: { type: mongoose.Schema.Types.ObjectId, ref: "gacha" },
  userID: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  name: { type: String },
  trackingNumber: { type: String },
  deliveryCompany: { type: String },
  unique_id: { type: String },
  deliverStatus: { type: String },
  kind: { type: String },
  img_url: { type: String },
  cashback: { type: Number },
  order: { type: Number },
  sold: { type: Boolean, default: false },
  soldTime: { type: Date },
  type: { type: String, default: "" },
  deliveryTime: { type: Date },
  expireTime: { type: Date },
});

// Coupon
const couponSchema = new Schema({
  name: { type: String },
  cashback: { type: Number },
  code: { type: String },
  allow: { type: Boolean, default: false },
  used: { type: Boolean, default: false },
  UserID: { type: mongoose.Types.ObjectId, ref: "users" },
  createdAt: { type: Date, default: Date.now() },
  expireTime: { type: Date },
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

const popupRateSchema = new Schema({
  discount_winning: { type: Number },
  discount_normal: { type: Number },
  coupon_winning: { type: Number },
  coupon_normal: { type: Number },
  winning_rate: { type: Number },
  normal_rate: { type: Number },
});

const popupUserSchema = new Schema({
  userID: { type: mongoose.Types.ObjectId, ref: "urers" },
  date: { type: Date, default: Date.now() },
  type: { type: String, default: "" },
  discount_rate: { type: Number },
  coupon_number: { type: Number },
  coupon_code: { type: String },
  gotPopup: { type: Boolean, default: false },
  expireTime: { type: Date },
});

// Theme
const themeSchema = new Schema({
  logoUrl: { type: String },
  bgColor: { type: String },
  title: { type: String, default: "" },
  desc: { type: String, default: "" },
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
  currentMaintance: { type: Boolean, default: false },
});

const gachaLimitSchema = new Schema({
  gachaID: { type: mongoose.Types.ObjectId, ref: "gacha" },
  userID: { type: mongoose.Types.ObjectId, ref: "users" },
  number: { type: Number, default: 0 },
});

const couponHistory = new Schema({
  userID: { type: mongoose.Types.ObjectId, ref: "users" },
  couponID: { type: mongoose.Types.ObjectId, ref: "coupon" },
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

const HiddenGachaRecordSchema = new Schema({
  userID: { type: mongoose.Types.ObjectId, ref: "Users" },
  gachaID: { type: mongoose.Types.ObjectId, ref: "gacha" },
  date: { type: Date, default: Date.now() },
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
const GachaLimit = mongoose.model("gachaLimit", gachaLimitSchema, "gachaLimit");
const PopupRate = mongoose.model("popupRate", popupRateSchema, "popupRate");
const PopupUser = mongoose.model("popupUser", popupUserSchema, "popupUser");
const HiddenGachaRecord = mongoose.model(
  "hiddenGachaHistory",
  HiddenGachaRecordSchema,
  "hiddenGachaHistory"
);

const CouponHistory = mongoose.model(
  "couponHistory",
  couponHistory,
  "couponHistory"
);
const GachaVisitStatus = mongoose.model(
  "GachaVisitStatus",
  gachavisitSchema,
  "statis"
);
const GachaTicketSchema = mongoose.model(
  "GachaTicketSchema",
  gachaTicketSchema,
  "ticket"
);

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
  GachaLimit: GachaLimit,
  GachaVisitStatus: GachaVisitStatus,
  GachaTicketSchema: GachaTicketSchema,
  PopupRate: PopupRate,
  PopupUser: PopupUser,
  CouponHistory: CouponHistory,
  HiddenGachaRecord: HiddenGachaRecord,
};

module.exports = adminSchemas;
