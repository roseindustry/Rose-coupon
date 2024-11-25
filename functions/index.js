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
const cors = require('cors');
//const db = require();

admin.initializeApp();

const corsHandler = cors({ origin: true });

// Nodemailer transporter (using Gmail)
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'admin@gmail.com', // Your email
//     pass: '#### #### #### ####',  // Your email password (use App Password if 2FA is enabled)
//   },
// });

// Nodemailer transporter (using Hostgators TITAN SMTP)
const transporter = nodemailer.createTransport({
  host: 'smtp.titan.email',
  port: 465,
  secure: true,
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.pass,
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
  const userData = data.userData;

  // Server-side validation based on role
  if (userData.role === 'afiliado') {
    if (!userData.companyName || !userData.rif || !userData.email || !userData.state || !userData.municipio || !userData.parroquia) {
      return { success: false, message: 'Campo obligatorio vacio: Nombre de la empresa, RIF, y Email son requeridos.' };
    }
  } else if (userData.role === 'cliente') {
    if (!userData.firstName || !userData.lastName || !userData.identification || !userData.email) {
      return { success: false, message: 'Campo obligatorio vacio: Nombre, Apellido, y Email son requeridos.' };
    }
  } else if (userData.role === 'mesero' || userData.role === 'promotora') {
    if (!userData.role || !userData.firstName || !userData.lastName || !userData.identification || !userData.email) {
      return { success: false, message: 'Campo obligatorio vacio: Rol, Nombre, Apellido, identificacion y Email son requeridos.' };
    }
  } else {
    return { success: false, message: 'Rol no reconocido.' };
  }

  try {
    // Generate a random password (e.g., 10 characters long)
    const tempPassword = generateRandomPassword(10);

    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: userData.email,
      password: tempPassword,
      displayName: userData.role === 'afiliado' ? userData.companyName : `${userData.firstName} ${userData.lastName}`,
    });

    // Save additional user info in Realtime Database
    const db = admin.database();
    let userInfo = {};

    if (userData.role === 'afiliado') {
      // Fields for 'afiliado'
      userInfo = {
        companyName: userData.companyName,
        rif: userData.rif,
        email: userData.email,
        role: userData.role,
        state: userData.state,
        municipio: userData.municipio,
        parroquia: userData.parroquia,
        // Optional fields
        category_id: userData.category_id || null,
        order: userData.order || null,
        image: userData.image || null,
        status: userData.status || null,
        phoneNumber: userData.phoneNumber || null,
        twitter: userData.twitter || null,
        instagram: userData.instagram || null,
        facebook: userData.facebook || null,
        tiktok: userData.tiktok || null,
      };
    } else if (userData.role === 'mesero' || userData.role === 'promotora') {
      // Fields for 'mesero' or 'promotora'
      userInfo = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        identification: userData.identification,
        email: userData.email,
        role: userData.role,
        codigoReferido: `REF-${userRecord.uid.slice(0, 3).toUpperCase()}${Date.now().toString().slice(-2)}`,
        // Optional fields
        // restaurantId: userData.restaurantId || null, // Example field specific to mesero
        // shift: userData.shift || null,              // Example field specific to mesero
        phoneNumber: userData.phoneNumber || null,
      };
    } else {
      // Fields for clients
      userInfo = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        identification: userData.identification,
        email: userData.email,
        role: userData.role,
        // Optional fields
        phoneNumber: userData.phoneNumber || null,
      };
    }

    await db.ref('Users/' + userRecord.uid).set(userInfo);

    // Send email with the temporary password
    const mailOptions = {
      from: functions.config().email.user,
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

// Update User's email on db and auth
exports.updateUserEmail = functions.https.onCall(async (data, context) => {

  const { uid, newEmail } = data;

  try {
    // Update the user's email in Firebase Authentication
    await admin.auth().updateUser(uid, {
      email: newEmail
    });

    // Update the 'email' field in the Database
    const userRef = admin.database().ref(`Users/${uid}`);
    await userRef.update({ email: newEmail });

    return { message: 'Email actualizado con exito!.' };
  } catch (error) {
    console.error('Error updating email:', error);
    throw new functions.https.HttpsError('unknown', 'Failed to update email');
  }
});

// Cloud Function to send an email
exports.sendEmail = functions.https.onCall(async (data, context) => {
  const { to, message } = data;

  // Create the email options
  const mailOptions = {
    from: functions.config().email.user, // sender address
    to: to, // list of receivers
    subject: message.subject, // Subject line
    text: message.text, // Plain text body
    html: message.html || message.text, // HTML body
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

// Cloud function to fetch all users in the auth list
exports.getAllUsers = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    console.log("Request received for getAllUsers");

    if (req.method !== "POST") {
      console.error("Invalid method:", req.method);
      return res.status(405).send({ error: "Method Not Allowed" });
    }

    const allUsers = [];
    let nextPageToken = null;

    try {
      do {
        console.log(`Fetching batch of users. Current pageToken: ${nextPageToken}`);
        // Ensure nextPageToken is passed only if it is not null
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken || undefined);

        const users = listUsersResult.users.map((userRecord) => ({
          uid: userRecord.uid,
          creationTime: userRecord.metadata.creationTime,
        }));

        allUsers.push(...users);

        // Update nextPageToken; if no more pages, it will be null
        nextPageToken = listUsersResult.pageToken || null;

      } while (nextPageToken);

      console.log(`Fetched ${allUsers.length} users successfully.`);
      return res.status(200).json({ users: allUsers });
    } catch (error) {
      console.error("Error fetching users:", error.message, error.stack);
      return res.status(500).json({
        error: "internal",
        message: "Unable to fetch user list",
      });
    }
  });
});