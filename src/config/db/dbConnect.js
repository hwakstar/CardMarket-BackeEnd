const mongoose = require("mongoose");
require("dotenv").config();

const DbConnect = async () => {
  try {
    await mongoose.set("strictQuery", false);
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
    });
    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.log(`Error: ${error.message}`);
    process.exit();
  }
};

module.exports = DbConnect;
