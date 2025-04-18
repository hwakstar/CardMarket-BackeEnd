const jwt = require("jsonwebtoken");
const adminSchemas = require("../models/admin");

module.exports = async function (req, res, next) {
  // Get token from header
  const token = req.header("Token");

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  // Verify token
  try {
    const statis = await adminSchemas.GachaVisitStatus.findOne();

    jwt.verify(token, "RANDOM-TOKEN", (error, decoded) => {
      if (error) {
        return res.status(401).json({ msg: "Token is not valid" });
      } else {
        req.body.user = decoded;

        if (statis.currentMaintance && decoded.role !== "admin")
          return res.send({ status: 2, msg: "Now Mainteniance Mode" });

        next();
      }
    });
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
};
