import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavbarUserAvatarProps {
  to: string;
  title?: string;
}

export const NavbarUserAvatar = ({ to, title }: NavbarUserAvatarProps) => {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setAvatarUrl(data?.avatar_url ?? null);
      setFullName(data?.full_name ?? null);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;

  const initials = (fullName || user.email || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      to={to}
      title={title ?? fullName ?? user.email ?? ""}
      className="hidden sm:inline-flex"
    >
      <Avatar className="h-9 w-9 ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? "avatar"} />}
        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
};
