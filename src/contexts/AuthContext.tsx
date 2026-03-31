import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; data: { user: User | null } | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialSessionChecked = false;

    // Check for existing session FIRST to avoid race conditions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      initialSessionChecked = true;
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[Auth] Event:", event, "Session:", !!session);

        // Ignore INITIAL_SESSION event if we already handled it via getSession
        if (event === 'INITIAL_SESSION' && initialSessionChecked) {
          return;
        }
        
        // If token refresh failed, try to recover the session before logging out
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn("[Auth] Token refresh returned no session, attempting recovery...");
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
            return;
          }
        }
        
        // Don't immediately clear user on transient SIGNED_OUT if we had a session
        if (event === 'SIGNED_OUT' && user) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            console.log("[Auth] Recovered session after SIGNED_OUT event");
            setSession(data.session);
            setUser(data.session.user);
            return;
          }
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        if (!initialSessionChecked) {
          setLoading(false);
          initialSessionChecked = true;
        } else {
          setLoading(false);
        }
      }
    );

    // Set up periodic session refresh every 10 minutes to prevent token expiry
    const refreshInterval = setInterval(async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        const expiresAt = currentSession.expires_at ?? 0;
        const now = Math.floor(Date.now() / 1000);
        // Refresh if token expires in less than 5 minutes
        if (expiresAt - now < 300) {
          console.log("[Auth] Proactively refreshing session...");
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            console.error("[Auth] Proactive refresh failed:", error.message);
          } else if (data.session) {
            console.log("[Auth] Session refreshed successfully");
          }
        }
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error, data: data ? { user: data.user } : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
