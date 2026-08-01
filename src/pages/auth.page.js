import { signIn, signUp, getSession } from '../api/auth.api.js';

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const tabs = document.querySelectorAll('.auth-tab');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');

// لو المستخدم مسجّل دخول بالفعل، حوّله مباشرة للصفحة الرئيسية
async function redirectIfAuthenticated() {
  const { data } = await getSession();
  if (data.session) {
    window.location.href = 'home.html';
  }
}
redirectIfAuthenticated();

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('is-active'));
    tab.classList.add('is-active');
    const isLogin = tab.dataset.tab === 'login';
    loginForm.hidden = !isLogin;
    signupForm.hidden = isLogin;
  });
});

function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  const formData = new FormData(loginForm);
  try {
    await signIn(formData.get('email'), formData.get('password'));
    window.location.href = 'home.html';
  } catch (err) {
    showError(loginError, 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
  }
});

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  signupError.hidden = true;
  const formData = new FormData(signupForm);
  try {
    await signUp(formData.get('email'), formData.get('password'), formData.get('username'));
    window.location.href = 'home.html';
  } catch (err) {
    showError(signupError, err.message || 'حدث خطأ أثناء إنشاء الحساب');
  }
});
