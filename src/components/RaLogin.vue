<template>
  <div class="ra-login">
    <h2>RA Login</h2>

    <form @submit.prevent="login">
      <label>Email</label>
      <input v-model.trim="email" type="email"/>

      <label>Password</label>
      <input v-model="password" type="password"/>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Signing in…' : 'Sign In' }}
      </button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
    <p class="hint">Only approved RA accounts can access this page.</p>
  </div>
</template>

<script>
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

// Inline allow-list
const ALLOW_RA = [
  'test@test.com',
  'govlekdp@gmail.com',
];

export default {
  name: 'RaLogin',
  data() {
    return { email: '', password: '', loading: false, error: '' };
  },
  methods: {
    async login() {
      this.error = '';
      this.loading = true;
      try {
        const { user } = await signInWithEmailAndPassword(
          auth,
          this.email.trim(),
          this.password
        );
        // Allow-list gate
        if (!ALLOW_RA.includes(user.email)) {
          this.error = 'This account is not allowed to access the RA interface.';
          // immediately sign out if not allowed
          await auth.signOut();
          return;
        }
        // success → App.vue’s onAuthStateChanged will render the RA UI
      } catch (e) {
        this.error = e.message || 'Login failed';
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.ra-login {
  max-width: 360px;
  margin: 80px auto;
  padding: 20px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0,0,0,.08);
}
h2 { margin: 0 0 16px; }
label { display:block; margin-top:12px; font-weight:600; }
input {
  width: 100%; padding: 10px 12px; margin-top: 6px;
  border: 1px solid #ddd; border-radius: 8px;
}
button {
  margin-top: 16px; width: 100%;
  padding: 10px 12px; border: none; border-radius: 8px;
  background: #2d7dfe; color: #fff; font-weight: 700; cursor: pointer;
}
.error { color: #c62828; margin-top: 12px; }
.hint { color: #667085; font-size: 12px; margin-top: 8px; }
</style>
