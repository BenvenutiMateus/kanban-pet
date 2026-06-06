// ════════════════════════════════════════════════════════
// AUTH.JS - AUTENTICAÇÃO
// ════════════════════════════════════════════════════════
import { signInWithEmailAndPassword, signOut, updatePassword,
         createUserWithEmailAndPassword, updateProfile,
         GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from './main.js';
import { currentUser } from './state.js';
import { toast } from './utils.js';
import { dialog } from './dialog.js';
import { renderAll } from './ui.js';
import { saveUser } from './firestore.js';
import { AV_COLORS } from './constants.js';

export function hideLoading() {
  const s = document.getElementById('loading-screen');
  s.classList.add('hidden');
  setTimeout(() => s.style.display = 'none', 400);
}

export function showLogin() {
  document.getElementById('login-screen').classList.add('visible');
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-err').textContent = '';
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value = '';
  showLoginForm(); // garante que mostra o form de login, não o de cadastro
  setTimeout(() => document.getElementById('login-email').focus(), 100);
}

export function showApp() {
  document.getElementById('login-screen').classList.remove('visible');
  document.getElementById('app').classList.add('visible');
}

// Alterna entre form de login e form de cadastro
function showLoginForm() {
  document.getElementById('login-form').style.display = '';
  document.getElementById('register-form').style.display = 'none';
}

function showRegisterForm() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = '';
  setTimeout(() => document.getElementById('reg-name').focus(), 100);
}

export async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const err   = document.getElementById('login-err');
  const btn   = document.getElementById('btn-login');
  if (!email || !pass) { err.textContent = 'Preencha e-mail e senha.'; return; }
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Entrando...';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    // O onAuthStateChanged no main.js vai checar se está pendente
  } catch(e) {
    const msgs = {
      'auth/user-not-found':    'Usuário não encontrado.',
      'auth/wrong-password':    'Senha incorreta.',
      'auth/invalid-email':     'E-mail inválido.',
      'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.',
    };
    err.textContent = msgs[e.code] || 'Falha no acesso. Verifique suas credenciais.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
}

export async function doGoogleLogin() {
  const err = document.getElementById('login-err');
  const btn = document.getElementById('btn-google-login');
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Redirecionando...';
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch(e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      err.textContent = 'Erro ao logar com Google: ' + e.message;
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar com Google';
  }
}

export async function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const err   = document.getElementById('reg-err');
  const btn   = document.getElementById('btn-register');
  if (!name || !email || !pass) { err.textContent = 'Preencha todos os campos.'; return; }
  if (pass.length < 6) { err.textContent = 'Senha deve ter pelo menos 6 caracteres.'; return; }
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Cadastrando...';
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    const colorIdx = Math.floor(Math.random() * AV_COLORS.length);
    // Novo usuário começa como pendente — admin precisa aprovar
    await saveUser(cred.user.uid, {
      name,
      email,
      role:  'pendente',
      color: AV_COLORS[colorIdx],
    });
    // Desloga imediatamente — só entra após aprovação
    await signOut(auth);
    showLoginForm();
    document.getElementById('login-err').textContent = '';
    // Mostra mensagem de sucesso na tela de login
    const info = document.getElementById('login-info');
    if (info) {
      info.textContent = 'Cadastro realizado! Aguarde a aprovação de um administrador.';
      info.style.display = '';
    }
  } catch(e) {
    const msgs = {
      'auth/email-already-in-use': 'Esse e-mail já está cadastrado.',
      'auth/invalid-email':        'E-mail inválido.',
      'auth/weak-password':        'Senha muito fraca.',
    };
    err.textContent = msgs[e.code] || 'Erro: ' + e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Cadastrar';
  }
}

export function initAuth() {
  // Login
  document.getElementById('btn-login').onclick = doLogin;
  document.getElementById('btn-google-login').onclick = doGoogleLogin;
  document.getElementById('login-pass').onkeydown = e => { if (e.key === 'Enter') doLogin(); };
  document.getElementById('login-email').onkeydown = e => { if (e.key === 'Enter') document.getElementById('login-pass').focus(); };

  // Cadastro
  document.getElementById('btn-show-register').onclick = () => {
    showRegisterForm();
    document.getElementById('login-info').style.display = 'none';
  };
  document.getElementById('btn-show-login').onclick = showLoginForm;
  document.getElementById('btn-register').onclick = doRegister;
  document.getElementById('reg-pass').onkeydown = e => { if (e.key === 'Enter') doRegister(); };

  // Logout
  document.getElementById('btn-logout').onclick = () => signOut(auth);

  // Alterar senha
  document.getElementById('btn-change-pass').onclick = () => {
    dialog({ title: 'Alterar senha', input: true, inputType: 'password', defaultVal: '', okLabel: 'Atualizar' }, async newPass => {
      if (!newPass) return;
      if (newPass.length < 6) { toast('A nova senha deve ter no mínimo 6 caracteres.', 'error'); return; }
      try {
        await updatePassword(currentUser, newPass);
        toast('Senha atualizada com sucesso!', 'success');
      } catch(error) {
        if (error.code === 'auth/requires-recent-login') {
          toast('Por segurança, saia e entre novamente antes de alterar a senha.', 'error');
        } else {
          toast('Erro ao alterar senha: ' + error.message, 'error');
        }
      }
    });
  };
}