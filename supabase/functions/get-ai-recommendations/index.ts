import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionnaire } = await req.json();

    if (!questionnaire) {
      return new Response(JSON.stringify({ error: "Missing questionnaire data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all published properties
    const { data: properties, error: propError } = await supabase
      .from("properties")
      .select(`
        id, name, slug, price_from, price_formatted, type, status, 
        bedrooms, area_sqm, completion_date, short_description, description,
        is_featured, hero_image_url, payment_plan,
        area:areas(name, city),
        developer:developers(name)
      `)
      .eq("is_published", true);

    if (propError) {
      console.error("Error fetching properties:", propError);
      throw new Error("Failed to fetch properties");
    }

    if (!properties || properties.length === 0) {
      return new Response(JSON.stringify({ recommendations: [], reasoning: "No properties available" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build investor profile summary for AI
    const investorProfile = {
      budgetMin: questionnaire.budget_min,
      budgetMax: questionnaire.budget_max,
      investmentHorizon: questionnaire.investment_horizon,
      riskTolerance: questionnaire.risk_tolerance,
      experienceLevel: questionnaire.experience_level,
      financingType: questionnaire.financing_type,
      preferredPropertyTypes: questionnaire.preferred_property_types,
      targetMarkets: questionnaire.target_markets,
      priority: questionnaire.priority,
      additionalNotes: questionnaire.additional_notes,
    };

    // Build property summaries for AI
    const propertySummaries = properties.map((p: any) => ({
      id: p.id,
      name: p.name,
      priceFrom: p.price_from,
      priceFormatted: p.price_formatted,
      type: p.type,
      status: p.status,
      bedrooms: p.bedrooms,
      areaSqm: p.area_sqm,
      completionDate: p.completion_date,
      description: p.short_description || p.description?.substring(0, 200),
      location: p.area ? `${p.area.name}, ${p.area.city}` : "N/A",
      developer: p.developer?.name || "N/A",
      isFeatured: p.is_featured,
      paymentPlan: p.payment_plan,
    }));

    // Call Lovable AI for matching
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Jsi investiční poradce pro nemovitosti v Dubaji a Kostarice. 
Na základě investorského profilu doporuč 3-5 nejlepších projektů ze seznamu.

Pravidla pro matching:
1. ROZPOČET je nejdůležitější - doporučuj pouze projekty v cenovém rozmezí investora (s 20% tolerancí)
2. TYP NEMOVITOSTI - preferuj typy které investor zmínil
3. INVESTIČNÍ HORIZONT - pro krátký horizont (1-3 roky) doporučuj projekty s brzkou dokončením, pro dlouhý (5+ let) mohou být i off-plan s pozdějším dokončením
4. RIZIKO - konzervativní investoři preferují branded residences (Hilton, Marriott), progresivní mohou mít i menší developery
5. ZKUŠENOSTI - začátečníkům doporučuj jednodušší produkty s property managementem

Vrať JSON objekt s:
- "recommended_ids": pole ID doporučených projektů (3-5)
- "reasoning": krátké vysvětlení v češtině proč jsou tyto projekty vhodné
- "match_scores": objekt s ID projektu jako klíčem a skóre shody 0-100 jako hodnotou`;

    const userPrompt = `INVESTOR PROFIL:
${JSON.stringify(investorProfile, null, 2)}

DOSTUPNÉ PROJEKTY:
${JSON.stringify(propertySummaries, null, 2)}

Vyber 3-5 nejlepších projektů pro tohoto investora.`;

    console.log("Calling Lovable AI for recommendations...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_properties",
              description: "Return recommended property IDs with reasoning",
              parameters: {
                type: "object",
                properties: {
                  recommended_ids: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of property IDs to recommend",
                  },
                  reasoning: {
                    type: "string",
                    description: "Explanation in Czech why these properties match",
                  },
                  match_scores: {
                    type: "object",
                    additionalProperties: { type: "number" },
                    description: "Object with property ID as key and match score 0-100 as value",
                  },
                },
                required: ["recommended_ids", "reasoning", "match_scores"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recommend_properties" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback to simple matching
      console.log("Falling back to simple price-based matching");
      const fallbackIds = properties
        .filter((p: any) => {
          if (!investorProfile.budgetMax) return true;
          return p.price_from <= investorProfile.budgetMax * 1.2;
        })
        .sort((a: any, b: any) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
        .slice(0, 5)
        .map((p: any) => p.id);

      return new Response(
        JSON.stringify({
          recommendations: properties.filter((p: any) => fallbackIds.includes(p.id)),
          reasoning: "Doporučení na základě cenového rozpočtu.",
          match_scores: {},
          ai_powered: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData));

    // Extract tool call result
    let recommendedIds: string[] = [];
    let reasoning = "";
    let matchScores: Record<string, number> = {};

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        recommendedIds = parsed.recommended_ids || [];
        reasoning = parsed.reasoning || "";
        matchScores = parsed.match_scores || {};
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // Get full property data for recommended IDs
    const recommendedProperties = properties
      .filter((p: any) => recommendedIds.includes(p.id))
      .map((p: any) => ({
        ...p,
        match_score: matchScores[p.id] || 0,
      }))
      .sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0));

    return new Response(
      JSON.stringify({
        recommendations: recommendedProperties,
        reasoning,
        match_scores: matchScores,
        ai_powered: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-ai-recommendations:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
