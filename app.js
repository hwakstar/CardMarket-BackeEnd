const express = require("express");
const DbConnect = require("./src/config/db/dbConnect");
// const DbConnect = require("./src/config/db/dbConnectLocal");
const cors = require("cors");
const https = require("https");
const socketIo = require("socket.io");
const http = require("http");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;

// // Load SSL certificate and key
// const options = {
//   key: fs.readFileSync("server.key"),
//   cert: fs.readFileSync("server.cert"),
// };

const corsOptions = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  optionSuccessStatus: 200,
};

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "50mb",
    parameterLimit: 100000,
  })
);

app.use(
  bodyParser.json({
    limit: "50mb",
    parameterLimit: 100000,
  })
);

app.use(
  bodyParser.raw({
    limit: "50mb",
    inflate: true,
    parameterLimit: 100000,
  })
);

app.use(cors(corsOptions));

// Oripa frontend
app.use(express.static(path.join(__dirname, "oripa")));
// Affiliate frontend
// app.use(express.static(path.join(__dirname, "affiliate")));

// Serve the uploads folder statically
app.use(
  "/uploads/gacha",
  express.static(path.join(__dirname, "uploads/gacha"))
);
app.use(
  "/uploads/prize",
  express.static(path.join(__dirname, "uploads/prize"))
);
app.use(
  "/uploads/rubbish",
  express.static(path.join(__dirname, "uploads/rubbish"))
);
app.use("/template", express.static(path.join(__dirname, "template")));
app.use(
  "/uploads/point",
  express.static(path.join(__dirname, "uploads/point"))
);
app.use(
  "/uploads/users",
  express.static(path.join(__dirname, "uploads/users"))
);
app.use("/uploads/blog", express.static(path.join(__dirname, "uploads/blog")));
app.use("/uploads/rank", express.static(path.join(__dirname, "uploads/rank")));
app.use("/uploads/logo", express.static(path.join(__dirname, "uploads/logo")));
app.use(
  "/uploads/carousel",
  express.static(path.join(__dirname, "uploads/carousel"))
);
app.use(
  "/uploads/affRank",
  express.static(path.join(__dirname, "uploads/affRank"))
);
app.use(
  "/uploads/prizeVideo",
  express.static(path.join(__dirname, "uploads/prizeVideo"))
);

// Routers for Oripa
const admin = require("./src/routes/admin");
const user = require("./src/routes/user");
const drawLog = require("./src/routes/user/drawlog");
const gacha = require("./src/routes/admin/gacha");
const point = require("./src/routes/user/point");
const mail = require("./src/routes/mail");
// Admin business router
app.use("/admin", admin);
app.use("/admin/gacha", gacha);
// User task router
app.use("/user", user);
app.use("/user/point", point);
app.use("/user/drawlog", drawLog);
app.use("/mail", mail);
app.get("/status", (req, res) => {
  res.send({ msg: "Server is running." });
});

// Routers for Affiliate
const affiliate_auth = require("./src/affiliate/routes/auth");
const affiliate_members = require("./src/affiliate/routes/members");
const affiliate_status = require("./src/affiliate/routes/status");
const affiliate_admin = require("./src/affiliate/routes/admin");
const affiliate_link = require("./src/affiliate/routes/link");
// Auth router
app.use("/api/affiliate/auth/", affiliate_auth);
app.use("/api/affiliate/members/", affiliate_members);
app.use("/api/affiliate/status/", affiliate_status);
app.use("/api/affiliate/admin/", affiliate_admin);
app.use("/api/affiliate/link/", affiliate_link);

// Oripa Frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "oripa", "index.html"));
});
// Catch-all handler for any other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "oripa", "index.html"));
});
// Affiliate Frontend
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "affiliate", "index.html"));
// });

// Create HTTPS server
// https.createServer(options, app).listen(port, () => {
//   console.log(`HTTPS Server running on https://localhost:${port}`);
// });

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*", // Your frontend origin
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true, // Allow credentials if necessary
  },
});

io.on("connection", (socket) => {
  socket.on("maintance", ({ maintance }) => {
    socket.broadcast.emit("maintance", {
      maintance: maintance,
    });
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
// execute database connection
DbConnect();

// ==============================
//     SCHEDULED
// ==============================

var schedule = require("node-schedule");
const GachaTicketSchema = require("./src/models/admin").GachaTicketSchema;
const UserSchema = require("./src/models/user").UserSchema; // Assuming you have a UserSchema

function Schedule_Of_Oripa() {
  console.log(`
    ==========================
          Scheduled!
    ==========================    
    `);

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Set time to midnight

  const nextDay = new Date(currentDate);
  nextDay.setDate(currentDate.getDate() + 1);

  GachaTicketSchema.aggregate([
    {
      $match: {
        expireDate: {
          $gte: currentDate, // Greater than or equal to current date
          $lt: nextDay, // Less than the start of the next day
        },
        deliverStatus: "notSelected",
      },
    },
    {
      $group: {
        _id: "$user_id", // Group by user_id
        totalCashback: { $sum: "$cashback" }, // Sum the cashback amounts
      },
    },
  ])
    .then((tickets) => {
      // Check if tickets are found
      if (tickets.length === 0) {
        console.log("No tickets found for today.");
        return;
      }

      // Process each ticket
      const updatePromises = tickets.map((ticket) => {
        // Update the deliverStatus of the GachaTicket
        return GachaTicketSchema.updateOne(
          { user_id: ticket._id, deliverStatus: "notSelected" }, // Find the ticket by user_id
          { $set: { deliverStatus: "returned" } } // Set deliverStatus to "returned"
        ).then(() => {
          // Update the user's points
          return UserSchema.updateOne(
            { _id: ticket._id }, // Find user by user_id
            { $inc: { point_remain: ticket.totalCashback } } // Increment point_remain by totalCashback
          );
        });
      });

      // Wait for all updates to complete
      return Promise.all(updatePromises);
    })
    .then(() => {
      console.log("All tickets processed and users updated successfully.");
    })
    .catch((error) => {
      console.error("Error processing tickets:", error);
    });
}

// Example of scheduling the function to run daily at midnight
schedule.scheduleJob({ hour: 0, minute: 0 }, Schedule_Of_Oripa);
