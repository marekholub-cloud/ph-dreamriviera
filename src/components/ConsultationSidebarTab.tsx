import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { ConsultationRequestDialog } from "./ConsultationRequestDialog";

export const ConsultationSidebarTab = () => {
  const location = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Hide on embed pages
  if (location.pathname.startsWith('/embed')) {
    return null;
  }

  return (
    <>
      <motion.button
        onClick={() => setIsDialogOpen(true)}
        className="fixed right-0 z-[55] px-2 py-4 rounded-l-lg shadow-lg transition-colors text-white"
        style={{ 
          top: 'calc(50% - 45px)',
          background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)'
        }}
        initial={{ x: 0 }}
        whileHover={{ x: -4 }}
        title="Rezervace konzultace"
      >
        <div className="flex flex-col items-center gap-1">
          <CalendarDays className="h-5 w-5" />
          <span className="text-xs font-medium" style={{ writingMode: "vertical-rl" }}>
            Konzultace
          </span>
        </div>
      </motion.button>

      <ConsultationRequestDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
      />
    </>
  );
};
