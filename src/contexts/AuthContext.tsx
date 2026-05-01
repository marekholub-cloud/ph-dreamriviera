// @refresh reset
import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { getStoredAffiliateCode, getReferrerIdFromCode, clearAffiliateCode } from "@/utils/affiliateCode";

export type AppRole = 'admin' | 'moderator' | 'user' | 'obchodnik' | 'tipar' | 'senior_obchodnik' | 'influencer_coordinator' | 'host' | 'guest';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isObchodnik: boolean;
  isTipar: boolean;
  isSeniorObchodnik: boolean;
  isCoordinator: boolean;
  userRoles: AppRole[];
  adminLoading: boolean;
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: any; user: User | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const navigate = useNavigate();

  const isAdmin = userRoles.includes('admin');
  const isObchodnik = userRoles.includes('obchodnik') || userRoles.includes('senior_obchodnik');
  const isTipar = userRoles.includes('tipar');
  const isSeniorObchodnik = userRoles.includes('senior_obchodnik');
  const isCoordinator = userRoles.includes('influencer_coordinator');

  const hasRole = (role: AppRole) => userRoles.includes(role);
  const hasAnyRole = (roles: AppRole[]) => roles.some(role => userRoles.includes(role));

  const checkUserRoles = async (userId: string) => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) throw error;
      
      const roles = (data?.map((r) => r.role) || []) as AppRole[];
      setUserRoles(roles);
    } catch (error) {
      console.error("Error checking user roles:", error);
      setUserRoles([]);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    let currentUserId: string | null = null;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        const newUserId = newSession?.user?.id ?? null;

        // Always update the session reference (token may have refreshed),
        // but skip state churn when the user identity hasn't actually changed.
        // This prevents re-renders/remounts (and lost form state) when the
        // browser tab regains focus and Supabase fires TOKEN_REFRESHED.
        if (event === "TOKEN_REFRESHED" && newUserId === currentUserId) {
          setSession(newSession);
          return;
        }

        if (newUserId === currentUserId && event !== "SIGNED_OUT") {
          // Same user, non-meaningful event — just sync session silently.
          setSession(newSession);
          setLoading(false);
          return;
        }

        currentUserId = newUserId;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Defer role check with setTimeout
        if (newSession?.user) {
          setTimeout(() => {
            checkUserRoles(newSession.user.id);
          }, 0);
        } else {
          setUserRoles([]);
        }

        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      currentUserId = session?.user?.id ?? null;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          checkUserRoles(session.user.id);
        }, 0);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Přihlášení úspěšné",
      });
    } catch (error: any) {
      console.error("Error signing in:", error);
      toast({
        title: "Chyba při přihlášení",
        description: error.message === "Invalid login credentials" 
          ? "Neplatné přihlašovací údaje" 
          : error.message,
        variant: "destructive",
      });
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      // Uložit referrer kód do profilu (pokud existuje)
      if (data.user) {
        const affiliateCode = getStoredAffiliateCode();
        if (affiliateCode) {
          const referrerId = await getReferrerIdFromCode(affiliateCode);
          await supabase
            .from('profiles')
            .update({
              last_known_affiliate_code: affiliateCode,
              referrer_id: referrerId
            })
            .eq('id', data.user.id);
          
          // Vyčistit affiliate kód po úspěšné registraci
          clearAffiliateCode();
        }
      }

      toast({
        title: "Registrace úspěšná",
        description: "Nyní se můžete přihlásit.",
      });
      
      return { error: null, user: data.user ?? null };
    } catch (error: any) {
      console.error("Error signing up:", error);
      toast({
        title: "Chyba při registraci",
        description: error.message === "User already registered" 
          ? "Uživatel s tímto emailem již existuje" 
          : error.message,
        variant: "destructive",
      });
      return { error, user: null };
    }
  };

  const clearLocalAuthState = () => {
    setUser(null);
    setSession(null);
    setUserRoles([]);

    if (typeof window !== "undefined") {
      [window.localStorage, window.sessionStorage].forEach((storage) => {
        const keysToRemove: string[] = [];

        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i);
          if (key && /^sb-.*auth-token$/.test(key)) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach((key) => storage.removeItem(key));
      });
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error && !/session/i.test(error.message || "")) {
        throw error;
      }
    } catch (error: any) {
      console.error("Error signing out:", error);
    } finally {
      clearLocalAuthState();
      navigate("/auth", { replace: true });
      toast({
        title: "Odhlášení proběhlo úspěšně",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        isObchodnik,
        isTipar,
        isSeniorObchodnik,
        isCoordinator,
        userRoles,
        adminLoading,
        loading,
        hasRole,
        hasAnyRole,
        signInWithPassword,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
