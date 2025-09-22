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
            // Create user in backend if doesn't exist
            let role: "admin" | "doctor" | "staff" = "admin";
            let name = firebaseUser.displayName || "User";
            
            if (firebaseUser.email?.includes("dr.")) {
              role = "doctor";
              name = firebaseUser.email.includes("smith") ? "Dr. Smith" : 
                    firebaseUser.email.includes("johnson") ? "Dr. Johnson" : "Dr. User";
            } else if (firebaseUser.email?.includes("staff")) {
              role = "staff";
              name = "Staff Member";
            }
            
            const newUserData = {
              firebaseUid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name,
              role,
              specialization: role === "doctor" ? "General Dentistry" : undefined,
              isActive: true,
            };

            try {
              const createResponse = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUserData),
              });
              
              if (createResponse.ok) {
                const createdUser = await createResponse.json();
                setAuthState({
                  user: createdUser,
                  firebaseUser,
                  loading: false,
                });
              } else {
                // Final fallback
                const mockUser: User = {
                  id: "temp-user",
                  ...newUserData,
                  emailLower: (firebaseUser.email || "").toLowerCase(),
                  createdAt: new Date(),
                };
                
                setAuthState({
                  user: mockUser,
                  firebaseUser,
                  loading: false,
                });
              }
            } catch (createError) {
              console.error("Error creating user:", createError);
              // Final fallback
              const mockUser: User = {
                id: "temp-user",
                ...newUserData,
                emailLower: (firebaseUser.email || "").toLowerCase(),
                createdAt: new Date(),
              };
              
              setAuthState({
                user: mockUser,
                firebaseUser,
                loading: false,
              });
            }
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
