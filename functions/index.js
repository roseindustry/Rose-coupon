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
const { user } = require("firebase-functions/v1/auth");

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
exports.createUser = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
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
            "Campo obligatorio vacio: Nombre de la empresa, RIF, Email, Estado, Municipio, Parroquia son requeridos.",
        });
      }
    } else if (userData.role === "cliente") {
      if (
        !userData.firstName ||
        !userData.lastName ||
        !userData.identification ||
        !userData.email ||
        !userData.phoneNumber
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Campo obligatorio vacio: Nombre, Apellido, identificacion, email y telefono son requeridos.",
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
      let subscriptionInfo = {};

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
          },
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
          phoneNumber: userData.phoneNumber,
        };

        subscriptionInfo = {
          subscription_id: "-O7kFY6vMetIG_hUPYs6",
          status: true,
        }
      }

      await db.ref("Users/" + userRecord.uid).set(userInfo);

      if (userData.role === "cliente" && subscriptionInfo && Object.keys(subscriptionInfo).length > 0) {
        await db.ref("Users/" + userRecord.uid + "/subscription").set(subscriptionInfo);
      }

      // Send email with the temporary password
      const mailOptions = {
        from: EMAIL_USER,
        to: userData.email,
        subject: "Tu contraseña temporal",
        text: `Estimado ${userData.role === "afiliado" ? userData.companyName : userData.firstName},\n\nSu cuenta ha sido creada en Rose App. Su contraseña temporal es: ${tempPassword}\nPor favor Inicie sesión y cambie su contraseña lo antes posible.\n\nAtentamente,\nRose App`,
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({ success: true, userId: userRecord.uid });
    } catch (error) {
      console.error("Error creating client:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Delete users
exports.deleteUser = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    const { uid } = req.body;

    try {
      await admin.auth().deleteUser(uid);
      return res.status(200).json({ message: "Usuario eliminado con exito!" });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(400).json({ message: error.message });
    }
  }
);

// Update User's email on db and auth
exports.updateUserEmail = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
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
  }
);

// Cloud Function to send an email (HTTP function)
exports.sendEmail = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
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
  }
);

// Cloud function to fetch all users in the auth list
exports.getAllUsers = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
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
  }
);

const getDatabase = () => admin.database();

exports.verifyCode = onRequest(
  {
    cors: true, // Enable CORS properly
  },
  async (req, res) => {
    try {
      const { clientId, code, type } = req.body;

      // Validate request data
      if (!clientId || !code || !type) {
        return res.status(400).json({
          success: false,
          message: "Datos inválidos",
        });
      }

      if (type === "phone") {
        // Update phone verification status
        await admin.database().ref(`Users/${clientId}`).update({
          phoneVerified: true,
        });

        return res.status(200).json({
          success: true,
          message: "Teléfono verificado correctamente",
        });
      } else {
        // Get stored verification code
        const verificationRef = admin
          .database()
          .ref(`verificationCodes/${clientId}/${type}`);
        const snapshot = await verificationRef.get();

        if (!snapshot.exists()) {
          return res.status(404).json({
            success: false,
            message: "Código no encontrado o expirado",
          });
        }

        const verification = snapshot.val();
        const now = Date.now();

        // Check if code has expired (5 minutes)
        if (now - verification.createdAt > 5 * 60 * 1000) {
          await verificationRef.remove();
          return res.status(400).json({
            success: false,
            message: "El código ha expirado",
          });
        }

        // Verify code
        // Error response if code is invalid
        if (verification.code.toString() !== code.toString()) {
          return res.status(400).json({
            success: false,
            message: "Código inválido",
          });
        }

        if (type === "email") {
        // Update user verification status
          await admin.database().ref(`Users/${clientId}`).update({
            emailVerified: true,
          });
        }

        // Delete used verification code
        await verificationRef.remove();

        // Success response
        return res.status(200).json({
          success: true,
          message: "Código verificado exitosamente",
        });
      }
    } catch (error) {
      console.error("Error in verifyCode:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Error interno del servidor",
      });
    }
  }
);

