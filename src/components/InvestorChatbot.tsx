import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Sparkles, RotateCcw, Check, Mail, Phone, Undo2, Clock, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getAffiliateCode } from "@/utils/affiliateCode";

const SAVE_CONVO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-chatbot-conversation`;
const GET_CONVO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-chatbot-conversation`;
const FINALIZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finalize-chatbot-profile`;

// Sound notification for new messages
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // Audio not supported
  }
};

interface Message {
  role: "user" | "assistant";
  content: string;
  quickReplies?: QuickReply[];
}

interface QuickReply {
  label: string;
  value: string;
  multiSelect?: boolean;
}

interface InvestorData {
  investor_type?: string;
  experience?: string;
  goals?: string[];
  budget_amount?: string;
  budget_currency?: string;
  financing?: string;
  expected_yield?: string;
  horizon?: string;
  strategy?: string;
  property_type?: string;
  offplan_ready?: string;
  payment_plan_preference?: string;
  location_preference?: string;
  management_needed?: string;
  biggest_concern?: string;
  contact_whatsapp?: string;
  contact_email?: string;
  preferred_contact_method?: string;
  gdpr_consent?: boolean;
  handoff_to_human?: boolean;
  completed?: boolean;
}

interface InvestorChatbotProps {
  leadId?: string;
  onComplete?: (data: InvestorData) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/investor-chatbot`;

// Parse A/B/C/D options from message content
const parseABCDOptions = (content: string): QuickReply[] => {
  const replies: QuickReply[] = [];
  
  // Match patterns like "A) Option", "A. Option", "a) option", "(A) Option"
  const patterns = [
    /\n\s*([A-Da-d])\)\s*(.+?)(?=\n|$)/g,
    /\n\s*([A-Da-d])\.\s*(.+?)(?=\n|$)/g,
    /\n\s*\(([A-Da-d])\)\s*(.+?)(?=\n|$)/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const letter = match[1].toUpperCase();
      const optionText = match[2].trim();
      if (optionText && !replies.some(r => r.label.startsWith(letter))) {
        replies.push({ label: `${letter}) ${optionText}`, value: optionText });
      }
    }
    if (replies.length > 0) break;
  }
  
  return replies;
};

// Parse numbered options like 1. 2. 3.
const parseNumberedOptions = (content: string): QuickReply[] => {
  const replies: QuickReply[] = [];
  const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"];
  
  // Match patterns like "1. Option", "1) Option"
  const patterns = [
    /\n\s*(\d)\.\s*(.+?)(?=\n|$)/g,
    /\n\s*(\d)\)\s*(.+?)(?=\n|$)/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const num = parseInt(match[1], 10);
      const optionText = match[2].trim();
      if (optionText && num >= 1 && num <= 6 && !replies.some(r => r.value === optionText)) {
        replies.push({ label: `${emojis[num - 1] || num} ${optionText}`, value: optionText });
      }
    }
    if (replies.length > 0) break;
  }
  
  return replies;
};

