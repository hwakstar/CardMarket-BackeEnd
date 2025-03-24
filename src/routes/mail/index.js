const express = require("express");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Nodemailer
// router.post("/gmail-send", async (req, res) => {
//   const toEmail = req.body.email;
//   const password = req.body.password;

//   // Generate a token for the user
//   const secretKey = process.env.CLIENT_SECRET; // Make this secure, store in env
//   const token = jwt.sign({ email: toEmail }, secretKey, { expiresIn: "1h" }); // 1 hour token

//   // Send verificaiton email
//   const transporter = nodemailer.createTransport({
//     service: "gmail", // Or any other email service like Outlook, SMTP, etc.
//     auth: {
//       user: "noreply@oripa.com", // Your email
//       pass: "oripa", // Your email password or app-specific password
//     },
//   });

//   const mailOptions = {
//     from: "noreply@oripa.com",
//     to: toEmail,
//     subject: "Verify your email for Oripa",
//     text: `Click on the link to verify your email: http://192.168.141.61:5000/verify-email/${token}`,
//   };

//   transporter.sendMail(mailOptions, (error, info) => {
//     if (error) {
//       return res.send({ status: 0, msg: "Failed to send email", error: error });
//     } else {
//       res.status(200).json({ status: 1, msg: "Email Sent: " + info.response });
//     }
//   });

//   // Verify email when the link is clicked
//   // app.get("/verify-email/:token", (req, res) => {
//   //   const token = req.params.token;

//   //   // Verify the token
//   //   jwt.verify(token, secretKey, (err, decoded) => {
//   //     if (err) {
//   //       return res.status(400).send("Invalid or expired token.");
//   //     }

//   //     // Find the user and verify their email
//   //     const user = users.find((u) => u.email === decoded.email);
//   //     if (!user) {
//   //       return res.status(404).send("User not found.");
//   //     }

//   //     user.verified = true;
//   //     res.send("Email verified successfully!");
//   //   });
//   // });
// });

router.post("/gmail-send", async (req, res) => {
  const { userGmail } = req.body;
  const verifyCode = crypto.randomBytes(5).toString("hex");

  // Save the verification code against the user's email
  users["verifyCode"] = { verifyCode };

  const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL,
  );

  // Load token or redirect to auth URL
  const {tokens} = await oAuth2Client.getToken(process.env.AUTHOTIZATION_CODE);
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
  const gmail = google.gmail({version: 'v1', auth});
  const emailLines = [
    'From:' +  process.env.EMAIL_USER,
    'To: receiver@example.com',
    'Content-type: text/html;charset=iso-8859-1',
    'MIME-Version: 1.0',
    'Subject: Test Subject',
    '',
    'This is a test email'
  ];

  const email = emailLines.join('\r\n').trim();
  const base64Email = Buffer.from(email).toString('base64');
  try {
    await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: base64Email
        }
    });
    // transport.sendMail(mailOptions, (err, info) => {
    //   if (err) {
    //     return res.send({ status: 0, msg: "Failed to send email", err: err });
    //   }
    //   res.status(200).json({ message: "Verification code sent" });
    // });
    res.send({status: 1});
  } catch (error) {
    res.send(error);
  }
});

module.exports = router;
