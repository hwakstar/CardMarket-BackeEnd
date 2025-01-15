const mongoose = require("mongoose");

// Rubbish
const rubbishSchema = new mongoose.Schema({
    img_url: { type: String },
    name: { type: String },
    cashback: { type: Number },
    totalNumber: {type: Number},
    status: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  });
  

const Rubbish = mongoose.model("Rubbish", rubbishSchema, "rubbish");

module.exports = mongoose.model.Rubbish || Rubbish;