// Multi-select quick replies configuration
const getQuickRepliesConfig = (content: string): { replies: QuickReply[]; multiSelect: boolean } => {
  const lowerContent = content.toLowerCase();
  
  // Start - speed selection (single select)
  if (lowerContent.includes("rychlou verzi") || lowerContent.includes("rychlá / detailní") || lowerContent.includes("rychlá verze")) {
    return {
      multiSelect: false,
      replies: [
        { label: "⚡ Rychlá verze (60s)", value: "Rychlá" },
        { label: "📋 Detailní verze (3-4 min)", value: "Detailní" },
      ],
    };
  }
  
  // Generic Yes/No detection - check for questions expecting Ano/Ne
  const yesNoPatterns = [
    /\bano\s*[\/,]\s*ne\b/i,
    /\bano\s+nebo\s+ne\b/i,
    /\bsouhlasíš\b/i,
    /\bmáš zájem\b/i,
    /\bchceš\s+.{0,30}\?/i,
    /\bpotřebuješ\s+.{0,30}\?/i,
    /\bzajímá\s+tě\b/i,
    /\bbudeš\s+.{0,30}\?/i,
    /\bchcete\b/i,
    /\bpotřebujete\b/i,
  ];

  const isYesNoQuestion = yesNoPatterns.some((p) => p.test(content));

  // Summary / handoff confirmation (single select)
  // (Prevents false-positive buttons from summary text that mentions previous answers)
  if (
    /můžeme\s+data\s+předat/i.test(content) ||
    /můžu\s+data\s+předat/i.test(content) ||
    /předat\s+(?:to\s+)?koleg/i.test(content)
  ) {
    return {
      multiSelect: false,
      replies: [
        { label: "✅ Předat kolegům", value: "Předat kolegům" },
        { label: "✍️ Ještě upřesním", value: "Ještě upřesním" },
      ],
    };
  }

  // Financing (single select)
  const mentionsFinancingOptions =
    lowerContent.includes("hotovost") &&
    lowerContent.includes("kombinace") &&
    lowerContent.includes("financ");

  const looksLikeFinancingQuestion =
    mentionsFinancingOptions &&
    (/(jak|vyber|zvol|prefer|zdroj|způsob|financovat)/i.test(content) || /\?\s*$/.test(content));

  if (looksLikeFinancingQuestion) {
    return {
      multiSelect: false,
      replies: [
        { label: "💵 Hotovost", value: "Hotovost" },
        { label: "🔄 Kombinace", value: "Kombinace" },
        { label: "🏦 Financování", value: "Financování" },
      ],
    };
  }
  
  // Timeline (single select)
  if (lowerContent.includes("kdy chceš") || lowerContent.includes("časový horizont") || lowerContent.includes("kdy plánuješ") || 
      (lowerContent.includes("měsíc") && (lowerContent.includes("0-3") || lowerContent.includes("3-6") || lowerContent.includes("6-12")))) {
    return {
      multiSelect: false,
      replies: [
        { label: "🚀 0-3 měsíce", value: "0-3 měsíce" },
        { label: "📅 3-6 měsíců", value: "3-6 měsíců" },
        { label: "📆 6-12 měsíců", value: "6-12 měsíců" },
        { label: "🗓️ 12+ měsíců", value: "12+ měsíců" },
      ],
    };
  }
  
  // Off-plan vs Ready (single select)
  if (lowerContent.includes("off-plan") && lowerContent.includes("ready")) {
    return {
      multiSelect: false,
      replies: [
        { label: "🏗️ Off-plan", value: "Off-plan" },
        { label: "✅ Ready", value: "Ready" },
        { label: "🤔 Oboje / Nevím", value: "Oboje" },
      ],
    };
  }
  
  // Risk tolerance (single select)
  if (lowerContent.includes("tolerance rizika") || lowerContent.includes("toleranci rizika") || lowerContent.includes("přístup k riziku")) {
    return {
      multiSelect: false,
      replies: [
        { label: "🛡️ Konzervativní", value: "Konzervativní (raději jistota)" },
        { label: "⚖️ Vyvážená", value: "Vyvážená" },
        { label: "🚀 Dynamická", value: "Dynamická (maximální zhodnocení)" },
      ],
    };
  }
  
  // Property type (multi-select)
  if (lowerContent.includes("jaký typ") || lowerContent.includes("typ nemovitosti") || lowerContent.includes("typ jednotky")) {
    return {
      multiSelect: true,
      replies: [
        { label: "🏢 Studio / 1BR", value: "Studio / 1BR" },
        { label: "🏠 2BR / 3BR+", value: "2BR / 3BR+" },
        { label: "🏡 Vila / townhouse", value: "Vila / townhouse" },
        { label: "🏪 Komerční", value: "Komerční" },
      ],
    };
  }
  
  // Location preference (multi-select)
  if (lowerContent.includes("lokalit") || lowerContent.includes("marina") || lowerContent.includes("downtown") || lowerContent.includes("business bay") || lowerContent.includes("u pláže") || lowerContent.includes("u metra")) {
    return {
      multiSelect: true,
      replies: [
        { label: "🌊 Marina", value: "Marina" },
        { label: "🏙️ Downtown", value: "Downtown" },
        { label: "💼 Business Bay", value: "Business Bay" },
        { label: "🏠 JVC / JVT", value: "JVC / JVT" },
        { label: "🏖️ U pláže", value: "U pláže" },
        { label: "🚇 U metra", value: "U metra" },
        { label: "🤷 Je mi to jedno", value: "Je mi to jedno" },
      ],
    };
  }
  
  // Contact preference (single select)
  if (lowerContent.includes("kam ti to mám doručit") || lowerContent.includes("necháš mi kontakt") || lowerContent.includes("whatsapp") && lowerContent.includes("e-mail")) {
    return {
      multiSelect: false,
      replies: [
        { label: "📱 WhatsApp", value: "WhatsApp" },
        { label: "📧 E-mail", value: "E-mail" },
        { label: "📱📧 Oboje", value: "Oboje" },
      ],
    };
  }
  
  // Preferred contact method after getting contact info (single select)
  if (lowerContent.includes("jak chceš být kontaktován") || lowerContent.includes("jakým způsobem") && lowerContent.includes("kontaktovat")) {
    return {
      multiSelect: false,
      replies: [
        { label: "📧 E-mailem", value: "E-mailem" },
        { label: "📱 WhatsApp zprávou", value: "WhatsApp zprávou" },
        { label: "📞 Telefonicky", value: "Telefonicky" },
      ],
    };
  }
  
  // GDPR consent (single select)
  if (lowerContent.includes("souhlas") && (lowerContent.includes("kontaktovat") || lowerContent.includes("zpracování"))) {
    return {
      multiSelect: false,
      replies: [
        { label: "✅ Ano, souhlasím", value: "Ano" },
        { label: "❌ Ne", value: "Ne" },
      ],
    };
  }
  
  // Investor type (single select)
  if (lowerContent.includes("jsi spíš") && lowerContent.includes("investor")) {
    return {
      multiSelect: false,
      replies: [
        { label: "💰 Investor (výnos)", value: "Investor (výnos)" },
        { label: "📈 Investor (flip)", value: "Investor (flip / růst)" },
        { label: "🏠 Budoucí rezident", value: "Budoucí rezident (bydlení)" },
        { label: "👀 Jen se rozhlížím", value: "Jen se rozhlížím" },
      ],
    };
  }
  
  // Experience (single select)
  if (lowerContent.includes("máš už investice") || lowerContent.includes("zkušenost") || lowerContent.includes("máš již zkušenosti")) {
    return {
      multiSelect: false,
      replies: [
        { label: "🇨🇿 Ano v ČR", value: "Ano v ČR" },
        { label: "🌍 Ano v zahraničí", value: "Ano v zahraničí" },
        { label: "🆕 Ne – první investice", value: "Ne – první investice" },
      ],
    };
  }
  
  // Goals (multi-select)
  if (lowerContent.includes("co od investice očekáváš") || lowerContent.includes("cíle") || lowerContent.includes("co je pro tebe prioritou")) {
    return {
      multiSelect: true,
      replies: [
        { label: "📊 Stabilní pronájem", value: "Stabilní pronájem" },
        { label: "🏠 Airbnb / krátkodobý", value: "Airbnb / krátkodobý pronájem" },
        { label: "📈 Růst hodnoty", value: "Růst hodnoty" },
        { label: "🛡️ Ochrana kapitálu", value: "Ochrana kapitálu" },
        { label: "🏖️ Vlastní užívání", value: "Vlastní užívání" },
      ],
    };
  }
  
  // Management (single select)
  if (lowerContent.includes("správu") && lowerContent.includes("na klíč")) {
    return {
      multiSelect: false,
      replies: [
        { label: "✅ Ano", value: "Ano" },
        { label: "❌ Ne", value: "Ne" },
        { label: "🔄 Částečně", value: "Částečně" },
      ],
    };
  }
  
  // Biggest concern (multi-select)
  if (lowerContent.includes("největší obava") || lowerContent.includes("co je pro tebe největší") || lowerContent.includes("jaké máš obavy")) {
    return {
      multiSelect: true,
      replies: [
        { label: "🔒 Bezpečnost transakce", value: "Bezpečnost transakce" },
        { label: "🏗️ Kvalita developera", value: "Kvalita developera" },
        { label: "📊 Reálný výnos", value: "Reálný výnos" },
        { label: "🌍 Správa na dálku", value: "Správa a starosti na dálku" },
        { label: "💱 Kurz měny", value: "Kurz měny" },
      ],
    };
  }
  
  // Try to parse A/B/C/D options from the content
  const abcdOptions = parseABCDOptions(content);
  if (abcdOptions.length >= 2) {
    return { replies: abcdOptions, multiSelect: false };
  }
  
  // Try to parse numbered options
  const numberedOptions = parseNumberedOptions(content);
  if (numberedOptions.length >= 2) {
    return { replies: numberedOptions, multiSelect: false };
  }
  
  // Generic Yes/No for questions that expect it
  if (isYesNoQuestion) {
    return {
      multiSelect: false,
      replies: [
        { label: "✅ Ano", value: "Ano" },
        { label: "❌ Ne", value: "Ne" },
      ],
    };
  }
  
  return { replies: [], multiSelect: false };
};

