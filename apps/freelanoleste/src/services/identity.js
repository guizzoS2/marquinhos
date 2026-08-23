import { firebaseConfig, isFirebaseConfigured } from './firebase';

export async function createAuthUserRest({ email, password }) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.');
  }
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await response.json();
  if (data.error) {
    if (data.error.message === 'EMAIL_EXISTS') {
      throw new Error('E-mail já cadastrado.');
    }
    throw new Error(data.error.message || 'Falha no cadastro.');
  }
  return { uid: data.localId, idToken: data.idToken };
}

export function mapAuthError(error) {
  const code = error?.code || '';
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    code === 'auth/invalid-email'
  ) {
    return new Error('Credenciais inválidas.');
  }
  if (code === 'auth/email-already-in-use') {
    return new Error('E-mail já cadastrado.');
  }
  if (code === 'auth/weak-password') {
    return new Error('Senha mínima de 6 caracteres.');
  }
  return error instanceof Error ? error : new Error('Falha no login.');
}
