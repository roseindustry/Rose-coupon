/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });
const admin = require('firebase-admin');
admin.initializeApp();

exports.createUser = functions.https.onCall((data, context) => {
    cors(onRequest, response, () => {
        const { email, password } = data;
        return admin.auth().createUser({
            email,
            password,
        })
            .then(userRecord => {
                // See the UserRecord reference doc for the contents of userRecord.
                console.log('Successfully created new user:', userRecord.uid);
                return { uid: userRecord.uid }; // You might want to return relevant info to the client
            })
            .catch((error) => {
                console.log('Error creating new user:', error);
                throw new functions.https.HttpsError('internal', 'Failed to create new user', error);
            });
    });

});
