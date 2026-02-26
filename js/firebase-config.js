/* ==========================================
   FIREBASE KONFIGURÁCIA
   ==========================================
   Aby dáta (lektori, priradenia, rozvrh) boli zdieľané
   pre všetkých návštevníkov stránky, treba nastaviť Firebase:

   1. Choďte na https://console.firebase.google.com
   2. Kliknite "Add project" → zadajte názov (napr. "Lektory")
   3. Pokračujte ďalej (Google Analytics môžete vypnúť)
   4. Po vytvorení projektu kliknite na ikonu </> (Web)
   5. Zadajte názov aplikácie (napr. "Lektory Web")
   6. Skopírujte hodnoty z firebaseConfig sem dole
   7. V ľavom menu kliknite "Build" → "Realtime Database"
   8. Kliknite "Create Database" → vyberte lokáciu (europe-west1)
   9. Zvoľte "Start in TEST mode" → kliknite "Enable"
   10. Hotovo! Uložte tento súbor a pushujte na GitHub.

   ⚠️  DÔLEŽITÉ: Po 30 dňoch TEST mode expiruje.
   Potom v Database → Rules nastavte:
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ========================================== */

const FIREBASE_CONFIG = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};
