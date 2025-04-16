// logger.js
const winston = require("winston");

// Create a logger instance
const logger = winston.createLogger({
  level: "info", // Default log level
  format: winston.format.combine(
    winston.format.timestamp(), // Add timestamp
    winston.format.json() // Log in JSON format
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Colorize console output
        winston.format.simple() // Simple format for console
      ),
    }),
    // File transport
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error", // Log only error messages to this file
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
    new winston.transports.File({
      filename: "logs/combined.log", // Log all messages to this file
    }),
  ],
});

// Export the logger
module.exports = logger;
