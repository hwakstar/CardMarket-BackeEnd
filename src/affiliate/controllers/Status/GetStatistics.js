const expressAsyncHandler = require("express-async-handler");

const ClickLinkModel = require("../../models/ClickLinkModel");
const RegisterByLinkModel = require("../../models/RegisterByLinkModel");
const PointLogs = require("../../../models/point_log");
const AffEarn = require("../../models/EarnModel");

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

// Sum points based on category
const sumPaymentsByCategory = (data, categoryFn) => {
  return data.reduce((sum, item) => {
    const date = new Date(item.createdAt);
    if (categoryFn(date)) {
      sum += item.point_num;
    }
    return sum;
  }, 0);
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

const GetStatistics = expressAsyncHandler(async (req, res) => {
  try {
    const affId = req.body.affId;

    // get clicks data
    const clicksData = await ClickLinkModel.find({ aff_id: affId });
    const todayClicks = clicksData.filter((item) =>
      isToday(new Date(item.createdAt))
    ).length;
    const thisWeekClicks = clicksData.filter((item) =>
      isThisWeek(new Date(item.createdAt))
    ).length;
    const thisMonthClicks = clicksData.filter((item) =>
      isThisMonth(new Date(item.createdAt))
    ).length;
    const totalClicks = clicksData.length;

    // get registers data
    const registersData = await RegisterByLinkModel.find({ aff_id: affId });
    const todayRegisters = registersData.filter((item) =>
      isToday(new Date(item.createdAt))
    ).length;
    const thisWeekRegisters = registersData.filter((item) =>
      isThisWeek(new Date(item.createdAt))
    ).length;
    const thisMonthRegisters = registersData.filter((item) =>
      isThisMonth(new Date(item.createdAt))
    ).length;
    const totalRegisters = registersData.length;

    // get payments data of affiliate
    const paymentsData = await PointLogs.find({
      aff_id: affId,
      usage: "purchagePoints",
    });
    const todayPayments = sumPaymentsByCategory(paymentsData, isToday);
    const thisWeekPayments = sumPaymentsByCategory(paymentsData, isThisWeek);
    const thisMonthPayments = sumPaymentsByCategory(paymentsData, isThisMonth);
    const totalPayments = paymentsData.reduce(
      (total, item) => (total += item.point_num),
      0
    );

    // get earns data of affiliate
    const earnsData = await AffEarn.find({ aff_id: affId });
    const todayEarns = sumEarnsByCategory(earnsData, isToday);
    const thisWeekEarns = sumEarnsByCategory(earnsData, isThisWeek);
    const thisMonthEarns = sumEarnsByCategory(earnsData, isThisMonth);
    const totalEarns = earnsData.reduce(
      (total, item) => (total += item.reward),
      0
    );

    // make statistics objects
    const todayStatistics = {
      period: "Today",
      payment: todayPayments,
      clicks: todayClicks,
      regist: todayRegisters,
      cvr: ((todayRegisters / todayClicks) * 100).toFixed(2),
      earn: todayEarns,
    };
    const thisWeekStatistics = {
      period: "This Week",
      payment: thisWeekPayments,
      clicks: thisWeekClicks,
      regist: thisWeekRegisters,
      cvr: ((thisWeekRegisters / thisWeekClicks) * 100).toFixed(2),
      earn: thisWeekEarns,
    };
    const thisMonthStatistics = {
      period: "This Month",
      payment: thisMonthPayments,
      clicks: thisMonthClicks,
      regist: thisMonthRegisters,
      cvr: ((thisMonthRegisters / thisMonthClicks) * 100).toFixed(2),
      earn: thisMonthEarns,
    };
    const TotalStatistics = {
      period: "Total",
      payment: totalPayments,
      clicks: totalClicks,
      regist: totalRegisters,
      cvr: ((totalRegisters / totalClicks) * 100).toFixed(2),
      earn: totalEarns,
    };

    res.json({
      status: true,
      msg: "Success",
      statistics: [
        todayStatistics,
        thisWeekStatistics,
        thisMonthStatistics,
        TotalStatistics,
      ],
    });
  } catch (error) {
    res.json({ error, message: "Update Status Unsuccessful" });
  }
});

module.exports = GetStatistics;