// For email and purchase verification codes
exports.sendVerificationCode = onRequest(
  {
    cors: true,
    maxInstances: 10, // Limit the number of instances to 10
  },
  async (req, res) => {
    // Get data from query parameters
    const {
      id,
      email,
      phone = null,
      firstName,
      lastName,
      type,
      newValue = null,
    } = req.query;

    const client = {
      id,
      email,
      firstName,
      lastName,
      phone,
      newValue,
    };

    try {
      // Validate request data
      if (!client.id || !type) {
        return res.status(400).json({
          success: false,
          message: "Datos inválidos",
        });
      }

      // Validate input format
      if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newValue)) {
        return res.status(400).json({
          success: false,
          message: "Email inválido",
        });
      }

      // Check rate limiting
      const rateLimitRef = admin
        .database()
        .ref(`rateLimits/verificationCodes/${client.id}/${type}`);
      const rateLimitSnapshot = await rateLimitRef.get();
      const now = Date.now();

      if (rateLimitSnapshot.exists()) {
        const { attempts = 0, firstAttempt = now } = rateLimitSnapshot.val();

        // Reset if it's been more than 24 hours
        if (now - firstAttempt > 24 * 60 * 60 * 1000) {
          await rateLimitRef.set({
            attempts: 1,
            firstAttempt: now,
            lastAttempt: now,
          });
        } else {
          // Check max attempts (15 per 24h)
          if (attempts >= 15) {
            return res.status(429).json({
              success: false,
              message:
                "Has excedido el límite de intentos. Por favor, intenta de nuevo mañana.",
            });
          }

          // Check cooldown period (2 min)
          const { lastAttempt } = rateLimitSnapshot.val();
          const timeSinceLastAttempt = now - lastAttempt;
          if (timeSinceLastAttempt < 2 * 60 * 1000) {
            const waitTime = Math.ceil(
              (2 * 60 * 1000 - timeSinceLastAttempt) / 1000
            );
            return res.status(429).json({
              success: false,
              message: `Por favor espera ${waitTime} segundos antes de solicitar otro código.`,
            });
          }

          // Update attempts
          await rateLimitRef.update({
            attempts: attempts + 1,
            lastAttempt: now,
          });
        }
      } else {
        // First attempt
        await rateLimitRef.set({
          attempts: 1,
          firstAttempt: now,
          lastAttempt: now,
        });
      }

      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000);

      // Store the code with its type and new value
      await admin
        .database()
        .ref(`verificationCodes/${client.id}/${type}`)
        .set({
          code: verificationCode,
          sentTo: client.newValue || null,
          createdAt: now,
        });

      // Send code based on type
      if (type === "email") {
        await transporter.sendMail({
          from: EMAIL_USER,
          to: newValue, // Send to the new email
          subject: "Código de Verificación de Email",
          html: `
            <h3>Verificación de Email</h3>
            <p>Hola ${client.firstName || ""},</p>
            <p>Tu código de verificación es: <strong>${verificationCode}</strong></p>
            <p>Este código expirará en 5 minutos.</p>
          `,
        });
      } else if (type === "purchase") {
        await transporter.sendMail({
          from: EMAIL_USER,
          to: client.email,
          subject: "Código de Verificación de Compra",
          html: `
            <h3>Verificación de Compra</h3>
            <p>Hola ${client.firstName || ""},</p>
            <p>Tu código de verificación para tu compra es: <strong>${verificationCode}</strong></p>
            <p>Este código expirará en 5 minutos.</p>
          `,
        });
      }

      // Return success response
      return res.status(200).json({
        success: true,
        message:
          "Código enviado al correo electrónico. Tiene 5 minutos para usarlo.",
        rateLimit: {
          remainingAttempts:
            15 -
            (rateLimitSnapshot.exists() ? rateLimitSnapshot.val().attempts : 0),
          cooldownEnds: now + 2 * 60 * 1000,
          resetTime:
            (rateLimitSnapshot.exists()
              ? rateLimitSnapshot.val().firstAttempt
              : now) +
            24 * 60 * 60 * 1000,
        },
      });
      // } catch (sendError) {
      //   // Clean up stored code if sending fails
      //   console.error("Error sending verification code:", sendError);
      //   await admin
      //     .database()
      //     .ref(`verificationCodes/${client.id}/${type}`)
      //     .remove();

      //   return res.status(500).json({
      //     success: false,
      //     message: `Error al enviar el código por ${type === "email" ? "email" : "SMS"}. Por favor intente nuevamente.`,
      //   });
      // }
    } catch (error) {
      console.error("Error in sendVerificationCode:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Error interno del servidor",
      });
    }
  }
);

