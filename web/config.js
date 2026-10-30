/* 177 MH कैंटीन — सेटिंग
   firebase: Firebase कंसोल → Project settings → Web app से मिला कोड यहाँ आता है।
   जब तक "PASTE…" लिखा है, ऐप बिना Firebase (सिर्फ़ इसी फोन में) चलता है।
   (यह गुप्त नहीं है — डेटा की सुरक्षा firestore.rules से होती है) */
window.SE_CONFIG = {
  firebase: {
    apiKey: "PASTE_API_KEY",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },
  // मालिक की ईमेल की छाप (SHA-256) — ईमेल यहाँ साफ़ नहीं लिखी जाती (नया Firebase खाता मिलने पर बदलेगी)
  ownerHash: "d05c53d3cdca521782c90e21f807a1add61726965096709cb1ae4f3612b96151",
  ownerName: "विक्रम जी",
  photoUrl: "",
  updateUrl: "https://177mhwcanteen-cyber.github.io/mh-wet-canteen-app/"
};
