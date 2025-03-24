const expressAsyncHandler = require("express-async-handler");

const jwt = require("jsonwebtoken");

const Users = require("../models/UsersModel");

const AuthHandler = expressAsyncHandler(async (req, res, next) => {
  let token;

  if (!req.headers.authorization?.startsWith("Bearer"))
    return res.status(401).json({ msg: "Please provide the bearer token" });

  try {
    token = req.headers.authorization.replace("Bearer ", "");

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_KEY);

      const user = await Users.findById(decoded?.id).select("-password");

      req.user = user;
      next();
    } else {
      return res.status(401).json({ msg: "No token, authorization denied" });
    }
  } catch (error) {
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = AuthHandler;
