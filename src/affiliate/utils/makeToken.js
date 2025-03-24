const jwt = require("jsonwebtoken");

const makeToken = (payload) => {
  const token = jwt.sign(payload, process.env.JWT_KEY, {
    expiresIn: 60 * 60,
  });

  return token;
};

module.exports = makeToken;
