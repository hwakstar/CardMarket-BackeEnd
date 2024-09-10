const jwt = require("jsonwebtoken");
// const config = require('config');

module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header("Token");
  console.log("token---------->", token);
  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  // Verify token
  try {
    jwt.verify(token, "RANDOM-TOKEN", (error, decoded) => {
      if (error) {
        return res.status(401).json({ msg: "Token is not valid" });
      } else {
        req.body.user = decoded;
        // console.log("auth req.user----->", decoded.user);
        next();
      }
    });
  } catch (err) {
    console.error("something wrong with auth middleware");
    res.status(500).json({ msg: "Server Error" });
  }
};