// For phone verification rate limit check
exports.sendPhoneRateLimitCheck = onRequest(
  { cors: true },
  async (req, res) => {
    const { id, phone } = req.body;

    if (!id || !phone || !/^\d{10,15}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Número de teléfono inválido o datos incompletos.",
      });
    }

    const now = Date.now();
    const ref = admin
      .database()
      .ref(`rateLimits/verificationCodes/${id}/phone`);
    const snapshot = await ref.get();

    let attempts = 0;
    let firstAttempt = now;
    let lastAttempt = 0;

    if (snapshot.exists()) {
      const data = snapshot.val();
      attempts = data.attempts || 0;
      firstAttempt = data.firstAttempt || now;
      lastAttempt = data.lastAttempt || 0;

      if (now - firstAttempt > 24 * 60 * 60 * 1000) {
        // Reset if over 24 hours
        attempts = 1;
        firstAttempt = now;
        lastAttempt = now;
        await ref.set({ attempts, firstAttempt, lastAttempt });
      } else {
        if (attempts >= 15) {
          return res.status(429).json({
            success: false,
            message: "Has excedido el límite de intentos. Intenta mañana.",
            rateLimit: {
              remainingAttempts: 0,
              cooldownEnds: lastAttempt + 2 * 60 * 1000,
              resetTime: firstAttempt + 24 * 60 * 60 * 1000,
            },
          });
        }

        if (now - lastAttempt < 2 * 60 * 1000) {
          const wait = Math.ceil((2 * 60 * 1000 - (now - lastAttempt)) / 1000);
          return res.status(429).json({
            success: false,
            message: `Espera ${wait} segundos antes de intentar de nuevo.`,
            rateLimit: {
              remainingAttempts: 15 - attempts,
              cooldownEnds: lastAttempt + 2 * 60 * 1000,
              resetTime: firstAttempt + 24 * 60 * 60 * 1000,
            },
          });
        }

        attempts += 1;
        lastAttempt = now;
        await ref.update({ attempts, lastAttempt });
      }
    } else {
      // First attempt
      await ref.set({ attempts: 1, firstAttempt: now, lastAttempt: now });
    }

    return res.json({
      success: true,
      message: "Verificación permitida.",
      rateLimit: {
        remainingAttempts: 15 - attempts,
        cooldownEnds: lastAttempt + 2 * 60 * 1000,
        resetTime: firstAttempt + 24 * 60 * 60 * 1000,
      },
    });
  }
);

