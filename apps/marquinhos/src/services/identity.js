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
  return { uid: data.localId };
}
