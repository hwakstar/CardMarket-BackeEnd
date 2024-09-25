const expressAsyncHandler = require("express-async-handler");

const getToken = require("../../utils/GetToken");

const Users = require("../../models/UsersModel");

const Register = expressAsyncHandler(async (req, res) => {
  const { fullName, email, password, phoneNumber, country, role } = req.body;

  try {
    const checkMail = await Users.findOne({ email });
    if (checkMail) {
      res.json({
        status: false,
        message: "Email already exists. Try with a different one.",
      });
    } else {
      const user = await Users.create({
        fullName,
        email,
        password,
        phoneNumber,
        country,
        role
      });

      const token = getToken({ user_id: user.id, fullName: user.fullName });

      res.json({
        status: true,
        token,
        message: "Registration successful",
        id: user.affiliateId,
      });
    }
  } catch (error) {
    res.json({ error, message: "Registration unsuccessful" });
  }
});

module.exports = Register;
