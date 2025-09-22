import { useState, useEffect } from "react";
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { User } from "@shared/schema";

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    firebaseUser: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // In real implementation, fetch user data from backend using Firebase UID
        // For now, mock the user data
        const mockUser: User = {
          id: "user-1",
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || "User",
          role: "admin",
          specialization: null,
          isActive: true,
          createdAt: new Date(),
        };
        
        setAuthState({
          user: mockUser,
          firebaseUser,
          loading: false,
        });
      } else {
        setAuthState({
          user: null,
          firebaseUser: null,
          loading: false,
        });
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting sign in with email:", email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("Sign in successful:", result.user.uid);
    } catch (error: any) {
      console.error("Sign in error:", error.code, error.message);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  return {
    user: authState.user,
    firebaseUser: authState.firebaseUser,
    loading: authState.loading,
    signIn,
    signOut: signOutUser,
  };
}
