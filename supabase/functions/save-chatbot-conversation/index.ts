import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

type InvestorData = Record<string, unknown> & {
  completed?: boolean;
  handoff_to_human?: boolean;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, leadId, messages, investorData, branch } = await req.json();

    if (!sessionId || typeof sessionId !== "string") {
      return new Response(JSON.stringify({ error: "Missing sessionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const safeMessages: ChatMessage[] = Array.isArray(messages)
      ? messages
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(0, 200)
      : [];

    const safeInvestorData: InvestorData | null = investorData && typeof investorData === "object" ? investorData : null;
    const safeBranch: string | null = typeof branch === "string" && (branch === "quick" || branch === "detailed") ? branch : null;

    const status = safeInvestorData?.completed
      ? "completed"
      : safeInvestorData?.handoff_to_human
        ? "handoff"
        : "active";

    // Find existing conversation (if any)
    const { data: existing, error: existingError } = await supabase
      .from("chatbot_conversations")
      .select("id, branch")
      .eq("session_id", sessionId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("save-chatbot-conversation existing lookup error:", existingError);
      throw existingError;
    }

    // Only update branch if it's being set and wasn't already set
    const finalBranch = safeBranch || existing?.branch || null;

    const payload = {
      session_id: sessionId,
      lead_id: typeof leadId === "string" ? leadId : null,
      messages: safeMessages,
      investor_data: safeInvestorData,
      status,
      handoff_to_human: Boolean(safeInvestorData?.handoff_to_human),
      completed: Boolean(safeInvestorData?.completed),
      branch: finalBranch,
      // user_id stays null for anonymous sessions; it can be linked later after login
      user_id: null as string | null,
    };

    const result = existing
      ? await supabase.from("chatbot_conversations").update(payload).eq("id", existing.id)
      : await supabase.from("chatbot_conversations").insert(payload);

    if (result.error) {
      console.error("save-chatbot-conversation upsert error:", result.error);
      throw result.error;
    }

    return new Response(JSON.stringify({ success: true, branch: finalBranch }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("save-chatbot-conversation error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
