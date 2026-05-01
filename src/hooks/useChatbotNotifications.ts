import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

interface ChatbotConversation {
  id: string;
  session_id: string;
  completed: boolean;
  handoff_to_human: boolean;
  investor_data: Json;
  created_at: string;
}

export function useChatbotNotifications() {
  const { userRoles } = useAuth();
  const { toast } = useToast();
  const isAdmin = userRoles.includes('admin');

  useEffect(() => {
    if (!isAdmin) return;

    console.log("[Chatbot Notifications] Setting up realtime subscription for admin");

    const channel = supabase
      .channel('chatbot-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chatbot_conversations',
        },
        (payload) => {
          console.log("[Chatbot Notifications] Received update:", payload);
          
          const newData = payload.new as ChatbotConversation;
          const oldData = payload.old as Partial<ChatbotConversation>;
          
          // Check if this is a new completion
          if (newData.completed && !oldData.completed) {
            const investorData = newData.investor_data as Record<string, unknown> | null;
            const contactInfo = investorData?.contact_whatsapp || investorData?.contact_email || 'Neznámý kontakt';
            
            toast({
              title: "🎉 Nový dokončený dotazník!",
              description: `Investor dokončil chatbot dotazník. Kontakt: ${contactInfo}`,
              duration: 10000,
            });
          }
          
          // Check if this is a handoff request
          if (newData.handoff_to_human && !oldData.handoff_to_human) {
            toast({
              title: "⚠️ Požadavek na operátora",
              description: "Uživatel požádal o předání konverzace operátorovi.",
              variant: "destructive",
              duration: 10000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chatbot_conversations',
        },
        (payload) => {
          console.log("[Chatbot Notifications] New conversation started:", payload);
          
          const newData = payload.new as ChatbotConversation;
          
          // Only notify on completed conversations (immediate completion is rare but possible)
          if (newData.completed) {
            const investorData = newData.investor_data as Record<string, unknown> | null;
            const contactInfo = investorData?.contact_whatsapp || investorData?.contact_email || 'Neznámý kontakt';
            
            toast({
              title: "🎉 Nový dokončený dotazník!",
              description: `Investor dokončil chatbot dotazník. Kontakt: ${contactInfo}`,
              duration: 10000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("[Chatbot Notifications] Subscription status:", status);
      });

    return () => {
      console.log("[Chatbot Notifications] Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [isAdmin, toast]);
}
