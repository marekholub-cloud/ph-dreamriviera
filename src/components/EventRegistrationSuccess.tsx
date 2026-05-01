import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle, 
  Calendar, 
  MapPin, 
  Star, 
  Download, 
  MessageCircle,
  ExternalLink,
  Sparkles,
  Gift
} from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { motion } from "framer-motion";

interface EventSlot {
  id: string;
  start_time: string;
  capacity: number;
  registered_count: number;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  maps_url: string | null;
  image_url: string | null;
  event_slots: EventSlot[];
}

interface EventRegistrationSuccessProps {
  event: Event;
  selectedSlotId: string;
  registrantName: string;
  onBackToEvents: () => void;
}

// Downloadable materials - can be customized per event in future
const downloadMaterials = [
  {
    title: "Katalog ELLINGTON",
    description: "Zaměření na design a kvalitu",
    url: "/brochures/soto-grande-ellington.pdf",
    color: "from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/30",
    iconColor: "text-amber-400"
  },
  {
    title: "Investiční analýza MARITIME CITY",
    description: "Zhodnocení v nové lokalitě",
    url: "/brochures/azizi-milan.pdf",
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30",
    iconColor: "text-blue-400"
  },
  {
    title: "Prestige One: Projekty 2026",
    description: "Technologický luxus",
    url: "/prezentace-produbai.pdf",
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30",
    iconColor: "text-purple-400"
  }
];

export const EventRegistrationSuccess = ({
  event,
  selectedSlotId,
  registrantName,
  onBackToEvents
}: EventRegistrationSuccessProps) => {
  const selectedSlot = event.event_slots.find(s => s.id === selectedSlotId);
  const slotDate = selectedSlot ? new Date(selectedSlot.start_time) : new Date();

  const formattedDate = format(slotDate, "EEEE d. MMMM yyyy", { locale: cs });
  const formattedTime = format(slotDate, "HH:mm", { locale: cs });

  const whatsappNumber = "+420777888999"; // Replace with actual number
  const whatsappMessage = encodeURIComponent(`Dobrý den, registroval/a jsem se na seminář ${event.title}. Mám dotaz...`);
  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\+/g, "")}?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-primary/5 rounded-full blur-2xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-primary/30"
            >
              <CheckCircle className="h-12 w-12 text-primary" />
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-4"
            >
              Gratulujeme, <span className="text-primary">{registrantName}</span>!
            </motion.h1>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl text-foreground/90 mb-4"
            >
              Vaše místo na semináři je rezervováno
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-muted-foreground text-lg"
            >
              Potvrzení s detaily jsme Vám právě odeslali na e-mail.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Reservation Details */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-secondary/30 overflow-hidden">
              <CardContent className="p-0">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 border-b border-primary/20">
                  <h3 className="text-xl font-serif font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Detaily Vaší rezervace
                  </h3>
                </div>

                {/* Details Grid */}
                <div className="p-6 space-y-6">
                  {/* Event Title */}
                  <div className="text-center pb-4 border-b border-border/50">
                    <h4 className="text-2xl font-serif font-bold text-primary mb-2">
                      {event.title}
                    </h4>
                  </div>

                  {/* Info Cards */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Date & Time */}
                    <div className="bg-secondary/30 rounded-xl p-5 border border-border/50">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-sm text-muted-foreground uppercase tracking-wider">Termín</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground capitalize">
                        {formattedDate}
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {formattedTime}
                      </p>
                    </div>

                    {/* Location */}
                    <div className="bg-secondary/30 rounded-xl p-5 border border-border/50">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-sm text-muted-foreground uppercase tracking-wider">Místo</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground">
                        {event.location_name || "Bude upřesněno"}
                      </p>
                      {event.maps_url && (
                        <a
                          href={event.maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm mt-2 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Zobrazit na mapě
                        </a>
                      )}
                    </div>
                  </div>

                  {/* VIP Access Badge */}
                  <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl p-5 border border-primary/30 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-primary fill-primary" />
                      <span className="text-lg font-semibold text-foreground">VIP Pozvánka</span>
                      <Star className="h-5 w-5 text-primary fill-primary" />
                    </div>
                    <p className="text-muted-foreground">
                      Zajištěno občerstvení a parkování
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Exclusive Materials Section */}
      <section className="py-12 bg-gradient-to-b from-background to-secondary/10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="max-w-3xl mx-auto"
          >
            {/* Section Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 mb-4">
                <Gift className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">Exkluzivní materiály</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-3">
                Než se potkáme
              </h3>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Neztrácejte čas a nahlédněte do aktuální nabídky projektů, které budeme na semináři detailně rozebírat. 
                Tyto jednotky jsou určeny pro prioritní prodej účastníkům akce.
              </p>
            </div>

            {/* Download Cards */}
            <div className="grid gap-4">
              {downloadMaterials.map((material, index) => (
                <motion.a
                  key={index}
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  className={`block bg-gradient-to-r ${material.color} rounded-xl p-5 border ${material.borderColor} hover:scale-[1.02] transition-all duration-300 group`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 bg-background/50 rounded-lg flex items-center justify-center ${material.iconColor}`}>
                        <Download className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {material.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {material.description}
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <Button variant="outline" size="sm" className="border-primary/30 hover:bg-primary/10">
                        <Download className="h-4 w-4 mr-2" />
                        Stáhnout
                      </Button>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer / Contact Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="bg-gradient-to-br from-secondary/50 to-card rounded-2xl p-8 border border-border/50">
              <MessageCircle className="h-10 w-10 text-primary mx-auto mb-4" />
              <h4 className="text-xl font-serif font-semibold text-foreground mb-2">
                Máte dotaz?
              </h4>
              <p className="text-muted-foreground mb-6">
                Kontaktujte svého osobního konzultanta přes WhatsApp
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  className="bg-[#25D366] hover:bg-[#20BD5A] text-white"
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Napsat na WhatsApp
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={onBackToEvents}
                  className="border-primary/30 hover:bg-primary/10"
                >
                  Zpět na události
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
