import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Inbox, MessageSquare } from "lucide-react";
import { RentalMessageThread } from "./RentalMessageThread";

interface Thread {
  id: string;
  property_id: string;
  guest_id: string;
  host_id: string;
  subject: string | null;
  last_message_at: string;
  guest_unread_count: number;
  host_unread_count: number;
  property?: { title: string; slug: string };
  counterpart?: { full_name: string | null; email: string };
}

export const RentalMessagesInbox = ({ currentUserId }: { currentUserId: string }) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rental_message_threads")
      .select("*")
      .or(`guest_id.eq.${currentUserId},host_id.eq.${currentUserId}`)
      .order("last_message_at", { ascending: false });

    const list = (data || []) as Thread[];

    if (list.length) {
      const propIds = Array.from(new Set(list.map((t) => t.property_id)));
      const userIds = Array.from(new Set(list.flatMap((t) => [t.guest_id, t.host_id])));

      const [{ data: props }, { data: profiles }] = await Promise.all([
        supabase.from("rental_properties").select("id,title,slug").in("id", propIds),
        supabase.from("profiles").select("id,full_name,email").in("id", userIds),
      ]);

      const pMap = new Map((props || []).map((p: any) => [p.id, p]));
      const uMap = new Map((profiles || []).map((u: any) => [u.id, u]));

      list.forEach((t) => {
        t.property = pMap.get(t.property_id) as any;
        const counterpartId = t.guest_id === currentUserId ? t.host_id : t.guest_id;
        t.counterpart = uMap.get(counterpartId) as any;
      });
    }

    setThreads(list);
    setLoading(false);
    if (!activeId && list.length) setActiveId(list[0].id);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`inbox-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rental_message_threads" },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const active = threads.find((t) => t.id === activeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5" /> Zprávy</CardTitle>
        <CardDescription>Konverzace s hosty a hostiteli k pronájmům.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : threads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Zatím žádné konverzace.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[500px]">
            <ScrollArea className="border-r max-h-[500px]">
              <div className="divide-y">
                {threads.map((t) => {
                  const unread = t.guest_id === currentUserId ? t.guest_unread_count : t.host_unread_count;
                  const isActive = t.id === activeId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveId(t.id)}
                      className={`w-full text-left p-3 hover:bg-accent transition ${isActive ? "bg-accent" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {t.counterpart?.full_name || t.counterpart?.email || "Uživatel"}
                        </span>
                        {unread > 0 && <Badge className="text-xs">{unread}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{t.property?.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(t.last_message_at).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            {active ? (
              <RentalMessageThread
                threadId={active.id}
                currentUserId={currentUserId}
                counterpartName={active.counterpart?.full_name || active.counterpart?.email}
              />
            ) : (
              <div className="flex items-center justify-center text-muted-foreground text-sm">
                Vyberte konverzaci
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
