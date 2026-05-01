import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";

export const WhatsAppSidebarTab = () => {
  const location = useLocation();

  // Hide on embed pages
  if (location.pathname.startsWith('/embed')) {
    return null;
  }

  const handleClick = () => {
    window.open("https://wa.me/420727822988", "_blank", "noopener,noreferrer");
  };

  return (
    <motion.button
      onClick={handleClick}
      className="fixed right-0 z-[55] px-2 py-4 rounded-l-lg shadow-lg transition-colors text-white"
      style={{ 
        top: 'calc(50% + 75px)',
        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)'
      }}
      initial={{ x: 0 }}
      whileHover={{ x: -4, background: 'linear-gradient(135deg, #20BD5A 0%, #0E7A6E 100%)' }}
      title="Kontaktujte nás přes WhatsApp"
    >
      <div className="flex flex-col items-center gap-1">
        <MessageCircle className="h-5 w-5" fill="currentColor" />
        <span className="text-xs font-medium writing-mode-vertical" style={{ writingMode: "vertical-rl" }}>
          WhatsApp
        </span>
      </div>
    </motion.button>
  );
};
