const express = require("express");
const router = express.Router();

// controllers
const Regsiter = require("../controllers/Auth/Register");
const Login = require("../controllers/Auth/Login");
const ChangePsd = require("../controllers/Auth/ChangePsd");
const GetTime = require("../controllers/Auth/GetTime");

// middlewares
const AuthHandler = require("../middlewares/AuthHandler");

// routers
router.post("/register", Regsiter);
router.post("/login", Login);

// for development purposes
router.get("/time", AuthHandler, GetTime);
router.get("/changePsd", AuthHandler, ChangePsd);

module.exports = router;
