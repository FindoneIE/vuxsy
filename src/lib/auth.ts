import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

export const signUpWithEmail = async (email: string, password: string, firstName?: string) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (firstName && credential.user) {
    await updateProfile(credential.user, { displayName: firstName });
  }

  return credential.user;
};

export const signInWithEmail = async (email: string, password: string) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
};

export const logOut = async () => {
  await auth.signOut();
};
