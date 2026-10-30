/* 177 MH कैंटीन — सेटिंग
   firebase: Firebase कंसोल → Project settings → Web app से मिला कोड यहाँ आता है।
   जब तक "PASTE…" लिखा है, ऐप बिना Firebase (सिर्फ़ इसी फोन में) चलता है।
   (यह गुप्त नहीं है — डेटा की सुरक्षा firestore.rules से होती है) */
window.SE_CONFIG = {
  firebase: {
    // Firebase प्रोजेक्ट "mh177-canteen" (mdmtradersbmr@gmail.com) — 30-10-2026
    apiKey: "AIzaSyBhvxZD72IquK2VFda9IbtWuDd5kh4EpPY",
    authDomain: "mh177-canteen.firebaseapp.com",
    projectId: "mh177-canteen",
    storageBucket: "mh177-canteen.firebasestorage.app",
    messagingSenderId: "1053363286177",
    appId: "1:1053363286177:web:e9503b0c7b41daa78580e0"
  },
  // मालिक की ईमेल की छाप (SHA-256) — ईमेल यहाँ साफ़ नहीं लिखी जाती (भैरव वाली ही — एक लॉगिन से सब दुकानें)
  ownerHash: "d05c53d3cdca521782c90e21f807a1add61726965096709cb1ae4f3612b96151",
  ownerName: "विक्रम जी",
  photoUrl: "",
  updateUrl: "https://177mhwcanteen-cyber.github.io/177-MH-/"
};
