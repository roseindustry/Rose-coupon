import { messaging } from './firebase/init';

export function registerSW() {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Service Worker registered with scope:', registration.scope);
      // If you want to get the token or handle background messages, do it here
    }).catch(err => console.error('Service Worker registration failed:', err));
}
