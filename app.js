const express = require("express");
const DbConnect = require("./src/config/db/DbConnect");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

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
// Auth router
app.use("/api/affiliate/auth/", affiliate_auth);
app.use("/api/affiliate/members/", affiliate_members);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// execute database connection
DbConnect();
