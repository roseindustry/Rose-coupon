/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// require('dotenv').config();
// const { defineSecret } = require("firebase-functions/params");

const { onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// Access email credentials (temporarily)
const EMAIL_USER = "admin@rosecoupon.com";
const EMAIL_PASS = "Huawei.1705";

// Nodemailer transporter (using Hostgators TITAN SMTP)
const transporter = nodemailer.createTransport({
  host: "smtp.titan.email",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Helper function to generate a random password
function generateRandomPassword(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Create new Users
exports.createUser = onRequest(async (req, res) => {
  // Handle CORS preflight and the actual request
  cors(req, res, async () => {
    const userData = req.body.userData;

    // Server-side validation based on role
    if (userData.role === "afiliado") {
      if (
        !userData.companyName ||
        !userData.rif ||
        !userData.email ||
        !userData.state ||
        !userData.municipio ||
        !userData.parroquia
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Campo obligatorio vacio: Nombre de la empresa, RIF, y Email son requeridos.",
        });
      }
    } else if (userData.role === "cliente") {
      if (
        !userData.firstName ||
        !userData.lastName ||
        !userData.identification ||
        !userData.email
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Campo obligatorio vacio: Nombre, Apellido, y Email son requeridos.",
        });
      }
    } else if (userData.role === "mesero" || userData.role === "promotora") {
      if (
        !userData.role ||
        !userData.firstName ||
        !userData.lastName ||
        !userData.identification ||
        !userData.email
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Campo obligatorio vacio: Rol, Nombre, Apellido, identificacion y Email son requeridos.",
        });
      }
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Rol no reconocido." });
    }

    try {
      // Generate a random password (e.g., 10 characters long)
      const tempPassword = generateRandomPassword(10);

      // Create user in Firebase Authentication
      const userRecord = await admin.auth().createUser({
        email: userData.email,
        password: tempPassword,
        displayName:
          userData.role === "afiliado"
            ? userData.companyName
            : `${userData.firstName} ${userData.lastName}`,
      });

      // Save additional user info in Realtime Database
      const db = admin.database();
      let userInfo = {};

      if (userData.role === "afiliado") {
        // Fields for 'afiliado'
        userInfo = {
          companyName: userData.companyName,
          rif: userData.rif,
          email: userData.email,
          role: userData.role,
          state: userData.state,
          municipio: userData.municipio,
          parroquia: userData.parroquia,
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
      } else if (userData.role === "mesero" || userData.role === "promotora") {
        // Fields for 'mesero' or 'promotora'
        userInfo = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          identification: userData.identification,
          email: userData.email,
          role: userData.role,
          codigoReferido: `REF-${userRecord.uid.slice(0, 3).toUpperCase()}${Date.now().toString().slice(-2)}`,
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
          phoneNumber: userData.phoneNumber || null,
        };
      }

      await db.ref("Users/" + userRecord.uid).set(userInfo);

      // Send email with the temporary password
      const mailOptions = {
        from: EMAIL_USER,
        to: userData.email,
        subject: "Tu contraseña temporal",
        text: `Estimado ${userData.role === "afiliado" ? userData.companyName : userData.firstName},\n\nSu cuenta ha sido creada en Rose App. Su contraseña temporal es: ${tempPassword}\nPor favor Inicie sesión y cambie su contraseña lo antes posible.\n\nAtentamente,\nRose App`,
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error creating client:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });
});

// Delete users
exports.deleteUser = onRequest(async (req, res) => {
  // Handle CORS preflight and the actual request
  cors(req, res, async () => {
    const { uid } = req.body;

    try {
      await admin.auth().deleteUser(uid);
      return res.status(200).json({ message: "Usuario eliminado con exito!" });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(400).json({ message: error.message });
    }
  });
});

// Update User's email on db and auth
exports.updateUserEmail = onRequest(async (req, res) => {
  // Handle CORS preflight and the actual request
  cors(req, res, async () => {
    const { uid, newEmail } = req.body;

    try {
      // Update the user's email in Firebase Authentication
      await admin.auth().updateUser(uid, {
        email: newEmail,
      });

      // Update the 'email' field in the Database
      const userRef = admin.database().ref(`Users/${uid}`);
      await userRef.update({ email: newEmail });

      return res.status(200).json({ message: "Email actualizado con exito!" });
    } catch (error) {
      console.error("Error updating email:", error);
      return res.status(500).json({ message: "Failed to update email" });
    }
  });
});

// Cloud Function to send an email (HTTP function)
exports.sendEmail = onRequest((req, res) => {
  // Handle CORS preflight and the actual request
  cors(req, res, async () => {
    // Validate the incoming request
    const { to, message } = req.body;

    if (!to || !message || !message.subject || !message.text) {
      return res
        .status(400)
        .send("Missing required fields: to, subject, and text in message");
    }

    // Create the email options
    const mailOptions = {
      from: EMAIL_USER,
      to: to, // list of receivers
      subject: message.subject, // Subject line
      text: message.text, // Plain text body
      html: message.html || message.text, // HTML body
    };

    try {
      // Send the email
      await transporter.sendMail(mailOptions);
      return res.status(200).send({ message: "Email sent successfully!" });
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).send("Unable to send email");
    }
  });
});

// Cloud function to fetch all users in the auth list
exports.getAllUsers = onRequest(async (req, res) => {
  // Handle CORS preflight and the actual request
  cors(req, res, async () => {
    const allUsers = [];
    let nextPageToken = null;

    try {
      // Fetch all users in the authentication list
      do {
        const listUsersResult = await admin
          .auth()
          .listUsers(1000, nextPageToken || undefined);
        const users = listUsersResult.users.map((userRecord) => ({
          uid: userRecord.uid,
          creationTime: userRecord.metadata.creationTime,
        }));
        allUsers.push(...users);
        nextPageToken = listUsersResult.pageToken || null;
      } while (nextPageToken);

      // Send the list of users as a JSON response
      res.status(200).json({ users: allUsers });
    } catch (error) {
      console.error("Error fetching users:", error.message, error.stack);
      res.status(500).json({
        error: "Unable to fetch user list",
        message: error.message,
      });
    }
  });
});
