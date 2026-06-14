/**
 * @fileoverview Authentication Context and Hook.
 * @module hooks/use-auth
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext({
  user: null,
  role: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

/**
 * AuthProvider component that wraps the app and provides authentication state.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the role from public.profiles table
  async function fetchUserRole(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile role:', error.message);
        return 'user';
      }
      return data?.role || 'user';
    } catch (err) {
      console.error('Error retrieving user role:', err);
      return 'user';
    }
  }

  useEffect(() => {
    let isMounted = true;

    // Check active sessions
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        const userRole = await fetchUserRole(session.user.id);
        if (isMounted) {
          setRole(userRole);
          setLoading(false);
        }
      } else {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        setLoading(true); // Re-fetch role on user state change
        const userRole = await fetchUserRole(session.user.id);
        if (isMounted) {
          setRole(userRole);
          setLoading(false);
        }
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password using Supabase Auth.
   */
  async function signIn(email, password) {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  }

  /**
   * Sign out the active user session.
   */
  async function signOut() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Signout error:', err);
    } finally {
      setUser(null);
      setRole(null);
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to consume the AuthContext.
 */
export function useAuth() {
  return useContext(AuthContext);
}
