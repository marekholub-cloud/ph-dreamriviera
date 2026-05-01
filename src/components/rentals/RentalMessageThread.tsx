import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface Props {
  threadId: string;
  currentUserId: string;
  counterpartName?: string;
}

export const RentalMessageThread = ({ threadId, currentUserId, counterpartName }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // Mark thread as read for current user
  const markRead = async () => {
    const { data: t } = await supabase
      .from("rental_message_threads")
      .select("guest_id,host_id")
      .eq("id", threadId)
      .maybeSingle();
    if (!t) return;
    const patch = currentUserId === t.guest_id ? { guest_unread_count: 0 } : { host_unread_count: 0 };
    await supabase.from("rental_message_threads").update(patch).eq("id", threadId);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("rental_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (!active) return;
      setMessages((data || []) as Message[]);
      setLoading(false);
      scrollToBottom();
      markRead();
    })();

    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rental_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          scrollToBottom();
          if ((payload.new as Message).sender_id !== currentUserId) markRead();
        }
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const { error } = await supabase.from("rental_messages").insert({
      thread_id: threadId,
      sender_id: currentUserId,
      body: text.trim(),
    });
    setSending(false);
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
      return;
    }
    setText("");
  };

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      <div className="px-4 py-3 border-b">
        <h3 className="font-medium text-sm">{counterpartName || "Conversation"}</h3>
      </div>
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Start the conversation.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const mine = m.sender_id === currentUserId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>
      <div className="border-t p-3 flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
          rows={2}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
          className="resize-none"
        />
        <Button onClick={send} disabled={sending || !text.trim()} size="icon" className="h-auto">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
