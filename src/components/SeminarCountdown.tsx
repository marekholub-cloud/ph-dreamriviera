import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const SeminarCountdown = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  const { data: nextEvent } = useQuery({
    queryKey: ['next-seminar'],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data: slots, error } = await supabase
        .from('event_slots')
        .select(`
          id,
          start_time,
          capacity,
          registered_count,
          event:events(
            id,
            title,
            location_name,
            is_active
          )
        `)
        .gt('start_time', now)
        .order('start_time', { ascending: true })
        .limit(1);

      if (error) throw error;
      
      const activeSlot = slots?.find(slot => 
        slot.event && 
        typeof slot.event === 'object' && 
        'is_active' in slot.event && 
        slot.event.is_active
      );
      
      return activeSlot || null;
    },
  });

  useEffect(() => {
    if (!nextEvent?.start_time) return;

    const calculateTimeLeft = () => {
      const difference = new Date(nextEvent.start_time).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [nextEvent?.start_time]);

  if (!nextEvent || !timeLeft) return null;

  const eventData = nextEvent.event && typeof nextEvent.event === 'object' ? nextEvent.event : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8"
    >
      <div className="flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 text-sm text-primary tracking-[0.15em] mb-4 uppercase font-medium">
          <Clock className="w-4 h-4" />
          Další seminář začíná za
        </div>

        {/* Countdown Timer */}
        <div className="flex gap-3 md:gap-6 mb-6">
          {[
            { value: timeLeft.days, label: 'Dní' },
            { value: timeLeft.hours, label: 'Hodin' },
            { value: timeLeft.minutes, label: 'Minut' },
            { value: timeLeft.seconds, label: 'Sekund' },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl flex items-center justify-center mb-2">
                <span className="text-2xl md:text-3xl font-bold text-foreground font-mono">
                  {String(item.value).padStart(2, '0')}
                </span>
              </div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Event Info */}
        {eventData && 'title' in eventData && (
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-lg md:text-xl font-serif font-semibold text-foreground">
              {eventData.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                {format(new Date(nextEvent.start_time), "d. MMMM yyyy, HH:mm", { locale: cs })}
              </span>
              {'location_name' in eventData && eventData.location_name && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                  {eventData.location_name}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
