const expressAsyncHandler = require("express-async-handler");

const getToken = require("../../utils/GetToken");

const Users = require("../../models/UsersModel");

const Register = expressAsyncHandler(async (req, res) => {
  const { fullName, email, password, phoneNumber, country } = req.body;

  if (!fullName || !email || !password || !phoneNumber || !country) {
    throw new Error("Please enter your credentials");
  }

  const checkMail = await Users.findOne({ email });
  if (checkMail) {
    throw new Error("Email already exists, try with a different one");
  }

  try {
    const user = await Users.create({
      fullName,
      email,
      password,
      phoneNumber,
      country,
    });

    let token = getToken(user.id);

    res.json({
      token,
      message: "Registration successful",
      id: user.affiliateId,
    });
  } catch (error) {
    res.json({ error, message: "Registration unsuccessful" });
  }
});

module.exports = Register;
