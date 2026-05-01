import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  Save,
  Loader2,
  Camera,
  Link2
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
  affiliate_code: string | null;
}

const ObchodnikProfile = () => {
  const { user, isObchodnik, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio: "",
    website: "",
    linkedin_url: "",
    instagram_url: "",
    facebook_url: "",
    twitter_url: ""
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (user) {
      fetchProfile();
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        bio: data.bio || "",
        website: data.website || "",
        linkedin_url: data.linkedin_url || "",
        instagram_url: data.instagram_url || "",
        facebook_url: data.facebook_url || "",
        twitter_url: data.twitter_url || ""
      });
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Chyba při načítání profilu",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Neplatný soubor",
        description: "Vyberte prosím obrázek.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Soubor je příliš velký",
        description: "Maximální velikost je 2 MB.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `avatars/${user.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("property-images")
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
      toast({
        title: "Fotografie nahrána",
        description: "Vaše profilová fotografie byla aktualizována."
      });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Chyba při nahrávání",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          bio: formData.bio || null,
          website: formData.website || null,
          linkedin_url: formData.linkedin_url || null,
          instagram_url: formData.instagram_url || null,
          facebook_url: formData.facebook_url || null,
          twitter_url: formData.twitter_url || null
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profil uložen",
        description: "Vaše změny byly úspěšně uloženy."
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Chyba při ukládání",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Můj profil</h1>
            <p className="text-muted-foreground">
              Upravte své osobní údaje a sociální sítě
            </p>
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getInitials(profile?.full_name || null, profile?.email || "")}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </div>
                <div>
                  <CardTitle>{profile?.full_name || profile?.email}</CardTitle>
                  <CardDescription>{profile?.email}</CardDescription>
                  {profile?.affiliate_code && (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <Link2 className="h-4 w-4 text-primary" />
                      <code className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-mono">
                        {profile.affiliate_code}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Osobní údaje
                  </h3>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="full_name">Jméno a příjmení</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Jan Novák"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+420 123 456 789"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio / O mně</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Krátký popis vaší činnosti a zkušeností..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Website & Social */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Webové stránky a sociální sítě
                  </h3>

                  <div>
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Webové stránky
                    </Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://www.example.com"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                      </Label>
                      <Input
                        id="linkedin_url"
                        value={formData.linkedin_url}
                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="instagram_url" className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </Label>
                      <Input
                        id="instagram_url"
                        value={formData.instagram_url}
                        onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                        placeholder="https://instagram.com/..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="facebook_url" className="flex items-center gap-2">
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </Label>
                      <Input
                        id="facebook_url"
                        value={formData.facebook_url}
                        onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                        placeholder="https://facebook.com/..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="twitter_url" className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" />
                        Twitter / X
                      </Label>
                      <Input
                        id="twitter_url"
                        value={formData.twitter_url}
                        onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                        placeholder="https://twitter.com/..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Ukládám...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Uložit profil
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default ObchodnikProfile;