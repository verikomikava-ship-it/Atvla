import { useState, useEffect, useCallback } from 'react';
import {
  User,
  signInWithPopup,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  ConfirmationResult,
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '@/lib/firebase';

export type AuthState = {
  user: User | null;
  loading: boolean;
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState({ user, loading: false });
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInWithFacebook = useCallback(async () => {
    await signInWithPopup(auth, facebookProvider);
  }, []);

  const sendPhoneCode = useCallback(async (phoneNumber: string, recaptchaContainerId: string) => {
    const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: 'invisible',
    });
    const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    return result;
  }, []);

  const confirmPhoneCode = useCallback(async (confirmationResult: ConfirmationResult, code: string) => {
    await confirmationResult.confirm(code);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return {
    user: authState.user,
    loading: authState.loading,
    signInWithGoogle,
    signInWithFacebook,
    sendPhoneCode,
    confirmPhoneCode,
    signInWithEmail,
    signUpWithEmail,
    logout,
  };
};
