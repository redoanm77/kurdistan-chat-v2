import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio: string;
  points: number;
  isOnline: boolean;
  age?: number;
  gender?: string;
  city?: string;
  country?: string;
  username?: string;
  profileComplete?: boolean;
  createdAt?: any;
  lastSeen?: any;
  role?: string;
  isVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (firebaseUser: User) => {
    try {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
        // Update online status
        await updateDoc(doc(db, "users", firebaseUser.uid), {
          isOnline: true,
          lastSeen: serverTimestamp(),
        });
      } else {
        // Create profile for new Google users
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || "مستخدم جديد",
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || "",
          bio: "",
          points: 0,
          isOnline: true,
          profileComplete: false,
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
        };
        await setDoc(doc(db, "users", firebaseUser.uid), newProfile);
        setProfile(newProfile);
      }
    } catch (e) {
      console.warn("Profile fetch error:", e);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
