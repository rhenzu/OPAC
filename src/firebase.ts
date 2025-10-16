import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCh_wRz_a7VphjpyJHisyXhLfBmUJuTxjk",
  authDomain: "opacfinal.firebaseapp.com",
  databaseURL: "https://opacfinal-default-rtdb.firebaseio.com",
  projectId: "opacfinal",
  storageBucket: "opacfinal.firebasestorage.app",
  messagingSenderId: "377539910589",
  appId: "1:377539910589:web:60e6e9a5d70cc52579d0d4",
  measurementId: "G-X5E70LZKTD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure auth settings
auth.useDeviceLanguage(); // Set language to user's device language

// Check for development mode and connect to emulator if needed
if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
  // Uncomment the following line if you're using Firebase Auth Emulator
  // connectAuthEmulator(auth, 'http://localhost:9099');
  console.log('Running in development mode');
}

export { auth };
export const database = getDatabase(app); 