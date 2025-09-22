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
        try {
          // Fetch user data from backend using Firebase UID
          const response = await fetch(`/api/users/by-firebase-uid/${firebaseUser.uid}`);
          if (response.ok) {
            const backendUser = await response.json();
            setAuthState({
              user: backendUser,
              firebaseUser,
              loading: false,
            });
          } else {
            // Fallback: Create mock user based on email
            let role: "admin" | "doctor" | "staff" = "admin";
            let name = firebaseUser.displayName || "User";
            
            if (firebaseUser.email?.includes("dr.")) {
              role = "doctor";
              name = firebaseUser.email.includes("smith") ? "Dr. Smith" : "Dr. Johnson";
            } else if (firebaseUser.email?.includes("staff")) {
              role = "staff";
              name = "Staff Member";
            }
            
            const mockUser: User = {
              id: "user-1",
              firebaseUid: firebaseUser.uid,
              email: firebaseUser.email || "",
              emailLower: (firebaseUser.email || "").toLowerCase(),
              name,
              role,
              specialization: role === "doctor" ? "General Dentistry" : undefined,
              isActive: true,
              createdAt: new Date(),
            };
            
            setAuthState({
              user: mockUser,
              firebaseUser,
              loading: false,
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setAuthState({
            user: null,
            firebaseUser: null,
            loading: false,
          });
        }
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
