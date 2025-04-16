// Online Version
const mongoose = require("mongoose");
require("dotenv").config();

const DbConnect = async () => {
  try {
    const URI = process.env.MONGO_URL; // Your connection string
    const db_name = process.env.DB_NAME; // Your database name

    mongoose
      .connect(URI, {
        dbName: db_name,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        // tls: true, // Add this line
      })
      .then(() => {
        console.log("✅ MongoDB Connected!");
      })
      .catch((err) => {
        console.log("💥 DB Connection Error: ", err);
      });

    // Connection events
    mongoose.connection.on("connected", () => {
      console.log("✅ Mongoose Connected");
    });
    mongoose.connection.on("error", (err) => {
      console.log("💥 Mongoose Connection Error: ", err);
    });
    mongoose.connection.on("disconnected", () => {
      console.log("❌ Mongoose Connection Disconnected");
    });

    // Handle process termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  } catch (error) {
    console.log("💥 DB Connection Error: ", error);
    process.exit();
  }
};

module.exports = DbConnect;
