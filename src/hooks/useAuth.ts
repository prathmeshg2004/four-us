// ============================================================
// useAuth — Firebase anonymous auth hook
// ============================================================

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, ensureAuth } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(false);
      } else {
        // Sign in anonymously
        ensureAuth()
          .then((u) => {
            setUser(u);
            setLoading(false);
          })
          .catch((err) => {
            console.error('Auth error:', err);
            setLoading(false);
          });
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
