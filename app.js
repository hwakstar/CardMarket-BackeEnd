const express = require("express");
const DbConnect = require("./src/config/db/dbConnect");
// const DbConnect = require("./src/config/db/dbConnectLocal");
const cors = require("cors");
const https = require("https");
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

app.use(cors(corsOptions));
app.use(bodyParser.json());

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// execute database connection
DbConnect();
