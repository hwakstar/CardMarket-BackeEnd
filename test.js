const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');



const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Sends an SMS message using AWS SNS.
 * @param {string} phoneNumber - The recipient's phone number in E.164 format.
 * @param {string} message - The message to send.
 */
async function sendSms(phoneNumber, message) {
  const params = {
    PhoneNumber: phoneNumber, // E.164 format: +12345678901
    Message: message,
    MessageAttributes: {
      'AWS.SNS.SMS.SenderID': {
        DataType: 'String',
        StringValue: 'Oripa',
      },
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional',
      },
    },
  };

  const command = new PublishCommand(params);

  try {
    const response = await snsClient.send(command);
    console.log('Message sent successfully:', response);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Example usage
const phoneNumber = '+08033372305'; // Replace with the actual phone number
const message = `VerifyCode: 888777
 Thanks for Naoki Takahashi's help
`;

console.log(message)

const result = sendSms(phoneNumber, message);

console.log(result)