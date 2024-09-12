const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const crypto = require("crypto");
const credentials = require("../../config/credentials.json");
let users = {};

router.post("/gmail-send", async (req, res) => {
  const { userGmail } = req.body;
  const verifyCode = crypto.randomBytes(5).toString("hex");

  console.log("verifycode", verifyCode);

  // Save the verification code against the user's email
  users["verifyCode"] = { verifyCode };

  const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
  );

  // Load token or redirect to auth URL
  const { tokens } = await oAuth2Client.getToken(
    process.env.AUTHOTIZATION_CODE
  );
  oAuth2Client.setCredentials(tokens);
  //   oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

  const auth = {
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  };

  //Send email with verification code
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userGmail,
    subject: "Your Verification Code",
    text: `Your verification code is ${verifyCode}`,
    html: "<h1>Hello, world</h1>",
  };

  // Create Gmail client
  const gmail = google.gmail({ version: "v1", auth });
  const emailLines = [
    "From:" + process.env.EMAIL_USER,
    "To: receiver@example.com",
    "Content-type: text/html;charset=iso-8859-1",
    "MIME-Version: 1.0",
    "Subject: Test Subject",
    "",
    "This is a test email",
  ];

  const email = emailLines.join("\r\n").trim();
  const base64Email = Buffer.from(email).toString("base64");
  try {
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: base64Email,
      },
    });
    // transport.sendMail(mailOptions, (err, info) => {
    //   if (err) {
    //     return res.send({ status: 0, msg: "Failed to send email", err: err });
    //   }
    //   res.status(200).json({ message: "Verification code sent" });
    // });
    res.send({ status: 1 });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

module.exports = router;
