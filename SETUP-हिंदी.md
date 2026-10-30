# भैरव कैंटीन ऐप — चालू करने के 3 काम (विक्रम जी के लिए)

ये तीनों काम एक बार करने हैं। हर काम के बाद जो चीज़ मिले, वह Claude को भेज दें — बाकी Claude कर देगा।

## 1. GitHub repo (5 मिनट)
1. फोन के Chrome में github.com खोलें → 177mhwcanteen-cyber से लॉगिन।
2. ऊपर **+** → **New repository**।
3. नाम: `bhairav-canteen-app` · **Public** चुनें · नीचे कुछ भी टिक न करें (README भी नहीं)।
4. **Create repository** दबाएँ।
5. Claude को लिखें: "repo बन गया"।

## 2. Firebase (10 मिनट)
1. console.firebase.google.com खोलें — वही Gmail जिससे सब्ज़ी एक्सप्रेस बना है।
2. **Add project** → नाम `bhairav-canteen` → Google Analytics बंद → **Create**।
3. बाईं ओर **Build → Firestore Database → Create database** → जगह **asia-south1 (Mumbai)** → **Production mode** → Enable।
4. **Build → Authentication → Get started → Email/Password** → पहला बटन चालू → Save।
5. ऊपर ⚙ **Project settings** → नीचे **Your apps** → **</>** (Web) → नाम `bhairav` → Register।
6. जो `firebaseConfig = { apiKey: … appId: … }` दिखे, उसकी पूरी फोटो या कॉपी Claude को भेजें।

## 3. Google Sheet + Drive बैकअप (5 मिनट — Firebase के बाद)
1. sheets.new खोलें → नाम "भैरव कैंटीन हिसाब"।
2. **Extensions → Apps Script** → Claude जो कोड भेजेगा (Project ID भरा हुआ) वह चिपकाएँ → Save।
3. ऊपर फ़ंक्शन **setup** चुनें → ▶ Run → Allow।
4. **Deploy → New deployment → Web app** → Execute as: Me · Who has access: Anyone → Deploy।
5. जो `…/exec` वाला URL मिले, Claude को भेजें।

इसके बाद:
- Claude GitHub पर कोड डालेगा → APK अपने-आप बनेगी → लिंक आपको मिलेगा।
- दिनेश जी के फोन में APK इंस्टॉल → मालिक लॉगिन (आपकी ईमेल) → "रेट व सेटिंग" → **पुराना डेटा लाएँ** → दिनेश जी को कर्मचारी जोड़ें।
- आगे के सारे अपडेट अपने-आप (OTA) — APK दोबारा नहीं भेजनी पड़ेगी।
- जब तक नया ऐप पूरी तरह न चले, पुराना (आर्टिफ़ैक्ट) ऐप और उसका बैकअप चालू रहेगा।
