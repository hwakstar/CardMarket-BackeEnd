const mongoose = require("mongoose");

const deliverLog = new mongoose.Schema({
    user_id: { type: String, required: true },
    user_name: { type: String, required: true },
    gacha_id: { type: String, required: true },
    gacha_name: { type: String, required: true },
    prizes: { type: Array, required: true },
    status: { type: String, required: true }, //pending: 1, delivering: 2, complete: 3 
    date: { type: Date, default: Date.now, required: true },
});

const DeliverLog = mongoose.model("deliver_log", deliverLog, "deliver_log");
module.exports = mongoose.model.DeliverLog || DeliverLog;
