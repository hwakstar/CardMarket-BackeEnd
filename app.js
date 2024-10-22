const express = require("express");
const DbConnect = require("./src/config/db/DbConnect");
const cors = require("cors");
const https = require("https");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 5000;

// Load SSL certificate and key
const options = {
  key: fs.readFileSync("server.key"),
  cert: fs.readFileSync("server.cert"),
};

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Oripa frontend
app.use(express.static(path.join(__dirname, "Oripa")));
// Affiliate frontend
app.use(express.static(path.join(__dirname, "Affiliate")));

// Serve the uploads folder statically
app.use(
  "/uploads/gacha",
  express.static(path.join(__dirname, "uploads/gacha"))
);
app.use(
  "/uploads/prize",
  express.static(path.join(__dirname, "uploads/prize"))
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

// Routers for Oripa
const admin = require("./src/routes/admin");
const user = require("./src/routes/user");
const gacha = require("./src/routes/admin/gacha");
const point = require("./src/routes/user/point");
const payment = require("./src/routes/payment");
const mail = require("./src/routes/mail");
// Admin business router
app.use("/admin", admin);
app.use("/admin/gacha", gacha);
// User task router
app.use("/user", user);
app.use("/user/point", point);
app.use("/mail", mail);
// Payment router
app.use("/payment", payment);
app.get("/status", (req, res) => {
  res.send({ msg: "Server is running." });
});

// Routers for Affiliate
const affiliate_auth = require("./src/affiliate/routes/auth");
const affiliate_members = require("./src/affiliate/routes/members");
const affiliate_status = require("./src/affiliate/routes/status");
const affiliate_admin = require("./src/affiliate/routes/admin");
// Auth router
app.use("/api/affiliate/auth/", affiliate_auth);
app.use("/api/affiliate/members/", affiliate_members);
app.use("/api/affiliate/status/", affiliate_status);
app.use("/api/affiliate/admin/", affiliate_admin);

// The "catchall" handler: for any request that doesn't match one above, send back the React app.
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "Oripa", "index.html"));
// });

// Create HTTPS server
const PORT = 5000;
https.createServer(options, app).listen(PORT, () => {
  console.log(`HTTPS Server running on https://localhost:${PORT}`);
});

// execute database connection
DbConnect();
