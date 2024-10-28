const expressAsyncHandler = require("express-async-handler");

const LinkModel = require("../../models/LinkModel");
const ClickLinkModel = require("../../models/ClickLinkModel");
const RegisterModel = require("../../models/RegisterModel");
const EarnModel = require("../../models/EarnModel");

const isToday = (date) => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const isThisWeek = (date) => {
  const today = new Date();
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  return date >= startOfWeek && date <= endOfWeek;
};

const isThisMonth = (date) => {
  const today = new Date();
  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

// Sum earns based on category
const sumEarnsByCategory = (data, categoryFn) => {
  return data.reduce((sum, item) => {
    const date = new Date(item.createdAt);
    if (categoryFn(date)) {
      sum += item.reward;
    }
    return sum;
  }, 0);
};

const GetLinkStatus = expressAsyncHandler(async (req, res) => {
  try {
    const affClicks = await ClickLinkModel.find(req.body);
    const affRegisters = await RegisterModel.find(req.body);
    const result = await EarnModel.aggregate([
      {
        // Match records by user_id
        $match: {
          aff_id: req.body.aff_id,
          link_id: req.body.link_id,
          kind: "register",
        },
      },
      {
        // Group by user_id and sum the point_num field
        $group: {
          _id: null,
          earn: { $sum: "$reward" },
        },
      },
    ]);
    const earnsData = result.length > 0 ? result[0].earn : 0;
    const cvr = ((affRegisters.length / affClicks.length) * 100).toFixed(2);

    res.json({
      status: true,
      linkStatus: {
        clicks: affClicks.length,
        registers: affRegisters.length,
        cvr: isNaN(cvr) ? 0 : cvr,
        earn: earnsData,
      },
      msg: "Success",
    });
  } catch (error) {
    res.json({ error, message: "Failed to get link status" });
  }
});

module.exports = GetLinkStatus;
