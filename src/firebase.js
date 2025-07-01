// firebase.js
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager
} from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBdLhjpaeKi0vlGwEm2nEWYv3SnD-jtjYg",
  authDomain: "moodtrac-65e32.firebaseapp.com",
  databaseURL: "https://moodtrac-65e32-default-rtdb.firebaseio.com",
  projectId: "moodtrac-65e32",
  storageBucket: "moodtrac-65e32.appspot.com",
  messagingSenderId: "544347141784",
  appId: "1:544347141784:web:2ab625a25e67d0321042ed",
  measurementId: "G-Y6Z7BJ90HY"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager()
  }),
  experimentalForceLongPolling: true
});

const realtimedb = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, analytics, db, realtimedb, auth, storage };
