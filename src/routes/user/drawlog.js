const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

const router = express.Router();

const auth = require("../../middleware/auth");
const Gacha = require("../../models/gacha");


// get time selected gacha
router.get("/:userid/:gachaid", auth, async (req, res) => {
  const userid = req.params.userid;
  const gachaid = req.params.gachaid;

  try{
    const drawLogData = await Gacha.findOne({ _id: gachaid });
    const userDrawLog = drawLogData.userLogs.find(log => log.userid.toString() === userid);
    if (userDrawLog == null) {
      return res.send({
        status: 0,
        msg: 'notdraw'
      });
    }

    res.send({
      status: 1,
      gacha: userDrawLog.time,
    });
  } catch (error) {
    res.send({ status: 0});
  };
}) 


// set time seleted gacha
router.post("/", auth, async (req, res) => {
  const { userid, gachaid } = req.body;

  try {
    // Find or create the draw log for the specific gacha
    let drawLogData = await Gacha.findOne({ _id: gachaid });

    const currentTime = Math.floor(new Date(new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo', // Specify the time zone
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false // Use 24-hour format
    }).format(Date.now())) / 1000);

    const userDrawLog = drawLogData.userLogs.find(log => log.userid === userid); // Assuming userLogs is an array of objects

    if (userDrawLog) {
      // Update existing gacha time
      userDrawLog.time = currentTime;
    } else {
      // Add new gacha time
      drawLogData.userLogs.push({ userid: userid, time: currentTime });
    }

    // Save the draw log data
    await drawLogData.save();
    await Gacha.updateOne({_id: gachaid}, drawLogData);

    res.send({ status: 1 });
  } catch (error) {
    console.error("Error processing draw log:", error); // Log the error for debugging
    res.send({ status: 0, msg: "An error occurred" });
  }
});

module.exports = router;
