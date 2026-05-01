import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail, ArrowLeft, KeyRound, UserPlus, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Mode = "login" | "signup" | "reset" | "update-password";

const Auth = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const { user, userRoles, adminLoading, signInWithPassword, signUp } = useAuth();
  const navigate = useNavigate();

  const nextPath = new URLSearchParams(window.location.search).get("next");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("update-password");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || mode === "update-password") return;
    if (adminLoading) return;

    if (nextPath) {
      navigate(nextPath);
      return;
    }

    const isAnyTeamRole = userRoles.some((r) =>
      ["admin", "obchodnik", "senior_obchodnik", "tipar", "influencer_coordinator"].includes(r)
    );

    navigate(isAnyTeamRole ? "/admin" : "/");
  }, [user, navigate, mode, nextPath, adminLoading, userRoles]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signInWithPassword(email, password);
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(t("auth.errPwLen"));
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password);
    if (!error) {
      setMode("login");
      setPassword("");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(t("auth.errEmail"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      toast.error(t("auth.errSendEmail") + error.message);
    } else {
      toast.success(t("auth.okResetSent"));
      setMode("login");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(t("auth.errPwLen"));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("auth.errPwMatch"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(t("auth.errChangePw") + error.message);
    } else {
      toast.success(t("auth.okPwUpdated"));
      setPassword("");
      setConfirmPassword("");
      setMode("login");
    }
    setLoading(false);
  };

  // Editorial copy per mode
  const headerCopy: Record<Mode, { eyebrow: string; titleLead: string; titleAccent: string; desc: string }> = {
    login: {
      eyebrow: "— Welcome back",
      titleLead: "Sign in to your",
      titleAccent: "account",
      desc: t("auth.signInDesc"),
    },
    signup: {
      eyebrow: "— Join us",
      titleLead: "Create your",
      titleAccent: "account",
      desc: t("auth.signUpDesc"),
    },
    reset: {
      eyebrow: "— Recovery",
      titleLead: "Reset your",
      titleAccent: "password",
      desc: t("auth.forgotDesc"),
    },
    "update-password": {
      eyebrow: "— New password",
      titleLead: "Set a new",
      titleAccent: "password",
      desc: t("auth.setNewPasswordDesc"),
    },
  };

  const copy = headerCopy[mode];

  const renderForm = () => {
    if (mode === "update-password") {
      return (
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <Input
            type="password"
            placeholder={t("auth.newPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
            className="h-12 rounded-full px-5 bg-secondary border-0"
          />
          <Input
            type="password"
            placeholder={t("auth.confirmNewPassword")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
            className="h-12 rounded-full px-5 bg-secondary border-0"
          />
          <Button
            type="submit"
            className="w-full h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 text-sm font-medium group"
            disabled={loading}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {loading ? t("auth.saving") : t("auth.saveNewPassword")}
          </Button>
        </form>
      );
    }

    if (mode === "reset") {
      return (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="h-12 rounded-full px-5 bg-secondary border-0"
          />
          <Button
            type="submit"
            className="w-full h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 text-sm font-medium"
            disabled={loading}
          >
            <Mail className="mr-2 h-4 w-4" />
            {loading ? t("auth.sending") : t("auth.sendReset")}
          </Button>
        </form>
      );
    }

    if (mode === "signup") {
      return (
        <form onSubmit={handleSignUp} className="space-y-4">
          <Input
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="h-12 rounded-full px-5 bg-secondary border-0"
          />
          <Input
            type="password"
            placeholder={t("auth.passwordMin")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
            className="h-12 rounded-full px-5 bg-secondary border-0"
          />
          <Button
            type="submit"
            className="w-full h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 text-sm font-medium group"
            disabled={loading}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {loading ? t("auth.signingUp") : t("auth.signUp")}
          </Button>
        </form>
      );
    }

    // login
    return (
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          type="email"
          placeholder={t("auth.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="h-12 rounded-full px-5 bg-secondary border-0"
        />
        <Input
          type="password"
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          className="h-12 rounded-full px-5 bg-secondary border-0"
        />
        <Button
          type="submit"
          className="w-full h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 text-sm font-medium group"
          disabled={loading}
        >
          <Lock className="mr-2 h-4 w-4" />
          {loading ? t("auth.signingIn") : t("auth.signIn")}
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      {/* Left — editorial dark panel */}
      <aside className="hidden lg:flex flex-col justify-between bg-foreground text-background p-12 xl:p-16 relative overflow-hidden">
        <Link to="/" className="flex flex-col group relative z-10">
          <span className="text-2xl font-bold tracking-tight">go2dubai.online</span>
          <span className="text-[0.7rem] uppercase tracking-[0.05em] text-background/60">
            DUBAI VILLAS & APARTMENTS
          </span>
        </Link>

        <div className="relative z-10 max-w-md">
          <span className="block text-[10px] uppercase tracking-[0.3em] text-background/60 mb-6">
            — A vision of the future
          </span>
          <h2 className="editorial-headline text-4xl xl:text-5xl leading-tight mb-6">
            Your gateway to <span className="italic text-accent">Dubai</span>
          </h2>
          <p className="text-base text-background/75 font-light leading-relaxed">
            Discover premium properties, exclusive rentals, and investment opportunities — all in one place.
          </p>
        </div>

        <div className="relative z-10 text-[10px] uppercase tracking-[0.3em] text-background/40">
          © {new Date().getFullYear()} go2dubai.online
        </div>
      </aside>

      {/* Right — form panel */}
      <main className="flex flex-col min-h-screen">
        {/* Top bar with mobile logo + back */}
        <div className="flex items-center justify-between px-6 md:px-10 py-6">
          <Link to="/" className="lg:hidden flex flex-col">
            <span className="text-lg font-bold tracking-tight text-foreground">go2dubai.online</span>
          </Link>
          <Link
            to="/"
            className="ml-auto text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("auth.backHome")}
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 md:px-10 pb-12">
          <div className="w-full max-w-md">
            <span className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
              {copy.eyebrow}
            </span>
            <h1 className="editorial-headline text-4xl md:text-5xl text-foreground leading-tight mb-4">
              {copy.titleLead}{" "}
              <span className="italic text-accent">{copy.titleAccent}</span>
            </h1>
            <p className="text-sm text-muted-foreground font-light leading-relaxed mb-10">
              {copy.desc}
            </p>

            {renderForm()}

            {/* Footer links */}
            <div className="mt-8 pt-8 border-t border-border">
              {mode === "login" && (
                <div className="space-y-3 text-center">
                  <button
                    onClick={() => setMode("signup")}
                    className="text-sm text-foreground hover:text-accent transition-colors block w-full font-medium"
                  >
                    {t("auth.noAccount")}
                  </button>
                  <button
                    onClick={() => setMode("reset")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.2em]"
                  >
                    {t("auth.forgot")}
                  </button>
                </div>
              )}
              {mode === "signup" && (
                <div className="text-center">
                  <button
                    onClick={() => setMode("login")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.2em] inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    {t("auth.haveAccount")}
                  </button>
                </div>
              )}
              {mode === "reset" && (
                <div className="text-center">
                  <button
                    onClick={() => setMode("login")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.2em] inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    {t("auth.backToSignIn")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
