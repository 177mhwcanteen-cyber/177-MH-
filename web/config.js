/* 177 MH कैंटीन — सेटिंग
   firebase: Firebase कंसोल → Project settings → Web app से मिला कोड यहाँ आता है।
   जब तक "PASTE…" लिखा है, ऐप बिना Firebase (सिर्फ़ इसी फोन में) चलता है।
   (यह गुप्त नहीं है — डेटा की सुरक्षा firestore.rules से होती है) */
window.SE_CONFIG = {
  org: "mh177", // 🏢 संस्था — कभी न बदलें (भैरव का "bhairav")
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
  // मालिक: mhwetcanteen@gmail.com (मुख्य) + भैरव वाली ईमेल (मास्टर ऐप के लिए)
  ownerHash: ["faa61c07b7ccc34cd10502cf475eb852ff0413a045c95108294f12fbe07c2d37", "d05c53d3cdca521782c90e21f807a1add61726965096709cb1ae4f3612b96151"],
  ownerName: "विक्रम जी",
  photoUrl: "",
  updateUrl: "https://177mhwcanteen-cyber.github.io/177-MH-/",
  // 🛍️ एक ऑर्डर-पेज पर तीन दुकानें (11-11-2026): 🛒 177 MH (यही) · 🥬 सब्ज़ी एक्सप्रेस (उसका सार्वजनिक भाव pub/rates) · 🍛 मारवाड़ रसोई (order/rasoi.json)
  // 💬 ग्राहक-पेज का WhatsApp बटन सिर्फ़ इसी नंबर पर खुले (विक्रम जी खुद सब सँभालते हैं, 12-11-2026)
  wa: "6367183480",
  stores: { sabji: { pid: "sabji-express-9a8f0", key: "AIzaSyBBaZF1E58Ybxemy5HPj8T3L0gnyg9eOPI", base: "https://177mhwcanteen-cyber.github.io/sabji-express-app/" },
    // 🍛 मारवाड़ रसोई का अपना ऐप/Firebase — रसोई के ऑर्डर सीधे वहीं (मैनेजर के फोन पर घंटी); रिपो marwar-rasoi-app
    rasoi: { pid: "marwar-rasoi-24d56", key: "AIzaSyBRBI02RqhoNztujaI46xajEOu7ETguE4U" } }
};
