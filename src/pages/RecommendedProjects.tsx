import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Building2, MapPin, Wallet, Sparkles, Bot, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties"> & {
  area?: { name: string; city: string } | null;
  developer?: { name: string } | null;
  match_score?: number;
};

type Questionnaire = Tables<"investor_questionnaires">;

const RecommendedProjects = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [recommendations, setRecommendations] = useState<Property[]>([]);
  const [reasoning, setReasoning] = useState<string>("");
  const [aiPowered, setAiPowered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?next=/doporucene-projekty");
    }
  }, [user, authLoading, navigate]);

  const fetchAIRecommendations = async (qData: Questionnaire) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-ai-recommendations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ questionnaire: qData }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("AI recommendations error:", response.status, errorData);
        throw new Error(errorData.error || "AI matching failed");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to get AI recommendations:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      // 1. Get user's questionnaire (via their leads)
      const { data: leads } = await supabase
        .from("leads")
        .select("id")
        .or(`referrer_id.eq.${user.id},email.eq.${user.email}`)
        .limit(10);

      if (!leads || leads.length === 0) {
        setNoProfile(true);
        setLoading(false);
        return;
      }

      const leadIds = leads.map((l) => l.id);
      const { data: qData } = await supabase
        .from("investor_questionnaires")
        .select("*")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!qData) {
        setNoProfile(true);
        setLoading(false);
        return;
      }

      setQuestionnaire(qData);

      // 2. Call AI matching backend
      try {
        const aiResult = await fetchAIRecommendations(qData);
        setRecommendations(aiResult.recommendations || []);
        setReasoning(aiResult.reasoning || "");
        setAiPowered(aiResult.ai_powered || false);
      } catch (error) {
        toast.error("AI matching selhal, zobrazuji základní doporučení");
        
        // Fallback to simple query
        const { data: properties } = await supabase
          .from("properties")
          .select("*, area:areas(name, city), developer:developers(name)")
          .eq("is_published", true)
          .order("is_featured", { ascending: false })
          .limit(5);

        setRecommendations((properties as Property[]) || []);
        setAiPowered(false);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-6 w-96" />
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (noProfile) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Doporučené projekty | go2dubai.online" description="Zatím nemáme váš investiční profil. Vyplňte krátký dotazník." />
        <Navbar />
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-xl mx-auto text-center space-y-6">
            <Sparkles className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-3xl font-serif font-bold">Zatím nemáme váš profil</h1>
            <p className="text-muted-foreground">
              Vyplňte krátký investiční dotazník pomocí našeho chatbota a my vám doporučíme projekty přesně podle vašich
              preferencí.
            </p>
            <Button size="lg" onClick={() => navigate("/")}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Zpět na hlavní stránku
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Doporučené projekty | go2dubai.online"
        description="Projekty vybrané podle vašeho investičního profilu."
      />
      <Navbar />

      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="text-sm text-primary font-medium uppercase tracking-wider">Personalizováno pro vás</span>
              {aiPowered && (
                <Badge variant="secondary" className="gap-1">
                  <Bot className="w-3 h-3" />
                  AI matching
                </Badge>
              )}
            </div>
            <h1 className="text-4xl font-serif font-bold mb-4">Doporučené projekty</h1>
            <p className="text-muted-foreground mb-8">
              Na základě vašeho investičního profilu jsme vybrali tyto projekty, které by vás mohly zajímat.
            </p>

            {questionnaire && (
              <div className="bg-secondary/50 rounded-xl p-6 mb-10 border border-border">
                <h3 className="font-semibold mb-3">Váš investiční profil</h3>
                <div className="flex flex-wrap gap-2">
                  {questionnaire.budget_min && questionnaire.budget_max && (
                    <Badge variant="outline" className="gap-1">
                      <Wallet className="w-3 h-3" />
                      {questionnaire.budget_min?.toLocaleString()} – {questionnaire.budget_max?.toLocaleString()} USD
                    </Badge>
                  )}
                  {questionnaire.investment_horizon && (
                    <Badge variant="outline">Horizont: {questionnaire.investment_horizon}</Badge>
                  )}
                  {questionnaire.risk_tolerance && (
                    <Badge variant="outline">Riziko: {questionnaire.risk_tolerance}</Badge>
                  )}
                  {questionnaire.preferred_property_types?.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {reasoning && (
              <div className="bg-primary/5 rounded-xl p-6 mb-10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">AI doporučení</h3>
                </div>
                <p className="text-muted-foreground">{reasoning}</p>
              </div>
            )}

            {recommendations.length === 0 ? (
              <p className="text-muted-foreground">Momentálně nemáme žádné projekty odpovídající vašim kritériím.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {recommendations.map((property) => (
                  <Link key={property.id} to={`/nemovitost/${property.slug}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                      <div className="relative h-48">
                        <img
                          src={property.hero_image_url || "/placeholder.svg"}
                          alt={property.name}
                          className="w-full h-full object-cover"
                        />
                        {property.is_featured && (
                          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">Doporučeno</Badge>
                        )}
                        {property.match_score && property.match_score > 0 && (
                          <Badge className="absolute top-3 right-3 bg-secondary text-secondary-foreground">
                            {property.match_score}% shoda
                          </Badge>
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{property.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {property.area?.name}, {property.area?.city}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          {property.developer?.name}
                        </div>
                        {property.price_formatted && (
                          <p className="font-semibold text-primary">od {property.price_formatted}</p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default RecommendedProjects;
