// Online Version
// const mongoose = require("mongoose");
// require("dotenv").config();

// const DbConnect = async () => {
//   try {
//     const URI = process.env.MONGO_URL; // Your connection string
//     const db_name = process.env.DB_NAME; // Your database name

//     mongoose
//       .connect(URI, {
//         dbName: db_name,
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//         tls: true, // Add this line
//       })
//       .then(() => {
//         console.log("mongodb connected");
//       })
//       .catch((err) => console.log(err.message));

//     // Connection events
//     mongoose.connection.on("connected", () => {
//       console.log("Mongoose connected to DB");
//     });
//     mongoose.connection.on("error", (err) => {
//       console.log(err.message);
//     });
//     mongoose.connection.on("disconnected", () => {
//       console.log("Mongoose connection is disconnected");
//     });

//     // Handle process termination
//     process.on("SIGINT", async () => {
//       await mongoose.connection.close();
//       process.exit(0);
//     });
//   } catch (error) {
//     console.log(`Error: ${error.message}`);
//     process.exit();
//   }
// };

// module.exports = DbConnect;

// Local Version
const mongoose = require("mongoose");
require("dotenv").config();

async function dbConnect() {
  mongoose
    .connect(process.env.DB, {
      //   these are options to ensure that the connection is done properly
      useNewUrlParser: true,
      // useUnifiedTopology: true,
      // useCreateIndex: true
    })
    .then(() => {
      console.log("Successfully connected to MongoDB!");
    })
    .catch((error) => {
      console.log("Unable to connect to MongoDB!");
      console.error(error);
    });
}

module.exports = dbConnect;
