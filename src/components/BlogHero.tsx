import { motion } from "framer-motion";
import { Clock, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

interface BlogHeroProps {
  title: string;
  subtitle: string;
  badge: string;
  backgroundImage: string;
  readingTime: number; // in minutes
  articleContent?: string; // Text content for TTS
}

export const BlogHero = ({ 
  title, 
  subtitle, 
  badge, 
  backgroundImage, 
  readingTime,
  articleContent 
}: BlogHeroProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Check if Web Speech API is supported
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
    }

    return () => {
      // Cleanup on unmount
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = () => {
    if (!articleContent || !isSupported) return;

    if (isSpeaking && !isPaused) {
      // Pause
      window.speechSynthesis.pause();
      setIsPaused(true);
      return;
    }

    if (isPaused) {
      // Resume
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    // Start speaking
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(articleContent);
    utterance.lang = 'cs-CZ';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    // Try to find Czech voice
    const voices = window.speechSynthesis.getVoices();
    const czechVoice = voices.find(voice => voice.lang.startsWith('cs'));
    if (czechVoice) {
      utterance.voice = czechVoice;
    }

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  return (
    <section className="relative pb-20 overflow-hidden min-h-[70vh] flex items-center -mt-[72px] pt-[96px]">
      <div className="absolute inset-0">
        <img 
          src={backgroundImage} 
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <span className="inline-block px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium mb-6">
            {badge}
          </span>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            {title}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {subtitle}
          </p>

          {/* Reading time badge and TTS controls */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {/* Animated reading time badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="relative"
            >
              <motion.div
                animate={{ 
                  boxShadow: [
                    "0 0 0 0 rgba(var(--primary-rgb), 0.4)",
                    "0 0 0 10px rgba(var(--primary-rgb), 0)",
                    "0 0 0 0 rgba(var(--primary-rgb), 0)"
                  ]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  repeatDelay: 1
                }}
                className="flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-sm border border-border rounded-full"
              >
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground font-medium">
                  {readingTime} min čtení
                </span>
              </motion.div>
            </motion.div>

            {/* TTS Controls */}
            {isSupported && articleContent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="flex items-center gap-2"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSpeak}
                  className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border-border hover:bg-primary/20 hover:border-primary/50"
                >
                  {isSpeaking && !isPaused ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span className="hidden sm:inline">Pozastavit</span>
                    </>
                  ) : isPaused ? (
                    <>
                      <Play className="w-4 h-4" />
                      <span className="hidden sm:inline">Pokračovat</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Přečíst článek</span>
                    </>
                  )}
                </Button>

                {isSpeaking && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStop}
                    className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border-border hover:bg-destructive/20 hover:border-destructive/50"
                  >
                    <VolumeX className="w-4 h-4" />
                    <span className="hidden sm:inline">Zastavit</span>
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