// Request field update function
exports.requestFieldUpdate = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    try {
      const {
        userId,
        userName,
        userIdentification,
        userEmail,
        userPhone,
        fieldName,
        fieldLabel,
        currentValue,
        newValue,
      } = req.body;

      // Validate request data
      if (!userId || !fieldName || !currentValue || !newValue) {
        return res.status(400).json({
          success: false,
          message: "Datos incompletos para la solicitud",
        });
      }

      // Create email content
      const mailOptions = {
        from: EMAIL_USER,
        to: EMAIL_USER, // Send to admin email
        subject: "Solicitud de Actualización de Datos de Usuario",
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .header {
            background-color: #29122f;
            color: white;
            text-align: center;
            padding: 15px;
            border-radius: 10px 10px 0 0;
            margin: -30px -30px 20px;
        }
        .header h3 {
            margin: 0;
            font-size: 1.5em;
        }
        .user-info {
            background-color: #f9f9f9;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
            border-left: 4px solid #29122f;
        }
        .user-info p {
            margin: 10px 0;
        }
        .user-info strong {
            color: #29122f;
        }
        .action-note {
            background-color: #f0f0f0;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
            font-style: italic;
            color: #666;
        }
        .contact-button {
            display: block;
            width: auto;
            background-color: #29122f;
            color: white;
            text-align: center;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
            font-weight: bold;
        }
        .contact-button:hover {
            background-color:rgb(26, 10, 30);
            color: #f0f0f0
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #888;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h3>Solicitud de Actualización de Datos</h3>
        </div>
        
        <div class="user-info">
            <p><strong>Usuario:</strong> ${userName}</p>
            <p><strong>Cédula:</strong> ${userIdentification}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Campo a actualizar:</strong> ${fieldLabel}</p>
            <p><strong>Valor actual:</strong> ${currentValue}</p>
            <p><strong>Valor solicitado:</strong> ${newValue}</p>
        </div>

        <div class="action-note">
            <p>Para procesar esta solicitud, por favor verifique la información con el usuario 
            y realice los cambios necesarios en el panel de administración.</p>
        </div>

        <a href="https://wa.me/${userPhone}?text=Saludos!%20El%20equipo%20de%20Rose%20Coupon%20ha%20recibido%20tu%20solicitud%20para%20actualizar%20tus%20datos%20de%20usuario.%20Nos%20confirmas%20que%20quieres%20cambiar%20tu%20campo%20${fieldLabel}%20de%20${currentValue}%20a%20${newValue}?" 
           class="contact-button" target="_blank">Contactar a ${userName}</a>

        <div class="footer">
            © 2024 Rose Coupon. Todos los derechos reservados.
        </div>
    </div>
</body>
</html>`,
      };

      // Send confirmation email to user
      const userMailOptions = {
        from: EMAIL_USER,
        to: userEmail,
        subject: "Solicitud de Actualización Recibida",
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .header {
            background-color: #b800c2;
            color: white;
            text-align: center;
            padding: 15px;
            border-radius: 10px 10px 0 0;
            margin: -30px -30px 20px;
        }
        .header h3 {
            margin: 0;
            font-size: 1.5em;
        }
        .user-info {
            background-color: #f9f9f9;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
            border-left: 4px solid #b800c2;
        }
        .user-info p {
            margin: 10px 0;
        }
        .user-info strong {
            color: #b800c2;
        }
        .action-note {
            background-color: #f0f0f0;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
            font-style: italic;
            color: #666;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #888;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h3>Solicitud de Actualización Recibida</h3>
        </div>
        
        <div class="user-info">
            <p>Hola ${userName},</p>
            <p>Hemos recibido tu solicitud para actualizar el campo <strong>${fieldLabel}</strong>.</p>
            <p>Detalles de la solicitud:</p>
            <ul>
                <li><strong>Campo:</strong> ${fieldLabel}</li>
                <li><strong>Valor actual:</strong> ${currentValue}</li>
                <li><strong>Valor solicitado:</strong> ${newValue}</li>
            </ul>
        </div>

        <div class="action-note">
            <p>Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo pronto para procesar los cambios.</p>
            <p>Agradecemos tu paciencia y colaboración.</p>
        </div>

        <div class="footer">
            © 2024 Rose Coupon. Todos los derechos reservados.
            <p>Si no reconoces esta solicitud, por favor contáctanos.</p>
        </div>
    </div>
</body>
</html>
          `,
      };

      // Send both emails
      await Promise.all([
        transporter.sendMail(mailOptions),
        transporter.sendMail(userMailOptions),
      ]);

      // Store the request in the database for tracking
      const db = getDatabase();
      await db.ref(`updateRequests/${userId}`).push({
        fieldName: fieldName,
        fieldLabel: fieldLabel,
        currentValue: currentValue,
        newValue: newValue,
        requestedAt: new Date().toISOString(),
        status: "pending",
      });

      return res.status(200).json({
        success: true,
        message: "Solicitud enviada correctamente",
      });
    } catch (error) {
      console.error("Error in requestFieldUpdate:", error);
      return res.status(500).json({
        success: false,
        message: "Error al procesar la solicitud",
      });
    }
  }
);

