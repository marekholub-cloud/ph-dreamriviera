import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, PartyPopper, TrendingUp, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NewLeadNotificationProps {
  onNewLead?: () => void;
}

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: "lead_created" | "lead_status_changed" | "lead_converted" | "lead_assigned";
}

export const NewLeadNotification = ({ onNewLead }: NewLeadNotificationProps) => {
  const { user } = useAuth();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to new notifications for this user (real-time toast display)
    const channel = supabase
      .channel(`toast-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as {
            id: string;
            title: string;
            message: string;
            type: string;
          };

          // Only show toast for specific types
          const toastTypes = ['lead_created', 'lead_status_changed', 'lead_converted', 'lead_assigned'];
          if (!toastTypes.includes(notification.type)) return;

          const toast: ToastNotification = {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type as ToastNotification["type"],
          };

          setToasts(prev => [toast, ...prev].slice(0, 3));
          onNewLead?.();

          // Auto-dismiss after 8 seconds
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toast.id));
          }, 8000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, onNewLead]);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getToastStyles = (type: ToastNotification["type"]) => {
    switch (type) {
      case 'lead_converted':
        return {
          bg: "bg-emerald-500/20 border-emerald-500/30",
          iconBg: "bg-emerald-500/30",
          icon: <PartyPopper className="h-5 w-5 text-emerald-400" />,
          titleColor: "text-emerald-300",
        };
      case 'lead_status_changed':
        return {
          bg: "bg-amber-500/20 border-amber-500/30",
          iconBg: "bg-amber-500/30",
          icon: <TrendingUp className="h-5 w-5 text-amber-400" />,
          titleColor: "text-amber-300",
        };
      case 'lead_assigned':
        return {
          bg: "bg-blue-500/20 border-blue-500/30",
          iconBg: "bg-blue-500/30",
          icon: <Users className="h-5 w-5 text-blue-400" />,
          titleColor: "text-blue-300",
        };
      default:
        return {
          bg: "bg-primary/20 border-primary/30",
          iconBg: "bg-primary/30",
          icon: <UserPlus className="h-5 w-5 text-primary" />,
          titleColor: "text-foreground",
        };
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);
          
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`rounded-lg border p-4 shadow-lg backdrop-blur-sm ${styles.bg}`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-full p-2 ${styles.iconBg}`}>
                  {styles.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${styles.titleColor}`}>
                    {toast.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {toast.message}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => dismissToast(toast.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
