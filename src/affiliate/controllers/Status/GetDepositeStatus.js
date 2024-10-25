const expressAsyncHandler = require("express-async-handler");

const PointLogs = require("../../../models/point_log");

const GetDepositeStatus = expressAsyncHandler(async (req, res) => {
  try {
    const affId = req.body.affId;
    const period = req.body.period;

    let match = { aff_id: affId };
    if (period === "Today") {
      // Get the start and end of today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0); // Start of the day (00:00)

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999); // End of the day (23:59:59.999)

      match.createdAt = { $gte: startOfDay, $lte: endOfDay };
    } else if (period === "This Week") {
      const startOfWeek = new Date();
      const endOfWeek = new Date();

      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Set to Sunday
      startOfWeek.setHours(0, 0, 0, 0); // Set to the start of the day

      endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay())); // Set to the next Saturday
      endOfWeek.setHours(23, 59, 59, 999); // Set to the end of the day

      match.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
    } else if (period === "This Month") {
      const startOfMonth = new Date();
      const endOfMonth = new Date();

      // Set to the first day of the current month
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0); // Start of the day

      // Set to the last day of the current month
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0); // Last day of the month
      endOfMonth.setHours(23, 59, 59, 999); // End of the day

      match.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const deposits = await PointLogs.aggregate([
      {
        // Match records by user_id
        $match: match,
      },
      {
        // Group by user_id and sum the point_num field
        $group: {
          _id: "$user_id",
          name: { $first: "$user_name" }, // Getting the first user_name found
          country: { $first: "$user_country" }, // Getting the first user_country found
          payment: { $sum: "$point_num" },
        },
      },
    ]);

    res.json({ status: true, msg: "Success", deposits: deposits });
  } catch (error) {
    res.json({ error, message: "Update Status Unsuccessful" });
  }
});

module.exports = GetDepositeStatus;
