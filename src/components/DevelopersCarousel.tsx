import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface Developer {
  id: string;
  name: string;
  logo_url: string | null;
}

export const DevelopersCarousel = () => {
  const { data: developers = [], isLoading } = useQuery({
    queryKey: ["developers-logos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developers")
        .select("id, name, logo_url")
        .not("logo_url", "is", null)
        .order("name");
      
      if (error) throw error;
      return data as Developer[];
    },
  });

  if (isLoading || developers.length === 0) return null;

  // Double the array for seamless infinite scroll
  const duplicatedDevelopers = [...developers, ...developers];

  return (
    <section className="py-16 bg-background overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-4">Naši partneři</p>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
            Spolupracujeme s předními developery
          </h2>
        </motion.div>

        <div className="relative">
          {/* Gradient overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          {/* Scrolling container */}
          <div className="flex animate-scroll">
            {duplicatedDevelopers.map((developer, index) => (
              <div
                key={`${developer.id}-${index}`}
                className="flex-shrink-0 mx-10 flex items-center justify-center w-28 md:w-36"
              >
                {developer.logo_url && (
                  <img
                    src={developer.logo_url}
                    alt={developer.name}
                    className="h-10 md:h-12 w-auto max-w-full object-contain brightness-0 invert opacity-60 hover:opacity-100 transition-all duration-300"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