// Process account delete request
exports.checkUserObligations = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    try {
      const { userId } = req.body;

      // Validate request data
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "Datos incompletos para la solicitud",
        });
      }

      const db = admin.database();
      const userRef = db.ref(`Users/${userId}`);

      // Check credit obligations
      const creditSnapshot = await db.ref(`Users/${userId}/credit`).get();
      if (creditSnapshot.exists()) {
        const creditData = creditSnapshot.val();

        // Check main credit pending payments
        if (creditData.main && creditData.main.purchases) {
          // Flatten and check all cuotas across all purchases
          const pendingPayments = Object.values(
            creditData.main.purchases
          ).flatMap((purchase) =>
            purchase.cuotas
              ? Object.values(purchase.cuotas).filter(
                  (cuota) => cuota.status === "pending"
                )
              : []
          );

          if (pendingPayments.length > 0) {
            return res.status(400).json({
              success: false,
              message: `El cliente ${userId} tiene ${pendingPayments.length} cuotas pendientes en su crédito principal`,
              pendingPayments: pendingPayments,
            });
          }
        }

        // Check plus credit pending payments
        if (creditData.plus && creditData.plus.purchases) {
          // Flatten and check all cuotas across all purchases for plus credit
          const pendingPlusPayments = Object.values(
            creditData.plus.purchases
          ).flatMap((purchase) =>
            purchase.cuotas
              ? Object.values(purchase.cuotas).filter(
                  (cuota) => cuota.status === "pending"
                )
              : []
          );

          if (pendingPlusPayments.length > 0) {
            return res.status(400).json({
              success: false,
              message: `Tienes ${pendingPlusPayments.length} cuotas pendientes en tu crédito Rose Plus`,
              pendingPayments: pendingPlusPayments,
            });
          }
        }
      }

      // Check subscription status
      const subscriptionSnapshot = await db
        .ref(`Users/${userId}/subscription`)
        .get();
      if (subscriptionSnapshot.exists()) {
        const subscriptionData = subscriptionSnapshot.val();

        // Check if subscription is unpaid
        if (!subscriptionData.isPaid) {
          return res.status(400).json({
            success: false,
            message: `El cliente ${userId} tiene un pago de suscripción pendiente`,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: "Usuario libre de obligaciones",
      });
    } catch (error) {
      console.error("Error checking user obligations:", error);
      return res.status(500).json({
        success: false,
        message: "Error al verificar las obligaciones del usuario",
      });
    }
  }
);

// Remove user account and all associated data
exports.removeUserAccount = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    try {
      const { userId } = req.body;

      // Validate request data
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "Datos incompletos para la solicitud",
        });
      }

      const db = admin.database();
      const auth = admin.auth();
      const storage = admin.storage();

      // 1. Remove user from Realtime Database
      await db.ref(`Users/${userId}`).remove();

      // 2. Remove user's storage files
      const bucket = storage.bucket();
      const [files] = await bucket.getFiles({
        prefix: `verification-files/${userId}`,
      });
      const deletePromises = files.map((file) => file.delete());
      await Promise.all(deletePromises);

      // 3. Remove payment capture files
      const paymentFiles = await bucket.getFiles({
        prefix: `payment-captures/${userId}`,
      });
      const paymentDeletePromises = paymentFiles[0].map((file) =>
        file.delete()
      );
      await Promise.all(paymentDeletePromises);

      // 4. Remove user from Authentication
      await auth.deleteUser(userId);

      // 5. Remove any remaining references
      await Promise.all([
        db.ref(`Payments/${userId}`).remove(),
        db.ref(`verificationCodes/${userId}`).remove(),
        db.ref(`deletionRequests/${userId}`).remove(),
        db.ref(`updateRequests/${userId}`).remove(),
      ]);

      // Send confirmation email
      const mailOptions = {
        from: EMAIL_USER,
        to: EMAIL_USER, // Send to admin for logging
        subject: "Cuenta de Usuario Eliminada",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: #29122f; color: white; text-align: center; padding: 15px; border-radius: 5px 5px 0 0;">
              <h2>Cuenta de Usuario Eliminada</h2>
            </div>
            <div style="background-color: white; padding: 20px; border-radius: 0 0 5px 5px;">
              <p>La cuenta de usuario con ID <strong>${userId}</strong> ha sido completamente eliminada.</p>
              <p>Detalles de la eliminación:</p>
              <ul>
                <li>Base de datos: Datos de usuario eliminados</li>
                <li>Archivos de almacenamiento: Eliminados</li>
                <li>Autenticación: Usuario eliminado</li>
                <li>Referencias cruzadas: Limpiadas</li>
              </ul>
              <p>Fecha de eliminación: ${new Date().toISOString()}</p>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({
        success: true,
        message: "Cuenta de usuario eliminada completamente",
      });
    } catch (error) {
      console.error("Error removing user account:", error);
      return res.status(500).json({
        success: false,
        message: "Error al eliminar la cuenta de usuario",
      });
    }
  }
);
