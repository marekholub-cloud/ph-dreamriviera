import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2, UserPlus, TrendingUp, PartyPopper, Users, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useNotifications, NotificationType } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'lead_created':
      return <UserPlus className="h-4 w-4 text-primary" />;
    case 'lead_assigned':
      return <Users className="h-4 w-4 text-blue-500" />;
    case 'lead_status_changed':
      return <TrendingUp className="h-4 w-4 text-amber-500" />;
    case 'lead_converted':
      return <PartyPopper className="h-4 w-4 text-emerald-500" />;
    case 'commission_confirmed':
      return <Check className="h-4 w-4 text-emerald-500" />;
    case 'team_summary':
      return <Users className="h-4 w-4 text-purple-500" />;
    case 'system_alert':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getNotificationBg = (type: NotificationType, isRead: boolean) => {
  if (isRead) return "bg-muted/30";
  
  switch (type) {
    case 'lead_converted':
    case 'commission_confirmed':
      return "bg-emerald-500/10 border-l-2 border-emerald-500";
    case 'lead_assigned':
      return "bg-blue-500/10 border-l-2 border-blue-500";
    case 'lead_status_changed':
      return "bg-amber-500/10 border-l-2 border-amber-500";
    case 'system_alert':
      return "bg-destructive/10 border-l-2 border-destructive";
    default:
      return "bg-primary/10 border-l-2 border-primary";
  }
};

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();

  const handleNotificationClick = (notificationId: string, leadId?: string) => {
    markAsRead(notificationId);
    if (leadId) {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative w-10 h-10 rounded-full text-foreground/60 hover:text-foreground hover:bg-foreground/10"
          title="Notifikace"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[380px] p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Notifikace</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} nových
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Označit vše
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Načítám notifikace...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Žádné notifikace</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification) => {
                const leadId = notification.data?.lead_id as string | undefined;
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 transition-colors hover:bg-muted/50 relative group",
                      getNotificationBg(notification.type, notification.is_read)
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-0.5">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          notification.is_read ? "bg-muted" : "bg-background"
                        )}>
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm font-medium",
                            notification.is_read ? "text-muted-foreground" : "text-foreground"
                          )}>
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => markAsRead(notification.id)}
                                title="Označit jako přečtené"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => deleteNotification(notification.id)}
                              title="Smazat"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className={cn(
                          "text-sm mt-0.5",
                          notification.is_read ? "text-muted-foreground/70" : "text-muted-foreground"
                        )}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { 
                              addSuffix: true, 
                              locale: cs 
                            })}
                          </span>
                          {leadId && (
                            <Link
                              to={`/lead/${leadId}`}
                              onClick={() => handleNotificationClick(notification.id, leadId)}
                              className="text-xs text-primary hover:underline"
                            >
                              Zobrazit detail →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <Separator />
        <div className="p-2">
          <Link to="/dashboard" onClick={() => setIsOpen(false)}>
            <Button variant="ghost" className="w-full text-sm">
              Zobrazit všechny notifikace
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};
