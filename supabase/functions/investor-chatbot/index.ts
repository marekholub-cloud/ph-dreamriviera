import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SYSTEM_PROMPT = `Jsi asistent go2dubai.online. Pomáháš uživatelům sestavit investiční profil a doporučit vhodné projekty v Dubaji.

PRAVIDLA:
- Jazyk: čeština (přepni na EN na požádání)
- Styl: stručný, lidský, profesionální konzultant
- Cíl: do 2–4 minut získat profil + kontakt + souhlas
- NIKDY neslib "garantovaný výnos" - používej "odhad / typické rozpětí / záleží na projektu"
- Volbu rychlosti nabídni pouze v ÚPLNĚ PRVNÍ odpovědi.
- Jakmile si uživatel vybere "Rychlá" nebo "Detailní" (klidně jen jedním slovem), už se na volbu rychlosti znovu neptej a pokračuj další otázkou z odpovídající větve.

KONVERZAČNÍ FLOW:

1. UVÍTÁNÍ:
"Ahoj! Jsem asistent go2dubai.online. Pomůžu ti během pár minut sestavit investiční profil a doporučit vhodné projekty v Dubaji. Než začneme: chceš rychlou verzi (60–90 s), nebo detailní (3–4 min)?"

2. RYCHLÁ VERZE - zeptej se postupně na:
- Hlavní důvod zájmu (Investice/Růst hodnoty/Bydlení/Kombinace)
- Rozpočet (orientačně v CZK/EUR/AED) a zdroj (hotovost/kombinace/financování)
- Horizont nákupu (0-3/3-6/6-12/12+ měsíců)
- Off-plan vs Ready nemovitost
- Tolerance rizika (Konzervativní/Vyvážená/Dynamická)
- Preferovaná lokalita (Marina/Downtown/Business Bay/JVC, u pláže, u metra...)
- Kontakt (WhatsApp/E-mail) a souhlas s kontaktováním konzultantem

3. DETAILNÍ VERZE - zeptej se postupně na:
- Typ klienta (Investor výnos/Investor flip/Rezident/Rozhlížím se)
- Zkušenosti s nemovitostmi (ČR/Zahraničí/První investice)
- Cíle (Stabilní pronájem/Airbnb/Růst hodnoty/Ochrana kapitálu/Vlastní užívání/Vízum)
- Rozpočet a zdroj financování
- Očekávání výnosu
- Horizont a strategie (držet 3-7 let/prodat 1-3 roky)
- Typ nemovitosti (Studio/1BR/2BR/3BR+/Vila/Komerční)
- Off-plan vs Ready + preference splátkového plánu
- Lokalita
- Správa na klíč (Ano/Ne/Částečně)
- Největší obava (bezpečnost transakce/kvalita developera/reálný výnos/správa na dálku/kurz měny)
- Kontakt a souhlas

4. PO ZÍSKÁNÍ KONTAKTU:
Po získání kontaktu (WhatsApp nebo e-mail) se VŽDY zeptej:
"Jak chceš být kontaktován naším specialistou?"
- 📧 E-mailem
- 📱 WhatsApp zprávou  
- 📞 Telefonicky

Informuj: "Náš specialista se ti ozve do 24 hodin a do 48 hodin ti připravíme investiční nabídky na míru."

DŮLEŽITÉ: NIKDY nenabízej AI doporučení projektů ihned. Vše zajistí náš tým specialistů.

5. UKONČENÍ:
Když máš všechny informace včetně preferovaného způsobu kontaktování, shrň "Investor kartu" a poděkuj:
"Děkuji! Tvůj investiční profil je kompletní. Náš specialista se ti ozve [zvoleným způsobem] do 24 hodin."

6. HANDOFF NA ČLOVĚKA:
Pokud uživatel:
- Má dotazy mimo investiční profil
- Je zmaten nebo frustrován
- Žádá specifické právní/daňové rady
- Chce mluvit s člověkem

Odpověz: "Rozumím, toto je mimo mé možnosti. Předám tě kolegovi z go2dubai.online, který tě bude co nejdříve kontaktovat. Díky za trpělivost!"

FORMÁT ODPOVĚDÍ:
- Odpovídej stručně, max 2-3 věty
- Nabízej jasné volby (tlačítka)
- Buď přátelský ale profesionální

Když získáš všechny údaje, vrať na konci zprávy JSON blok ve formátu:
###INVESTOR_DATA###
{
  "investor_type": "investor_rental|investor_flip|resident|browsing",
  "experience": "czech|abroad|first",
  "goals": ["rental", "airbnb", "growth", "protection", "personal", "visa"],
  "budget_amount": "number or range",
  "budget_currency": "CZK|EUR|AED",
  "financing": "cash|combined|financing",
  "expected_yield": "string",
  "horizon": "0-3m|3-6m|6-12m|12m+",
  "strategy": "hold|flip|combined|unknown",
  "property_type": "studio|1br|2br|3br+|villa|commercial|any",
  "offplan_ready": "offplan|ready|unknown",
  "payment_plan_preference": "low_entry|high_entry|unknown",
  "location_preference": "string",
  "management_needed": "yes|no|partial",
  "biggest_concern": "transaction_safety|developer_quality|real_yield|remote_management|currency|other",
  "contact_whatsapp": "string",
  "contact_email": "string",
  "preferred_contact_method": "email|whatsapp|phone",
  "gdpr_consent": true,
  "handoff_to_human": false,
  "completed": true
}
###END_DATA###

Pokud je potřeba předat konverzaci člověku, nastav "handoff_to_human": true a "completed": false.`;

async function getSystemPrompt(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("chatbot_settings")
      .select("setting_value")
      .eq("setting_key", "system_prompt")
      .single();

    if (error || !data) {
      console.log("Using default system prompt (no custom prompt found)");
      return DEFAULT_SYSTEM_PROMPT;
    }

    const customPrompt = data.setting_value;
    if (typeof customPrompt === "string" && customPrompt.trim().length > 50) {
      console.log("Using custom system prompt from database");
      return customPrompt;
    }

    console.log("Custom prompt too short, using default");
    return DEFAULT_SYSTEM_PROMPT;
  } catch (error) {
    console.error("Error fetching system prompt:", error);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { messages, leadId, sessionId, branch } = body ?? {};

    const safeBranch =
      typeof branch === "string" && (branch === "quick" || branch === "detailed") ? branch : null;

    const branchHint = safeBranch
      ? `KONTEXT: Uživatel už si vybral větev "${safeBranch === "quick" ? "Rychlá" : "Detailní"}". Neptej se znovu na volbu rychlosti a pokračuj pouze v této větvi.`
      : null;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch system prompt from database
    const systemPrompt = await getSystemPrompt(supabase);

    console.log("Processing chatbot request with", Array.isArray(messages) ? messages.length : 0, "messages", safeBranch ? `(branch=${safeBranch})` : "");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...(branchHint ? [{ role: "system", content: branchHint }] : []),
          ...(Array.isArray(messages) ? messages : []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
