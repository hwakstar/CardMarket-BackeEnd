const mongoose = require("mongoose");
require("dotenv").config();

// async function dbConnect() {
//   mongoose
//     .connect(process.env.DB, {
//       //   these are options to ensure that the connection is done properly
//       useNewUrlParser: true,
//       // useUnifiedTopology: true,
//       // useCreateIndex: true
//     })
//     .then(() => {
//       console.log("Successfully connected to MongoDB!");
//     })
//     .catch((error) => {
//       console.log("Unable to connect to MongoDB!");
//       console.error(error);
//     });
// }

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
