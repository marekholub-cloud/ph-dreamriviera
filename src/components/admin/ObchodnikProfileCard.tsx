import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  User,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  ExternalLink
} from "lucide-react";

interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
}

interface ObchodnikProfileCardProps {
  obchodnikId: string | null;
  size?: "sm" | "md";
}

export const ObchodnikProfileCard = ({ obchodnikId, size = "sm" }: ObchodnikProfileCardProps) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (obchodnikId) {
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [obchodnikId]);

  const fetchProfile = async () => {
    if (!obchodnikId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", obchodnikId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  if (!obchodnikId || !profile) {
    return (
      <span className="text-muted-foreground text-sm">—</span>
    );
  }

  const avatarSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Avatar className={avatarSize}>
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(profile.full_name, profile.email)}
            </AvatarFallback>
          </Avatar>
          {size === "md" && (
            <span className="text-sm font-medium text-foreground">
              {profile.full_name || profile.email}
            </span>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {getInitials(profile.full_name, profile.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h4 className="text-sm font-semibold text-foreground">
              {profile.full_name || "Bez jména"}
            </h4>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {profile.email}
            </p>
            {profile.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {profile.phone}
              </p>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="mt-3 text-xs text-muted-foreground line-clamp-3">
            {profile.bio}
          </p>
        )}

        <div className="flex gap-2 mt-3">
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <Globe className="h-4 w-4 text-muted-foreground" />
            </a>
          )}
          {profile.linkedin_url && (
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <Linkedin className="h-4 w-4 text-blue-600" />
            </a>
          )}
          {profile.instagram_url && (
            <a
              href={profile.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <Instagram className="h-4 w-4 text-pink-600" />
            </a>
          )}
          {profile.facebook_url && (
            <a
              href={profile.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <Facebook className="h-4 w-4 text-blue-600" />
            </a>
          )}
          {profile.twitter_url && (
            <a
              href={profile.twitter_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <Twitter className="h-4 w-4 text-sky-500" />
            </a>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};