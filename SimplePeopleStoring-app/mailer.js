const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Shortcut for Gmail's SMTP settings - see Well-Known Services
  port: 465,
  secure: true,
  auth: {
    type: "OAuth2",
    user: "no-reply@aj-formation.com",
    serviceClient: process.env.SERVICE_CLIENT,
    privateKey: process.env.SERVICE_CLIENT_SECRET.replace(/\\n/g, "\n"),
    scope: "https://mail.google.com/",
  }
});

transporter.verify((err, success) => {
  if (err) console.error("Verify failed:", err);
  else console.log("SMTP ready :", success);
})

async function sendTo(to, subject, html){
  return transporter.sendMail({
    from: "AJ-Formation <no-reply@aj-formation.com>",
    to: to,
    subject: subject,
    html: html
  });
}

module.exports = {sendTo};