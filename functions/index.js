/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
//const db = require();

admin.initializeApp();

// Nodemailer transporter (using Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'joselinq38@gmail.com', // Your email
    pass: 'slsb aovm ypbi zzpj',  // Your email password (use App Password if 2FA is enabled)
  },
});

// Helper function to generate a random password
function generateRandomPassword(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Create new Users 
exports.createUser = functions.https.onCall(async (data, context) => {
  const userData  = data.userData ;

  try {
    // Generate a random password (e.g., 10 characters long)
    const tempPassword = generateRandomPassword(10);

    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: userData.email,
      password: tempPassword,
      displayName: userData.role === 'afiliado' ? userData.companyName : `${userData.firstName} ${userData.lastName}`,
    });

    // Save additional client info in Firestore or Realtime Database
    const db = admin.database();
    const userInfo = userData.role === 'afiliado' ? {
      companyName: userData.companyName,
      rif: userData.rif,
      sector: userData.sector,
      address: userData.address,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      role: userData.role,
      status: userData.status,
      image: userData.image
    } : {
      firstName: userData.firstName,
      lastName: userData.lastName,
      identification: userData.identification,
      sector: userData.sector,
      address: userData.address,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      role: userData.role
    };

    await db.ref('Users/' + userRecord.uid).set(userInfo);

    // Send email with the temporary password
    const mailOptions = {
      from: 'joselinq38@gmail.com',
      to: userData.email,
      subject: 'Tu contraseña temporal',
      text: `Estimado ${userData.role === 'afiliado' ? userData.companyName : userData.firstName},\n\nSu cuenta ha sido creada en Rose App. Su contraseña temporal es: ${tempPassword}\nPor favor Inicie sensión y cambie su contraseña lo antes posible.\n\nAtentamente,\nRose App`,
    };

    await transporter.sendMail(mailOptions);

    return { success: true };
  } catch (error) {
    console.error("Error creating client:", error);
    return { success: false, message: error.message };
  }
});

// Delete users
exports.deleteUser = functions.https.onCall((data, context) => {
    const uid = data.uid;

    return admin.auth().deleteUser(uid)
        .then(() => {
            return { message: 'Usuario eliminado con exito!' };
        })
        .catch((error) => {
            throw new functions.https.HttpsError('failed-precondition', error.message);
        });
});

// Cloud Function to send an email
exports.sendEmail = functions.https.onCall(async (data, context) => {
  const { to, message } = data;

  // Create the email options
  const mailOptions = {
    from: 'joselinq38@gmail.com', // sender address
    to: to, // list of receivers
    subject: message.subject, // Subject line
    text: message.text, // Plain text body
  };

  try {
    // Send the email
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Email sent successfully!' };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', 'Unable to send email');
  }
});