const express = require("express");
const dbConnect = require("./src/config/db/dbConnect");
const cors = require("cors");
const path = require("path");

const app = express();
const port = process.env.PORT || 5000;
const bodyParser = require("body-parser");
const admin = require("./src/routes/admin");
const user = require("./src/routes/user");
const gacha = require("./src/routes/admin/gacha");
const point = require("./src/routes/user/point");
const payment = require("./src/routes/payment")
const mail = require("./src/routes/mail")
// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   ``;
//   res.setHeader(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
//   );
//   res.setHeader(
//     "Access-Control-Allow-Methods",
//     "GET, POST, PUT, DELETE, PATCH, OPTIONS"
//   );
//   next();
// });

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Serve the uploads folder statically
app.use(
  "/uploads/gacha_thumnail",
  express.static(path.join(__dirname, "uploads/gacha_thumnail"))
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

//router for admin business
app.use("/admin", admin);
app.use("/admin/gacha", gacha);
//router for user task
app.use("/user", user);
app.use("/user/point", point);
app.use("/mail", mail);
//router for payment
app.use("/payment", payment);
app.get("/status", ( req , res) => {
  res.send({msg: "Server is running."});
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// execute database connection
dbConnect();
