import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, MessageSquare, UserPlus, Calendar, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: 'message' | 'lead' | 'event';
  title: string;
  description: string;
  time: Date;
  read: boolean;
  sourceTable: string;
  sourceId: string;
}

export function NotificationDropdown() {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      // Fetch recent contact messages
      const { data: messages } = await supabase
        .from('contact_messages')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, lead_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch read states for current user
      const { data: readStates } = await supabase
        .from('notification_reads')
        .select('source_table, source_id')
        .eq('user_id', user.id);

      const readSet = new Set(
        readStates?.map(r => `${r.source_table}:${r.source_id}`) || []
      );

      const notifs: Notification[] = [];

      messages?.forEach(msg => {
        const isRead = readSet.has(`contact_messages:${msg.id}`);
        notifs.push({
          id: `msg-${msg.id}`,
          type: 'message',
          title: 'Nová zpráva',
          description: `${msg.name} (${msg.email})`,
          time: new Date(msg.created_at),
          read: isRead,
          sourceTable: 'contact_messages',
          sourceId: msg.id,
        });
      });

      leads?.forEach(lead => {
        const isRead = readSet.has(`leads:${lead.id}`);
        notifs.push({
          id: `lead-${lead.id}`,
          type: 'lead',
          title: 'Nový lead',
          description: lead.lead_name,
          time: new Date(lead.created_at),
          read: isRead,
          sourceTable: 'leads',
          sourceId: lead.id,
        });
      });

      // Sort by time
      notifs.sort((a, b) => b.time.getTime() - a.time.getTime());
      setNotifications(notifs.slice(0, 10));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchNotifications();
  }, [isAdmin, fetchNotifications]);

  const markAsRead = async (notification: Notification) => {
    if (!user || notification.read) return;

    try {
      await supabase
        .from('notification_reads')
        .upsert({
          user_id: user.id,
          source_table: notification.sourceTable,
          source_id: notification.sourceId,
        }, {
          onConflict: 'user_id,source_table,source_id'
        });

      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllRead = async () => {
    if (!user) return;

    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    try {
      const inserts = unreadNotifications.map(n => ({
        user_id: user.id,
        source_table: n.sourceTable,
        source_id: n.sourceId,
      }));

      await supabase
        .from('notification_reads')
        .upsert(inserts, {
          onConflict: 'user_id,source_table,source_id'
        });

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4 text-admin-events" />;
      case 'lead':
        return <UserPlus className="h-4 w-4 text-admin-clients" />;
      case 'event':
        return <Calendar className="h-4 w-4 text-admin-content" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (!isAdmin) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-secondary"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-admin-leads text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifikace</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {unreadCount} nových
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Označit přečtené
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="max-h-80">
          {notifications.length > 0 ? (
            <div className="py-1">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left",
                    !notification.read && "bg-secondary/30"
                  )}
                  onClick={() => markAsRead(notification)}
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-card">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-admin-events flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(notification.time, { 
                        addSuffix: true, 
                        locale: cs 
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Žádné notifikace</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
              Zobrazit všechny notifikace
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
