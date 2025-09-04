// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8o7cOpoeSmwAIKren5mSxVNQZkWcckkk",
  authDomain: "vuemaster-556cc.firebaseapp.com",
  projectId: "vuemaster-556cc",
  storageBucket: "vuemaster-556cc.firebasestorage.app",
  messagingSenderId: "515603798274",
  appId: "1:515603798274:web:bf52e7412939d3e276ca1b",
  measurementId: "G-DJG5CK8BV6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);