const jwt = require("jsonwebtoken");

const getToken = (user_id) => {
  const token = jwt.sign({ user_id: user_id }, process.env.JWT_KEY, {
    expiresIn: 60 * 60,
  });
  return token;
};

module.exports = getToken;
