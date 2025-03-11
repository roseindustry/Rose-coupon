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

const { onCall } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });
const functions = require("firebase-functions");

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
exports.createUser = onRequest({
  cors: true,
  maxInstances: 10
}, async (req, res) => {
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

    // Validate Payment Details
    if (!userData.paymentDetails || 
      !userData.paymentDetails.bank || 
      !userData.paymentDetails.identification || 
      !userData.paymentDetails.phoneNumber || 
      !userData.paymentDetails.bankAccount) {
      return res.status(400).json({
        success: false,
        message: "Todos los datos de pago del afiliado son requeridos.",
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
    const db = getDatabase();
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
        paymentDetails: {
          bank: userData.paymentDetails.bank,
          identification: userData.paymentDetails.identification,
          phoneNumber: userData.paymentDetails.phoneNumber,
          bankAccount: userData.paymentDetails.bankAccount,
        }
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

// Delete users
exports.deleteUser = onRequest({
  cors: true,
  maxInstances: 10
}, async (req, res) => {
  const { uid } = req.body;

  try {
    await admin.auth().deleteUser(uid);
    return res.status(200).json({ message: "Usuario eliminado con exito!" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(400).json({ message: error.message });
  }
});

// Update User's email on db and auth
exports.updateUserEmail = onRequest({
  cors: true,
  maxInstances: 10
}, async (req, res) => {
  const { uid, newEmail } = req.body;

  try {
    // Update the user's email in Firebase Authentication
    await admin.auth().updateUser(uid, {
      email: newEmail,
    });

    // Update the 'email' field in the Database
    const userRef = getDatabase().ref(`Users/${uid}`);
    await userRef.update({ email: newEmail });

    return res.status(200).json({ message: "Email actualizado con exito!" });
  } catch (error) {
    console.error("Error updating email:", error);
    return res.status(500).json({ message: "Failed to update email" });
  }
});

// Cloud Function to send an email (HTTP function)
exports.sendEmail = onRequest({
  cors: true,
  maxInstances: 10
}, async (req, res) => {
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

// Cloud function to fetch all users in the auth list
exports.getAllUsers = onRequest({
  cors: true,
  maxInstances: 10
}, async (req, res) => {
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

const getDatabase = () => admin.database();

exports.verifyPurchaseCode = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  // Get parameters from query string
  const { clientId, code } = req.query;
  
  try {
    // Log the incoming request parameters
    console.log('Verifying code for:', { clientId, code });

    const snapshot = await getDatabase().ref(`verificationCodes/${clientId}`).get();

    // Log if code exists
    console.log('Code exists:', snapshot.exists());

    if (!snapshot.exists()) {
      res.status(404).json({
        error: "El código no existe. Por favor, solicite uno nuevo."
      });
      return;
    }

    const { code: storedCode, createdAt } = snapshot.val();

    // Log the stored code and entered code for comparison
    console.log('Comparing codes:', { storedCode, enteredCode: code });

    // Check if the entered code matches the stored code
    if (Number(storedCode) !== Number(code)) {
      res.status(400).json({
        error: 'Código incorrecto.'
      });
      return;
    }

    // Check if the code is within the 5-minute validity window
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - createdAt > fiveMinutes) {
      res.status(400).json({
        error: "El código de verificación ha expirado. Por favor, solicite uno nuevo."
      });
      return;
    }

    // Delete the used code
    await getDatabase().ref(`verificationCodes/${clientId}`).remove();

    res.json({
      valid: true,
      message: 'Código verificado exitosamente'
    });

  } catch (error) {
    // Log the full error
    console.error("Error verifying code:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Error al verificar el código. Por favor, intenta de nuevo.'
    });
  }
});

exports.sendPurchaseCode = onRequest({
  cors: true,
  maxInstances: 10
}, async (req, res) => {
  // Get client data from query parameters
  const clientId = req.query.id;
  const email = req.query.email;
  const firstName = req.query.firstName || '';
  const lastName = req.query.lastName || '';
  
  const client = { id: clientId, email, firstName, lastName };
  
  try {
    // Validate client data
    if (!client || !client.id) {
      return res.status(400).json({
        success: false,
        message: 'Datos del cliente inválidos'
      });
    }

    if (!client.email) {
      return res.status(400).json({
        success: false,
        message: 'El cliente no tiene email registrado.'
      });
    }

    // Check rate limiting
    const rateLimitRef = admin.database().ref(`rateLimits/verificationCodes/${client.id}`);
    const rateLimitSnapshot = await rateLimitRef.get();
    const now = Date.now();
    
    if (rateLimitSnapshot.exists()) {
      const { attempts = 0, firstAttempt = now } = rateLimitSnapshot.val();
      
      // Reset if it's been more than 24 hours since first attempt
      if (now - firstAttempt > 24 * 60 * 60 * 1000) {
        await rateLimitRef.set({
          attempts: 1,
          firstAttempt: now,
          lastAttempt: now
        });
      } else {
        // Check if max attempts reached within 24 hours
        if (attempts >= 10) {
          return res.status(429).json({
            success: false,
            message: 'Has excedido el límite de intentos. Por favor, intenta de nuevo mañana.'
          });
        }
        
        // Check if minimum time between attempts has passed (2 minutes)
        const { lastAttempt } = rateLimitSnapshot.val();
        const timeSinceLastAttempt = now - lastAttempt;
        if (timeSinceLastAttempt < 2 * 60 * 1000) { // 2 minutes in milliseconds
          const waitTime = Math.ceil((2 * 60 * 1000 - timeSinceLastAttempt) / 1000);
          return res.status(429).json({
            success: false,
            message: `Por favor espera ${waitTime} segundos antes de solicitar otro código.`
          });
        }
        
        // Update attempts
        await rateLimitRef.update({
          attempts: attempts + 1,
          lastAttempt: now
        });
      }
    } else {
      // First attempt
      await rateLimitRef.set({
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now
      });
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    try {
      // Store the code in Firebase first
      await admin.database().ref(`verificationCodes/${client.id}`).set({
        code: verificationCode,
        createdAt: now
      });

      // Create email payload
      const emailPayload = {
        to: client.email,
        message: {
          subject: "Su Código de verificación",
          text: `Hola ${client.firstName || ''}, tu código de verificación de RoseCoupon es: ${verificationCode}.`,
          html: `<p>Hola ${client.firstName || ''}, tu código de verificación de RoseCoupon es: ${verificationCode}.</p>`
        }
      };

      // Send email using the sendEmail function
      const emailResponse = await transporter.sendMail({
        from: EMAIL_USER,
        to: client.email,
        subject: emailPayload.message.subject,
        text: emailPayload.message.text,
        html: emailPayload.message.html
      });

      console.log('Email sent successfully:', emailResponse);

      // If we get here, both code storage and email sending were successful
      const firstAttempt = rateLimitSnapshot.exists() ? rateLimitSnapshot.val().firstAttempt : now;
      const attempts = rateLimitSnapshot.exists() ? rateLimitSnapshot.val().attempts : 1;

      return res.status(200).json({
        success: true,
        message: 'Código enviado exitosamente. Tienes 5 minutos para usarlo.',
        rateLimit: {
          remainingAttempts: 5 - attempts,
          cooldownEnds: now + (2 * 60 * 1000),
          resetTime: firstAttempt + (24 * 60 * 60 * 1000)
        }
      });

    } catch (emailError) {
      // If email fails, delete the stored code and throw error
      console.error('Error sending email:', emailError);
      try {
        await admin.database().ref(`verificationCodes/${client.id}`).remove();
      } catch (deleteError) {
        console.error('Error cleaning up verification code:', deleteError);
      }
      return res.status(500).json({
        success: false,
        message: 'Error al enviar el código por email. Por favor intente nuevamente.'
      });
    }

  } catch (error) {
    console.error("Error in sendPurchaseCode:", error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
});