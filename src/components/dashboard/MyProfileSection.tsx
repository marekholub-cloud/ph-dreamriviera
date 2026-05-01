import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";

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
  assigned_obchodnik_id: string | null;
  lifecycle_status: string | null;
}

interface ObchodnikData {
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

interface BrochureRequest {
  id: string;
  name: string;
  request_type: string;
  created_at: string;
  selected_brochures: any;
}

interface ContactMessage {
  id: string;
  message: string;
  created_at: string;
}

export const MyProfileSection = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [obchodnik, setObchodnik] = useState<ObchodnikData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching profile:", profileError);
      }
      
      setProfile(profileData);

      // If user has assigned obchodnik, fetch their data
      if (profileData?.assigned_obchodnik_id) {
        const { data: obchodnikData, error: obchodnikError } = await supabase
          .from("profiles")
          .select("id, email, full_name, phone, bio, avatar_url, website, linkedin_url, instagram_url, facebook_url, twitter_url")
          .eq("id", profileData.assigned_obchodnik_id)
          .single();

        if (!obchodnikError) {
          setObchodnik(obchodnikData);
        }
      }

    } catch (error) {
      console.error("Error fetching data:", error);
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

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, { label: string; color: string }> = {
      visitor: { label: "Návštěvník", color: "bg-muted text-muted-foreground" },
      lead: { label: "Lead", color: "bg-blue-500/10 text-blue-500" },
      qualified: { label: "Kvalifikovaný", color: "bg-amber-500/10 text-amber-500" },
      client: { label: "Klient", color: "bg-green-500/10 text-green-500" },
      premium: { label: "Premium", color: "bg-purple-500/10 text-purple-500" },
      vip: { label: "VIP", color: "bg-amber-600/10 text-amber-600" },
    };
    return labels[status || "visitor"] || labels.visitor;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const statusInfo = getStatusLabel(profile?.lifecycle_status);

  return (
    <div className="space-y-6">
      {/* Obchodník Card - Prominently displayed */}
      {obchodnik ? (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
            <Star className="h-5 w-5 text-primary" />
            Váš osobní poradce
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground/70">
            Kontaktujte svého poradce pro jakékoliv dotazy ohledně investic
          </CardDescription>
        </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={obchodnik.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(obchodnik.full_name, obchodnik.email)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-3">
                <h3 className="text-xl font-semibold">
                  {obchodnik.full_name || "Váš poradce"}
                </h3>
                
                {obchodnik.bio && (
                  <p className="text-sm text-muted-foreground">
                    {obchodnik.bio}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <a 
                    href={`mailto:${obchodnik.email}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    {obchodnik.email}
                  </a>
                  
                  {obchodnik.phone && (
                    <a 
                      href={`tel:${obchodnik.phone}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      {obchodnik.phone}
                    </a>
                  )}
                </div>

                {/* Social Links */}
                <div className="flex gap-2 pt-2">
                  {obchodnik.website && (
                    <a
                      href={obchodnik.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    </a>
                  )}
                  {obchodnik.linkedin_url && (
                    <a
                      href={obchodnik.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Linkedin className="h-5 w-5 text-blue-600" />
                    </a>
                  )}
                  {obchodnik.instagram_url && (
                    <a
                      href={obchodnik.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Instagram className="h-5 w-5 text-pink-600" />
                    </a>
                  )}
                  {obchodnik.facebook_url && (
                    <a
                      href={obchodnik.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Facebook className="h-5 w-5 text-blue-600" />
                    </a>
                  )}
                  {obchodnik.twitter_url && (
                    <a
                      href={obchodnik.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Twitter className="h-5 w-5 text-sky-500" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-2">Zatím nemáte přiřazeného poradce</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Brzy vám bude přiřazen osobní poradce pro investice
            </p>
          </CardContent>
        </Card>
      )}

      {/* User Profile Card */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
            <User className="h-5 w-5" />
            Můj profil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {getInitials(profile?.full_name || null, user?.email || "U")}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-semibold">
                  {profile?.full_name || user?.email}
                </h3>
                <Badge className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </div>
                {profile?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {profile.phone}
                  </div>
                )}
              </div>

              {profile?.bio && (
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              )}

              <Link to="/investor-profil">
                <Button variant="outline" size="sm" className="mt-2">
                  Upravit profil
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
