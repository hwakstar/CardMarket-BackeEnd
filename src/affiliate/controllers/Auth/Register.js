const expressAsyncHandler = require("express-async-handler");

const getToken = require("../../utils/GetToken");

const Users = require("../../models/UsersModel");
const RankModel = require("../../models/RankModel");

const Register = expressAsyncHandler(async (req, res) => {
  const { fullName, email, password, phoneNumber, country, role, type } =
    req.body;

  try {
    const checkMail = await Users.findOne({ email });

    if (checkMail) {
      res.json({ status: false, message: "existEmail" });
    } else {
      // add new rank id
      const userRank = await RankModel.findOne({ start_amount: 0 });

      // create new affiliate user
      const newUser = await Users.create({
        fullName,
        email,
        password,
        phoneNumber,
        country,
        role,
        rank: userRank._id,
      });

      // make token
      const token = getToken({
        user_id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
      });

      res.json({
        status: true,
        token,
        message: "successRegister",
        type: type,
        id: newUser.affiliateId,
      });
    }
  } catch (error) {
    res.json({ error, status: false, message: "failedRegister" });
  }
});

module.exports = Register;
