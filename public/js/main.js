// ════════════════════════════════════════════════════════
// MAIN.JS - ENTRY POINT
// ════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { FB_CONFIG } from './constants.js';
import { dialog, initDialog } from './dialog.js';
import { toast } from './utils.js';
import { updateCurrentUser } from './state.js';
import { startListeners, stopListeners, saveUser } from './firestore.js';
import { showLogin, showApp, hideLoading, initAuth } from './auth.js';
import { initUI } from './ui.js';

// Inicializar Firebase
export const fbApp = initializeApp(FB_CONFIG);
export const auth = getAuth(fbApp);
export const db = getFirestore(fbApp);

// Inicializar aplicação
function initApp() {
  // Dialog
  initDialog();

  // Auth state listener
  onAuthStateChanged(auth, async user => {
    hideLoading();
    if (user) {
      updateCurrentUser(user);
      const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const uref = doc(db, 'users', user.uid);
      const snap = await getDoc(uref);
      if (!snap.exists()) {
        const { AV_COLORS } = await import('./constants.js');
        const colorIdx = Math.floor(Math.random() * AV_COLORS.length);
        await saveUser(user.uid, {
          name:  user.displayName || user.email.split('@')[0],
          email: user.email,
          role:  'membro',
          color: AV_COLORS[colorIdx],
        });
      }
      startListeners();
      showApp();
    } else {
      updateCurrentUser(null);
      stopListeners();
      showLogin();
    }
  });

  // UI Initialization
  initAuth();
  initUI();
}

// Start
document.addEventListener('DOMContentLoaded', initApp);
