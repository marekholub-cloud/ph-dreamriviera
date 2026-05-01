const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PropertyContext {
  name?: string;
  type?: string;
  status?: string;
  bedrooms?: string;
  area_sqm?: string;
  price_formatted?: string;
  developer?: string;
  area?: string;
  city?: string;
  completion_date?: string;
  payment_plan?: string;
  amenities?: string[];
  features?: string[];
  variant: "short" | "long";
  language?: "cs" | "en";
  existingDescription?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx: PropertyContext = await req.json();
    const lang = ctx.language ?? "cs";

    const facts = [
      ctx.name && `Název projektu: ${ctx.name}`,
      ctx.type && `Typ: ${ctx.type}`,
      ctx.status && `Stav: ${ctx.status}`,
      ctx.bedrooms && `Ložnice: ${ctx.bedrooms}`,
      ctx.area_sqm && `Plocha: ${ctx.area_sqm} m²`,
      ctx.price_formatted && `Cena od: ${ctx.price_formatted}`,
      ctx.developer && `Developer: ${ctx.developer}`,
      ctx.area && `Lokalita: ${ctx.area}${ctx.city ? `, ${ctx.city}` : ""}`,
      ctx.completion_date && `Dokončení: ${ctx.completion_date}`,
      ctx.payment_plan && `Platební plán: ${ctx.payment_plan}`,
      ctx.amenities?.length && `Vybavení: ${ctx.amenities.join(", ")}`,
      ctx.features?.length && `Přednosti: ${ctx.features.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    const langInstruction =
      lang === "en"
        ? "Write in fluent, natural English."
        : "Piš plynulou, přirozenou češtinou. Vyhni se anglicismům.";

    const variantInstruction =
      ctx.variant === "short"
        ? lang === "en"
          ? "Write ONE concise sentence (max 25 words) for a property card preview. Captivating, no marketing fluff."
          : "Napiš JEDNU stručnou větu (max 25 slov) pro náhledovou kartu nemovitosti. Poutavá, bez marketingových frází."
        : lang === "en"
        ? "Write a detailed description in 2-3 short paragraphs (150-220 words) for a luxury Dubai property listing. Highlight location, architecture, lifestyle and investment potential. Avoid bullet lists. No headings."
        : "Napiš detailní popis ve 2–3 krátkých odstavcích (150–220 slov) pro luxusní dubajskou nemovitost. Vyzdvihni lokalitu, architekturu, životní styl a investiční potenciál. Bez odrážek. Bez nadpisů.";

    const systemPrompt = `Jsi expert copywriter pro prémiové dubajské reality. ${langInstruction} Pracuj POUZE s fakty, která dostaneš — nic si nevymýšlej (např. konkrétní vzdálenosti, jména architektů, čísla pater apod.). Pokud něco není uvedené, mluv obecně.`;

    const userPrompt = `${variantInstruction}

Fakta o nemovitosti:
${facts || "(minimální data — vytvoř obecný atraktivní text)"}

${ctx.existingDescription ? `Stávající text k vylepšení:\n${ctx.existingDescription}\n\nVylepši ho — zachovej fakta, zlepši styl.` : ""}

Vrať POUZE výsledný text, žádné uvozovky, komentáře nebo nadpisy.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Příliš mnoho požadavků, zkuste to prosím za chvíli." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Vyčerpaný kredit Lovable AI — doplňte v Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const text = (data.choices?.[0]?.message?.content ?? "").trim();

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-property-description error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
