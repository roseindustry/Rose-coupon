// This is public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.2.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.2.4/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAG1feHtCF7TxkidHtGL0LzR9DuwCUXDNI",
    authDomain: "restaurant-app-f69da.firebaseapp.com",
    projectId: "restaurant-app-f69da",
    storageBucket: "restaurant-app-f69da.appspot.com",
    messagingSenderId: "610842827251",
    appId: "1:610842827251:web:7e3b2053e9717e9c06da86"
});

const messaging = firebase.messaging();
