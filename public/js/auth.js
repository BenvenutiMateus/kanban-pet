// ════════════════════════════════════════════════════════
// AUTH.JS - AUTENTICAÇÃO
// ════════════════════════════════════════════════════════

import { signInWithEmailAndPassword, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from './main.js';
import { currentUser } from './state.js';
import { toast } from './utils.js';
import { dialog } from './dialog.js';
import { renderAll } from './ui.js';

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
  setTimeout(() => document.getElementById('login-email').focus(), 100);
}

export function showApp() {
  document.getElementById('login-screen').classList.remove('visible');
  document.getElementById('app').classList.add('visible');
}

export async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err = document.getElementById('login-err');
  const btn = document.getElementById('btn-login');
  if (!email || !pass) {
    err.textContent = 'Preencha e-mail e senha.';
    return;
  }
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Entrando...';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
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

export function initAuth() {
  document.getElementById('btn-login').onclick = doLogin;
  document.getElementById('login-pass').onkeydown = e => { if (e.key === 'Enter') doLogin(); };
  document.getElementById('login-email').onkeydown = e => {
    if (e.key === 'Enter') document.getElementById('login-pass').focus();
  };
  document.getElementById('btn-logout').onclick = () => signOut(auth);

  // Alterar senha
  document.getElementById('btn-change-pass').onclick = () => {
    dialog({ title: 'Alterar senha', input: true, inputType: 'password', defaultVal: '', okLabel: 'Atualizar' }, async newPass => {
      if (!newPass) return;
      if (newPass.length < 6) {
        toast('A nova senha deve ter no mínimo 6 caracteres.', 'error');
        return;
      }
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