// Key for localStorage to track "don't open today"
const DISABLED_TODAY_KEY = "chatbot_disabled_today";

interface ChatbotSettings {
  auto_open_enabled: boolean;
  auto_open_delay_seconds: number;
  reminder_enabled: boolean;
  reminder_delay_seconds: number;
}

export const InvestorChatbot = ({ leadId, onComplete }: InvestorChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [investorData, setInvestorData] = useState<InvestorData | null>(null);
  const [branch, setBranch] = useState<"quick" | "detailed" | null>(null);
  const [selectedReplies, setSelectedReplies] = useState<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState(() => {
    const storedId = localStorage.getItem("chatbot_session_id");
    if (storedId) return storedId;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("chatbot_session_id", newId);
    return newId;
  });
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [userClosedAt, setUserClosedAt] = useState<number | null>(null);
  const [showLoginCTA, setShowLoginCTA] = useState(false);
  const [reminderOpenCount, setReminderOpenCount] = useState(0);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [chatbotSettings, setChatbotSettings] = useState<ChatbotSettings>({
    auto_open_enabled: false,
    auto_open_delay_seconds: 20,
    reminder_enabled: false,
    reminder_delay_seconds: 600,
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [disabledForToday, setDisabledForToday] = useState(() => {
    const stored = localStorage.getItem(DISABLED_TODAY_KEY);
    if (stored) {
      const storedDate = new Date(stored);
      const today = new Date();
      // Check if stored date is today
      if (storedDate.toDateString() === today.toDateString()) {
        return true;
      } else {
        localStorage.removeItem(DISABLED_TODAY_KEY);
      }
    }
    return false;
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const initStartedRef = useRef(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userRoles, user } = useAuth();
  const isAdmin = userRoles.includes("admin");

  // Load chatbot settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("chatbot_settings")
          .select("setting_key, setting_value");

        if (error) {
          console.error("Error loading chatbot settings:", error);
          setSettingsLoaded(true);
          return;
        }

        if (data) {
          const newSettings: Partial<ChatbotSettings> = {};
          data.forEach((item) => {
            const value = item.setting_value;
            switch (item.setting_key) {
              case "auto_open_enabled":
                newSettings.auto_open_enabled = value === true || value === "true";
                break;
              case "auto_open_delay_seconds":
                newSettings.auto_open_delay_seconds = typeof value === "number" ? value : parseInt(String(value), 10);
                break;
              case "reminder_enabled":
                newSettings.reminder_enabled = value === true || value === "true";
                break;
              case "reminder_delay_seconds":
                newSettings.reminder_delay_seconds = typeof value === "number" ? value : parseInt(String(value), 10);
                break;
            }
          });
          setChatbotSettings((prev) => ({ ...prev, ...newSettings }));
        }
      } catch (error) {
        console.error("Error loading chatbot settings:", error);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  const showDebugError = (status: number, body: string, context: string) => {
    if (!isAdmin) return;
    toast({
      title: `🔧 Debug: ${context}`,
      description: `HTTP ${status}: ${body.slice(0, 300)}${body.length > 300 ? "..." : ""}`,
      variant: "destructive",
      duration: 15000,
    });
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-open chatbot based on settings from database
  useEffect(() => {
    // Wait for settings to load
    if (!settingsLoaded) return;
    
    // If auto-open is disabled in settings, don't auto-open
    if (!chatbotSettings.auto_open_enabled) return;
    
    // If disabled for today by user, don't auto-open
    if (disabledForToday) return;
    
    // If user already closed the chatbot, set up reminder timer (if reminders enabled)
    if (userClosedAt && !isOpen && chatbotSettings.reminder_enabled) {
      const timeSinceClosed = Date.now() - userClosedAt;
      const reminderDelayMs = chatbotSettings.reminder_delay_seconds * 1000;
      const remainingTime = Math.max(0, reminderDelayMs - timeSinceClosed);
      
      const reminderTimer = setTimeout(() => {
        if (!isOpen) {
          setIsOpen(true);
          setReminderOpenCount(prev => prev + 1);
          setShowReminderOptions(true);
          setUserClosedAt(null); // Reset so next close triggers another reminder cycle
        }
      }, remainingTime);
      
      return () => clearTimeout(reminderTimer);
    }
    
    // First auto-open after configured delay
    if (!hasAutoOpened && !isOpen && !userClosedAt) {
      const autoOpenDelayMs = chatbotSettings.auto_open_delay_seconds * 1000;
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasAutoOpened(true);
      }, autoOpenDelayMs);
      return () => clearTimeout(timer);
    }
  }, [hasAutoOpened, isOpen, userClosedAt, disabledForToday, settingsLoaded, chatbotSettings]);

  // Load existing conversation from backend when opened
  useEffect(() => {
    if (isOpen && messages.length === 0 && !isLoading && !initStartedRef.current) {
      const timer = setTimeout(() => {
        loadOrInitConversation();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const getFunctionAuthHeaders = useCallback(async () => {
    const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token || publishableKey;

    if (!publishableKey || !token) {
      throw new Error("Chybí konfigurace pro volání backend funkcí.");
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: publishableKey,
    } as const;
  }, []);

  // Load existing conversation or start new
  const loadOrInitConversation = async () => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;
    setIsLoading(true);

    try {
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(GET_CONVO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: publishableKey },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.found && data.messages && data.messages.length > 0) {
          // Restore conversation
          const restoredMessages: Message[] = data.messages.map((m: { role: string; content: string }) => {
            const config = getQuickRepliesConfig(m.content);
            return {
              role: m.role as "user" | "assistant",
              content: m.content,
              quickReplies: m.role === "assistant" ? config.replies : undefined,
            };
          });
          setMessages(restoredMessages);
          if (data.branch) setBranch(data.branch);
          if (data.investorData) setInvestorData(data.investorData);
          if (data.completed) setShowLoginCTA(true);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error("Error loading conversation:", e);
    }

    // No existing conversation - start new
    await initiateConversation();
  };

  const initiateConversation = async () => {
    let assistantContent = "";

    try {
      const headers = await getFunctionAuthHeaders();

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [{ role: "user", content: "Ahoj" }],
          leadId,
          sessionId,
          branch: branch || null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        showDebugError(response.status, errorText, "initiateConversation");
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              const cleanedContent = cleanMessageContent(assistantContent);
              const config = getQuickRepliesConfig(cleanedContent);
              setMessages([{ role: "assistant", content: cleanedContent, quickReplies: config.replies }]);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      playNotificationSound();
      await saveConversationViaBackend([{ role: "assistant" as const, content: cleanMessageContent(assistantContent) }]);
    } catch (error) {
      console.error("Chat init error:", error);
      const config = getQuickRepliesConfig("rychlou verzi");
      setMessages([
        {
          role: "assistant",
          content: "Ahoj! Jsem asistent go2dubai.online. Pomůžu ti během pár minut sestavit investiční profil a doporučit vhodné projekty v Dubaji. Chceš rychlou verzi (60s), nebo detailní (3-4 min)?",
          quickReplies: config.replies,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const parseInvestorData = (content: string): InvestorData | null => {
    const dataMatch = content.match(/###INVESTOR_DATA###([\s\S]*?)###END_DATA###/);
    if (dataMatch) {
      try {
        return JSON.parse(dataMatch[1].trim());
      } catch (e) {
        console.error("Failed to parse investor data:", e);
      }
    }
    return null;
  };

  const cleanMessageContent = (content: string): string => {
    return content.replace(/###INVESTOR_DATA###[\s\S]*?###END_DATA###/g, "").trim();
  };

  // Detect branch from user message
  const detectBranch = (messageText: string): "quick" | "detailed" | null => {
    const lower = messageText.toLowerCase();
    if (lower.includes("rychlá") || lower === "rychlá" || lower.includes("rychlou")) return "quick";
    if (lower.includes("detailní") || lower === "detailní" || lower.includes("detail")) return "detailed";
    return null;
  };

  const saveConversationViaBackend = async (msgs: Message[], data?: InvestorData, currentBranch?: string | null) => {
    try {
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const apiMessages = msgs.map((m) => ({ role: m.role, content: m.content }));

      await fetch(SAVE_CONVO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: publishableKey },
        body: JSON.stringify({
          sessionId,
          leadId: leadId || null,
          messages: apiMessages,
          investorData: data || null,
          branch: currentBranch || branch || null,
        }),
      });
    } catch (error) {
      console.error("Error saving conversation via backend:", error);
    }
  };

  const finalizeProfileAfterLogin = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      // Get affiliate code from localStorage/cookie
      const affiliateCode = getAffiliateCode();

      const response = await fetch(FINALIZE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ 
          sessionId,
          affiliateCode: affiliateCode || undefined
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("Finalize error:", response.status, errorText);
        return;
      }

      toast({ title: "Profil uložen 🎉", description: "Přejděte na doporučené projekty." });
      localStorage.removeItem("chatbot_session_id");
      navigate("/doporucene-projekty");
      onComplete?.(investorData || ({} as InvestorData));
    } catch (error) {
      console.error("Error finalizing profile:", error);
    }
  };

  useEffect(() => {
    if (!user) return;
    const storedSession = localStorage.getItem("chatbot_session_id");
    const pendingFinalize = localStorage.getItem("chatbot_pending_finalize");
    if (storedSession && pendingFinalize === "true") {
      localStorage.removeItem("chatbot_pending_finalize");
      finalizeProfileAfterLogin();
    }
  }, [user]);

  const handleLoginCTA = () => {
    localStorage.setItem("chatbot_pending_finalize", "true");
    navigate(`/auth?next=${encodeURIComponent(window.location.pathname)}`);
  };

  // Reset chatbot
  const handleReset = () => {
    localStorage.removeItem("chatbot_session_id");
    localStorage.removeItem("chatbot_pending_finalize");
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("chatbot_session_id", newId);
    setSessionId(newId);
    setMessages([]);
    setInvestorData(null);
    setBranch(null);
    setShowLoginCTA(false);
    setSelectedReplies(new Set());
    initStartedRef.current = false;
    
    // Restart conversation
    setTimeout(() => {
      loadOrInitConversation();
    }, 100);
  };

  // Go back one step - remove last user message and assistant response
  const handleGoBack = async () => {
    if (messages.length < 2) return;
    
    // Find the last user message index
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }
    
    if (lastUserIndex <= 0) return; // Can't go back if no user message or only one exchange
    
    // Remove messages from last user message onwards
    const newMessages = messages.slice(0, lastUserIndex);
    setMessages(newMessages);
    setSelectedReplies(new Set());
    setShowLoginCTA(false);
    
    // Save the updated conversation
    await saveConversationViaBackend(
      newMessages.map((m) => ({ role: m.role, content: m.content })),
      investorData || undefined,
      branch
    );
    
    toast({
      title: "Krok zpět",
      description: "Můžete změnit svou předchozí odpověď.",
    });
  };

  // Check if we can go back (need at least 2 messages with a user message)
  const canGoBack = messages.length >= 2 && messages.some((m, i) => m.role === "user" && i > 0);

  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isLoading) return;

      // Detect branch if not set
      const detectedBranch = detectBranch(messageText);
      if (detectedBranch && !branch) {
        setBranch(detectedBranch);
      }

      const userMsg: Message = { role: "user", content: messageText };
      const newMessages = [...messages, userMsg];

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setSelectedReplies(new Set());
      setIsLoading(true);

      let assistantContent = "";

      try {
        const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));
        const headers = await getFunctionAuthHeaders();

        const response = await fetch(CHAT_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: apiMessages,
            leadId,
            sessionId,
            branch: detectedBranch || branch || null,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          showDebugError(response.status, errorText, "sendMessage");
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                const cleanedContent = cleanMessageContent(assistantContent);
                const config = getQuickRepliesConfig(cleanedContent);

                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) =>
                      i === prev.length - 1 ? { ...m, content: cleanedContent, quickReplies: config.replies } : m
                    );
                  }
                  return [...prev, { role: "assistant", content: cleanedContent, quickReplies: config.replies }];
                });
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        playNotificationSound();

        const data = parseInvestorData(assistantContent);
        if (data) {
          setInvestorData(data);
          if (data.completed || data.handoff_to_human) {
            if (user) {
              await finalizeProfileAfterLogin();
            } else {
              setShowLoginCTA(true);
            }
          }
        }

        const finalMessages = [...newMessages, { role: "assistant" as const, content: cleanMessageContent(assistantContent) }];
        await saveConversationViaBackend(
          finalMessages.map((m) => ({ role: m.role, content: m.content })),
          data || undefined,
          detectedBranch || branch
        );
      } catch (error) {
        console.error("Chat error:", error);
        toast({ title: "Chyba", description: "Nepodařilo se odeslat zprávu.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, leadId, sessionId, branch, user]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Toggle selection for multi-select with location validation
  const toggleReplySelection = (value: string, isLocationQuestion: boolean) => {
    setSelectedReplies((prev) => {
      const newSet = new Set(prev);
      
      // Location validation: "Je mi to jedno" is exclusive
      if (isLocationQuestion) {
        if (value === "Je mi to jedno") {
          // Selecting "Je mi to jedno" clears all other selections
          return new Set(["Je mi to jedno"]);
        } else {
          // Selecting a specific location removes "Je mi to jedno"
          newSet.delete("Je mi to jedno");
        }
      }

      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return newSet;
    });
  };

  // Send selected replies
  const sendSelectedReplies = () => {
    if (selectedReplies.size === 0) return;
    const combined = Array.from(selectedReplies).join(", ");
    sendMessage(combined);
  };

  // Get current quick reply config for last message
  const lastMessage = messages[messages.length - 1];
  const rawQuickReplyConfig =
    lastMessage?.role === "assistant" ? getQuickRepliesConfig(lastMessage.content) : { replies: [], multiSelect: false };

  // If branch is already chosen, never show the initial "Rychlá/Detailní" buttons again
  const quickReplyConfig =
    branch && rawQuickReplyConfig.replies.some((r) => r.value === "Rychlá" || r.value === "Detailní")
      ? { replies: [], multiSelect: false }
      : rawQuickReplyConfig;

  // Check if current question is about location
  const isLocationQuestion = quickReplyConfig.replies.some((r) => r.value === "Je mi to jedno" || r.value === "Marina");

  const handleQuickReply = (value: string, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      toggleReplySelection(value, isLocationQuestion);
    } else {
      sendMessage(value);
    }
  };

  const handleWhatsAppTransfer = () => {
    const phone = "+420774441281";
    const text = encodeURIComponent(
      `Ahoj, přicházím z chatbota na webu. Mám zájem o investici v Dubaji.\n\nMůj profil:\n${JSON.stringify(investorData, null, 2)}`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  // Handle close with timestamp tracking for reminder
  const handleClose = () => {
    setIsOpen(false);
    setShowReminderOptions(false);
    setUserClosedAt(Date.now());
  };

  // Handle "Remind later" - close and set reminder for 600s
  const handleRemindLater = () => {
    setIsOpen(false);
    setShowReminderOptions(false);
    setUserClosedAt(Date.now());
  };

  // Handle "Don't open today" - disable reminders for today
  const handleDisableToday = () => {
    setIsOpen(false);
    setShowReminderOptions(false);
    setDisabledForToday(true);
    localStorage.setItem(DISABLED_TODAY_KEY, new Date().toISOString());
  };

  return (
    <>
      {/* Tab trigger - positioned below ShareSidebar with 10px gap */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 z-[55] px-2 py-4 rounded-l-lg shadow-lg transition-colors text-white"
        style={{ 
          top: 'calc(50% - 46px)',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #a855f7 100%)'
        }}
        initial={{ x: 0 }}
        animate={{ x: isOpen ? 100 : 0 }}
        whileHover={{ x: -4, background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #9333ea 100%)' }}
      >
        <div className="flex flex-col items-center gap-1">
          <Bot className="h-5 w-5" />
          <span className="text-xs font-medium writing-mode-vertical" style={{ writingMode: "vertical-rl" }}>
            DR asistent
          </span>
        </div>
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)]"
          >
            <Card className="overflow-hidden shadow-2xl shadow-black/50 border border-primary/20 bg-card/95 backdrop-blur-xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary via-gold to-primary p-4 flex items-center justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(255,255,255,0.15),transparent_50%)]" />
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
                    <Bot className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary-foreground text-lg">Investiční asistent</h3>
                    <p className="text-sm text-primary-foreground/80 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Online
                      {branch && <span className="ml-2 text-xs opacity-70">({branch === "quick" ? "rychlá" : "detailní"})</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 relative z-10">
                  {canGoBack && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleGoBack}
                      title="Vrátit se o krok zpět"
                      className="text-primary-foreground hover:bg-white/20 transition-colors"
                      disabled={isLoading}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReset}
                    title="Začít znovu"
                    className="text-primary-foreground hover:bg-white/20 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="text-primary-foreground hover:bg-white/20 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="h-[420px] p-4 bg-gradient-to-b from-card to-background" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <div className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                            msg.role === "user"
                              ? "bg-gradient-to-br from-primary to-gold-dark"
                              : "bg-gradient-to-br from-secondary to-muted border border-border"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <User className="w-4 h-4 text-primary-foreground" />
                          ) : (
                            <Bot className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-lg ${
                            msg.role === "user"
                              ? "bg-gradient-to-br from-primary to-gold-dark text-primary-foreground rounded-tr-sm"
                              : "bg-secondary/80 backdrop-blur-sm text-foreground border border-border/50 rounded-tl-sm"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      </div>

                      {/* Quick replies with multi-select support */}
                      {msg.role === "assistant" && i === messages.length - 1 && !isLoading && quickReplyConfig.replies.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="mt-4 ml-12"
                        >
                          <div className="flex flex-wrap gap-2">
                            {quickReplyConfig.replies.map((reply, j) => (
                              <Button
                                key={j}
                                variant={selectedReplies.has(reply.value) ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleQuickReply(reply.value, quickReplyConfig.multiSelect)}
                                className={`text-xs h-9 px-4 transition-all duration-200 rounded-full ${
                                  selectedReplies.has(reply.value)
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-secondary/50 border-primary/30 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
                                }`}
                              >
                                {quickReplyConfig.multiSelect && (
                                  <Checkbox
                                    checked={selectedReplies.has(reply.value)}
                                    className="mr-2 h-3 w-3 pointer-events-none"
                                  />
                                )}
                                {reply.label}
                              </Button>
                            ))}
                          </div>

                          {/* Send button for multi-select */}
                          {quickReplyConfig.multiSelect && selectedReplies.size > 0 && (
                            <Button
                              onClick={sendSelectedReplies}
                              size="sm"
                              className="mt-3 bg-gradient-to-r from-primary to-gold-dark text-primary-foreground"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Potvrdit výběr ({selectedReplies.size})
                            </Button>
                          )}

                          {quickReplyConfig.multiSelect && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Vyber více možností nebo napiš vlastní odpověď níže
                            </p>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  ))}

                  {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary to-muted border border-border flex items-center justify-center shadow-md">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-secondary/80 backdrop-blur-sm rounded-2xl rounded-tl-sm px-4 py-3 border border-border/50 shadow-lg">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Completion CTA - contact method selection */}
                  {(showLoginCTA || investorData?.completed) && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-4 space-y-4">
                      <div className="bg-gradient-to-br from-primary/10 to-gold/10 border border-primary/30 rounded-xl p-5 text-center">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                          <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-base font-semibold text-foreground mb-2">Váš investiční profil je hotový! 🎉</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Jak chcete, aby vás náš specialista kontaktoval?
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Button
                          onClick={() => sendMessage("Kontaktujte mě e-mailem")}
                          variant="outline"
                          className="w-full justify-start gap-3 h-12 hover:bg-primary/10 hover:border-primary"
                        >
                          <Mail className="w-5 h-5 text-primary" />
                          <div className="text-left">
                            <span className="block text-sm font-medium">E-mailem</span>
                          </div>
                        </Button>
                        
                        <Button
                          onClick={() => sendMessage("Kontaktujte mě přes WhatsApp")}
                          variant="outline"
                          className="w-full justify-start gap-3 h-12 hover:bg-green-500/10 hover:border-green-500"
                        >
                          <MessageCircle className="w-5 h-5 text-green-500" />
                          <div className="text-left">
                            <span className="block text-sm font-medium">WhatsApp</span>
                          </div>
                        </Button>

                        <Button
                          onClick={() => sendMessage("Kontaktujte mě telefonicky")}
                          variant="outline"
                          className="w-full justify-start gap-3 h-12 hover:bg-blue-500/10 hover:border-blue-500"
                        >
                          <Phone className="w-5 h-5 text-blue-500" />
                          <div className="text-left">
                            <span className="block text-sm font-medium">Telefonicky</span>
                          </div>
                        </Button>
                      </div>

                      <div className="bg-secondary/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          ⏱️ <span className="font-medium">Do 24 hodin</span> se vám ozve náš specialista.<br />
                          📋 <span className="font-medium">Do 48 hodin</span> připravíme investiční nabídky na míru.
                        </p>
                      </div>

                      {!user && (
                        <Button
                          onClick={handleLoginCTA}
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-muted-foreground hover:text-foreground"
                        >
                          Přihlásit se pro uložení profilu
                        </Button>
                      )}
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Reminder Options Banner - shown when chatbot auto-opens after reminder */}
              {showReminderOptions && (
                <div className="px-4 py-3 border-t border-border/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                  <p className="text-xs text-muted-foreground mb-2 text-center">
                    Vrátili jsme se! Potřebujete ještě chvilku?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRemindLater}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8 gap-1.5 hover:bg-amber-500/20 hover:border-amber-500/50"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Připomenout později
                    </Button>
                    <Button
                      onClick={handleDisableToday}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8 gap-1.5 hover:bg-red-500/20 hover:border-red-500/50"
                    >
                      <BellOff className="w-3.5 h-3.5" />
                      Dnes již neotvírat
                    </Button>
                  </div>
                </div>
              )}

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-border/50 bg-card/80 backdrop-blur-sm">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Napište zprávu nebo vlastní odpověď..."
                    disabled={isLoading}
                    className="flex-1 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input.trim()}
                    className="bg-gradient-to-br from-primary to-gold-dark hover:from-gold to-primary shadow-lg shadow-primary/20 transition-all duration-300"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/50 text-center mt-2">Powered by go2dubai.online</p>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
