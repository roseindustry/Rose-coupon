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

exports.verifyCode = onRequest({
  cors: true // Enable CORS properly
}, async (req, res) => {
  try {
    const { clientId, code, type } = req.body;

    // Validate request data
    if (!clientId || !code || !type) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos'
      });
    }

    // Get stored verification code
    const verificationRef = admin.database().ref(`verificationCodes/${clientId}/${type}`);
    const snapshot = await verificationRef.get();

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Código no encontrado o expirado'
      });
    }

    const verification = snapshot.val();
    const now = Date.now();

    // Check if code has expired (5 minutes)
    if (now - verification.createdAt > 5 * 60 * 1000) {
      await verificationRef.remove();
      return res.status(400).json({
        success: false,
        message: 'El código ha expirado'
      });
    }

    // Verify code
    // Error response if code is invalid
    if (verification.code.toString() !== code.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Código inválido'
      });
    }

    // Delete used verification code
    await verificationRef.remove();

    // Success response
    return res.status(200).json({
      success: true,
      message: 'Código verificado exitosamente'
    });       

  } catch (error) {
    console.error('Error in verifyCode:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

exports.sendVerificationCode = onRequest({
  cors: true,
  maxInstances: 10 // Limit the number of instances to 10
}, async (req, res) => {
  // Get data from query parameters
  const { id, email, phone = null, firstName, lastName, type, newValue = null } = req.query;
  const client = { id, email, firstName, lastName, phone };
  
  try {
    // Validate request data
    if (!client || !client.id || !type ) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos'
      });
    }

    // Validate contact method based on verification type
    if ((type === 'email' && !newValue.includes('@')) || 
        (type === 'phone' && !/^\d{10}$/.test(newValue))) {
      return res.status(400).json({
        success: false,
        message: `${type === 'email' ? 'Email' : 'Teléfono'} inválido`
      });
    }

    // Check rate limiting
    const rateLimitRef = admin.database().ref(`rateLimits/verificationCodes/${client.id}/${type}`);
    const rateLimitSnapshot = await rateLimitRef.get();
    const now = Date.now();
    
    if (rateLimitSnapshot.exists()) {
      const { attempts = 0, firstAttempt = now } = rateLimitSnapshot.val();
      
      // Reset if it's been more than 24 hours
      if (now - firstAttempt > 24 * 60 * 60 * 1000) {
        await rateLimitRef.set({
          attempts: 1,
          firstAttempt: now,
          lastAttempt: now
        });
      } else {
        // Check max attempts (5 per 24h)
        if (attempts >= 5) {
          return res.status(429).json({
            success: false,
            message: 'Has excedido el límite de intentos. Por favor, intenta de nuevo mañana.'
          });
        }
        
        // Check cooldown period (2 min)
        const { lastAttempt } = rateLimitSnapshot.val();
        const timeSinceLastAttempt = now - lastAttempt;
        if (timeSinceLastAttempt < 2 * 60 * 1000) {
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
      // Store the code with its type and new value
      await admin.database().ref(`verificationCodes/${client.id}/${type}`).set({
        code: verificationCode,
        newValue: newValue, // Store the new value with the code
        createdAt: Date.now()
      });

      // Send code based on type
      if (type === 'email') {
        await transporter.sendMail({
          from: EMAIL_USER,
          to: newValue, // Send to the new email
          subject: "Código de Verificación de Email",
          html: `
            <h3>Verificación de Email</h3>
            <p>Hola ${client.firstName || ''},</p>
            <p>Tu código de verificación es: <strong>${verificationCode}</strong></p>
            <p>Este código expirará en 5 minutos.</p>
          `
        });
      } else if (type === 'phone') {
        console.log('Coming soon');
        // Send SMS (implement your SMS service here)
        // For example, using Twilio or similar service
        // await sendSMS(newValue, `Tu código de verificación es: ${verificationCode}`);
      } else if (type === 'purchase') {
        await transporter.sendMail({
          from: EMAIL_USER,
          to: client.email,
          subject: "Código de Verificación de Compra",
          html: `
            <h3>Verificación de Compra</h3>
            <p>Hola ${client.firstName || ''},</p>
            <p>Tu código de verificación para tu compra es: <strong>${verificationCode}</strong></p>
            <p>Este código expirará en 5 minutos.</p>
          `
        });
      }

      // Return success response
      return res.status(200).json({
        success: true,
        message: 'Código enviado exitosamente. Tienes 5 minutos para usarlo.',
        rateLimit: {
          remainingAttempts: 5 - (rateLimitSnapshot.exists() ? rateLimitSnapshot.val().attempts : 0),
          cooldownEnds: now + (2 * 60 * 1000),
          resetTime: (rateLimitSnapshot.exists() ? rateLimitSnapshot.val().firstAttempt : now) + (24 * 60 * 60 * 1000)
        }
      });

    } catch (sendError) {
      // Clean up stored code if sending fails
      console.error('Error sending verification code:', sendError);
      await admin.database().ref(`verificationCodes/${client.id}/${type}`).remove();
      
      return res.status(500).json({
        success: false,
        message: `Error al enviar el código por ${type === 'email' ? 'email' : 'SMS'}. Por favor intente nuevamente.`
      });
    }

  } catch (error) {
    console.error("Error in sendVerificationCode:", error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
});

// Request field update function
exports.requestFieldUpdate = onRequest({
  cors: true,
  maxInstances: 10
}, async (req, res) => {
  try {
    const { userId, userName, fieldName, fieldLabel, currentValue, userEmail } = req.body;

    // Validate request data
    if (!userId || !fieldName || !fieldLabel) {
      return res.status(400).json({
        success: false,
        message: 'Datos incompletos para la solicitud'
      });
    }

    // Create email content
    const mailOptions = {
      from: EMAIL_USER,
      to: EMAIL_USER, // Send to admin email
      subject: 'Solicitud de Actualización de Datos de Usuario',
      html: `
        <h3>Solicitud de Actualización de Datos</h3>
        <p><strong>Usuario:</strong> ${userName}</p>
        <p><strong>ID:</strong> ${userId}</p>
        <p><strong>Email del usuario:</strong> ${userEmail}</p>
        <p><strong>Campo a actualizar:</strong> ${fieldLabel}</p>
        <p><strong>Valor actual:</strong> ${currentValue}</p>
        <hr>
        <p>Para procesar esta solicitud, por favor verificar la identidad del usuario 
        y realizar los cambios necesarios en el panel de administración.</p>
      `
    };

    // Send confirmation email to user
    const userMailOptions = {
      from: EMAIL_USER,
      to: userEmail,
      subject: 'Solicitud de Actualización Recibida',
      html: `
        <h3>Hemos recibido tu solicitud de actualización</h3>
        <p>Hola ${userName},</p>
        <p>Tu solicitud para actualizar el campo "${fieldLabel}" ha sido recibida.</p>
        <p>Nos pondremos en contacto contigo pronto para procesar tu solicitud.</p>
        <p>Gracias por tu paciencia.</p>
      `
    };

    // Send both emails
    await Promise.all([
      transporter.sendMail(mailOptions),
      transporter.sendMail(userMailOptions)
    ]);

    // Store the request in the database for tracking
    const db = getDatabase();
    await db.ref(`updateRequests/${userId}`).push({
      fieldName,
      fieldLabel,
      currentValue,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    });

    return res.status(200).json({
      success: true,
      message: 'Solicitud enviada correctamente'
    });

  } catch (error) {
    console.error('Error in requestFieldUpdate:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud'
    });
  }
});