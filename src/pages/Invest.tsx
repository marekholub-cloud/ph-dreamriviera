import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Percent,
  ShieldCheck,
  Building2,
  Waves,
  Sparkles,
  ArrowRight,
  Briefcase,
  Compass,
  LineChart,
} from "lucide-react";
import HERO_VIDEO from "@/assets/invest-hero.mp4";

const COPY = {
  en: {
    seoTitle: "Invest in Dubai Real Estate — High Yields & Strong Growth | go2dubai.online",
    seoDesc:
      "High-yield property investment in Dubai. Tax-efficient environment, strong rental demand, and full-service management for international investors.",
    eyebrow: "Invest in Dubai",
    heroTitlePre: "Invest in Dubai",
    heroTitleAccent: "Real Estate",
    heroSubtitle:
      "High-yield opportunities in one of the world's fastest-growing property markets. From short-term rental income to long-term capital appreciation — Dubai combines lifestyle and investment potential.",
    heroCta: "Explore Opportunities",
    heroCta2: "Speak to an Advisor",

    introEyebrow: "— 01 / Intro",
    introTitle: "A global hotspot for real estate investment.",
    introBody:
      "Dubai attracts investors from all over the world thanks to its tax-efficient environment, strong rental demand, and continuous growth. At go2dubai.online, we help clients not only find the perfect property — but also turn it into a profitable asset.",

    whyEyebrow: "— 02 / Why Dubai",
    whyTitle: "Why invest in Dubai",
    why: [
      { icon: Percent, title: "High Rental Yields", desc: "Some of the highest rental returns globally, especially in the short-term rental segment." },
      { icon: TrendingUp, title: "Tax Advantages", desc: "No property tax and no income tax on rental income for individuals." },
      { icon: LineChart, title: "Strong Market Growth", desc: "Continuous development, increasing demand, and global investor interest." },
      { icon: ShieldCheck, title: "Safe & Regulated Market", desc: "Transparent legal framework and strong government oversight." },
    ],

    journeyEyebrow: "— 03 / Strategy",
    journeyTitle: "From guest to investor",
    journeyIntro:
      "Many of our clients start with a short-term stay — and quickly realize the potential of owning property in Dubai. We guide you through the entire journey:",
    journeySteps: [
      { title: "Discover Dubai", desc: "Experience the city through a curated premium stay." },
      { title: "Identify hotspots", desc: "Pinpoint high-potential investment locations." },
      { title: "Select the right property", desc: "Choose based on ROI, demand, and your goals." },
      { title: "Maximize returns", desc: "Manage rentals and optimize performance long-term." },
    ],

    typesEyebrow: "— 04 / Property types",
    typesTitle: "Property types for investment",
    types: [
      {
        icon: Building2,
        tag: "High ROI",
        title: "Apartments",
        desc: "Ideal for short-term rentals in high-demand districts.",
        list: ["Dubai Marina", "Business Bay", "Downtown Dubai"],
      },
      {
        icon: Waves,
        tag: "Premium",
        title: "Waterfront Properties",
        desc: "Premium segment with strong appreciation potential.",
        list: ["Palm Jumeirah", "Dubai Islands"],
      },
      {
        icon: Compass,
        tag: "Growth",
        title: "Emerging Areas",
        desc: "Opportunities with high upside potential.",
        list: ["Dubai Creek Harbour", "Dubai South"],
      },
    ],

    stEyebrow: "— 05 / Short-term rentals",
    stTitle: "Turn your property into income",
    stIntro: "Dubai is one of the strongest markets for short-term rentals, driven by:",
    stPoints: [
      "Year-round tourism",
      "Business travel demand",
      "Global events and exhibitions",
      "Luxury travel segment growth",
    ],
    stOutro:
      "With the right property and management, short-term rentals can significantly outperform traditional leasing.",

    serviceEyebrow: "— 06 / Full service",
    serviceTitle: "We handle everything",
    serviceIntro: "Our service doesn't end with the purchase. We provide:",
    serviceList: [
      "Property sourcing",
      "Investment consulting",
      "Rental management",
      "Guest communication",
      "Pricing optimization",
    ],
    serviceOutro: "You own the asset — we handle the operations.",

    roiEyebrow: "— 07 / Performance",
    roiTitle: "Built for performance",
    roiIntro: "Dubai real estate combines:",
    roiPoints: [
      { k: "Capital appreciation", v: "Long-term value growth across prime areas." },
      { k: "Rental income", v: "Steady cash flow from short and long-term tenants." },
      { k: "Portfolio diversification", v: "Global asset in a stable, USD-pegged economy." },
    ],
    roiOutro:
      "Ideal for both first-time investors and experienced buyers expanding globally.",

    ctaTitle: "Start your investment journey in Dubai",
    ctaDesc:
      "Whether you're looking for passive income or long-term growth, Dubai offers unmatched opportunities.",
    ctaBtn: "Browse Properties",
    ctaBtn2: "Contact an Advisor",
  },
  cs: {
    seoTitle: "Investice v Dubaji — vysoké výnosy a silný růst | go2dubai.online",
    seoDesc:
      "Investice do nemovitostí v Dubaji s vysokým výnosem. Daňově efektivní prostředí, silná poptávka po pronájmu a kompletní servis pro mezinárodní investory.",
    eyebrow: "Investice v Dubaji",
    heroTitlePre: "Investujte do nemovitostí",
    heroTitleAccent: "v Dubaji",
    heroSubtitle:
      "Vysoce výnosné příležitosti na jednom z nejrychleji rostoucích trhů s nemovitostmi. Od krátkodobých pronájmů po dlouhodobé zhodnocení kapitálu — Dubaj spojuje životní styl s investičním potenciálem.",
    heroCta: "Prozkoumat příležitosti",
    heroCta2: "Mluvit s poradcem",

    introEyebrow: "— 01 / Úvod",
    introTitle: "Globální centrum investic do nemovitostí.",
    introBody:
      "Dubaj přitahuje investory z celého světa díky daňově efektivnímu prostředí, silné poptávce po pronájmech a kontinuálnímu růstu. V go2dubai.online vám pomůžeme nejen najít ideální nemovitost — ale také z ní udělat výnosné aktivum.",

    whyEyebrow: "— 02 / Proč Dubaj",
    whyTitle: "Proč investovat v Dubaji",
    why: [
      { icon: Percent, title: "Vysoké výnosy z pronájmu", desc: "Jedny z nejvyšších výnosů z pronájmu na světě, zejména v krátkodobém segmentu." },
      { icon: TrendingUp, title: "Daňové výhody", desc: "Žádná daň z nemovitostí ani z příjmu z pronájmu pro fyzické osoby." },
      { icon: LineChart, title: "Silný růst trhu", desc: "Nepřetržitý rozvoj, rostoucí poptávka a zájem globálních investorů." },
      { icon: ShieldCheck, title: "Bezpečný a regulovaný trh", desc: "Transparentní právní rámec a silný státní dohled." },
    ],

    journeyEyebrow: "— 03 / Strategie",
    journeyTitle: "Od hosta k investorovi",
    journeyIntro:
      "Mnoho našich klientů začíná krátkodobým pobytem — a rychle objeví potenciál vlastnictví nemovitosti v Dubaji. Provedeme vás celou cestou:",
    journeySteps: [
      { title: "Objevte Dubaj", desc: "Prožijte město skrze prémiový pobyt." },
      { title: "Identifikujte lokality", desc: "Najděte oblasti s nejvyšším potenciálem." },
      { title: "Vyberte správnou nemovitost", desc: "Podle ROI, poptávky a vašich cílů." },
      { title: "Maximalizujte výnosy", desc: "Spravujte pronájem a optimalizujte výkon." },
    ],

    typesEyebrow: "— 04 / Typy nemovitostí",
    typesTitle: "Typy nemovitostí pro investice",
    types: [
      {
        icon: Building2,
        tag: "Vysoké ROI",
        title: "Apartmány",
        desc: "Ideální pro krátkodobé pronájmy v nejžádanějších lokalitách.",
        list: ["Dubai Marina", "Business Bay", "Downtown Dubai"],
      },
      {
        icon: Waves,
        tag: "Premium",
        title: "Nemovitosti u vody",
        desc: "Prémiový segment se silným potenciálem zhodnocení.",
        list: ["Palm Jumeirah", "Dubai Islands"],
      },
      {
        icon: Compass,
        tag: "Růst",
        title: "Rostoucí oblasti",
        desc: "Příležitosti s vysokým potenciálem růstu.",
        list: ["Dubai Creek Harbour", "Dubai South"],
      },
    ],

    stEyebrow: "— 05 / Krátkodobé pronájmy",
    stTitle: "Proměňte nemovitost na zdroj příjmů",
    stIntro: "Dubaj je jedním z nejsilnějších trhů krátkodobých pronájmů díky:",
    stPoints: [
      "Celoroční turistice",
      "Poptávce z business cestování",
      "Globálním eventům a výstavám",
      "Růstu segmentu luxusního cestování",
    ],
    stOutro:
      "Se správnou nemovitostí a managementem mohou krátkodobé pronájmy výrazně překonat klasické nájmy.",

    serviceEyebrow: "— 06 / Plný servis",
    serviceTitle: "Postaráme se o vše",
    serviceIntro: "Náš servis nekončí nákupem. Poskytujeme:",
    serviceList: [
      "Vyhledávání nemovitostí",
      "Investiční poradenství",
      "Správu pronájmů",
      "Komunikaci s hosty",
      "Optimalizaci cen",
    ],
    serviceOutro: "Vy vlastníte aktivum — my se postaráme o provoz.",

    roiEyebrow: "— 07 / Výkon",
    roiTitle: "Stvořeno pro výkon",
    roiIntro: "Dubajské nemovitosti kombinují:",
    roiPoints: [
      { k: "Růst hodnoty", v: "Dlouhodobé zhodnocení v prémiových oblastech." },
      { k: "Příjem z pronájmu", v: "Stabilní cashflow z krátkodobých i dlouhodobých nájmů." },
      { k: "Diverzifikace portfolia", v: "Globální aktivum vázané na americký dolar." },
    ],
    roiOutro:
      "Ideální pro začínající i zkušené investory rozšiřující portfolio globálně.",

    ctaTitle: "Začněte investovat v Dubaji",
    ctaDesc:
      "Ať už hledáte pasivní příjem, nebo dlouhodobý růst, Dubaj nabízí jedinečné příležitosti.",
    ctaBtn: "Procházet nemovitosti",
    ctaBtn2: "Kontaktovat poradce",
  },
  es: {
    seoTitle: "Invertir en Dubai — altos rendimientos y fuerte crecimiento | go2dubai.online",
    seoDesc:
      "Inversión inmobiliaria de alto rendimiento en Dubai. Entorno fiscal eficiente, alta demanda de alquiler y servicio integral para inversores internacionales.",
    eyebrow: "Invertir en Dubai",
    heroTitlePre: "Invierta en bienes raíces",
    heroTitleAccent: "en Dubai",
    heroSubtitle:
      "Oportunidades de alto rendimiento en uno de los mercados inmobiliarios de mayor crecimiento. Desde alquileres a corto plazo hasta plusvalía a largo plazo — Dubai combina estilo de vida y potencial de inversión.",
    heroCta: "Explorar oportunidades",
    heroCta2: "Hablar con un asesor",

    introEyebrow: "— 01 / Introducción",
    introTitle: "Un punto de referencia global para invertir.",
    introBody:
      "Dubai atrae a inversores de todo el mundo gracias a su entorno fiscal eficiente, alta demanda de alquiler y crecimiento continuo. En go2dubai.online le ayudamos no solo a encontrar la propiedad ideal — sino a convertirla en un activo rentable.",

    whyEyebrow: "— 02 / Por qué Dubai",
    whyTitle: "Por qué invertir en Dubai",
    why: [
      { icon: Percent, title: "Altos rendimientos", desc: "Algunos de los mayores rendimientos de alquiler del mundo, sobre todo en corto plazo." },
      { icon: TrendingUp, title: "Ventajas fiscales", desc: "Sin impuesto sobre la propiedad ni sobre los ingresos por alquiler para personas físicas." },
      { icon: LineChart, title: "Crecimiento sólido", desc: "Desarrollo continuo, demanda creciente e interés global de inversores." },
      { icon: ShieldCheck, title: "Mercado seguro y regulado", desc: "Marco jurídico transparente y fuerte supervisión estatal." },
    ],

    journeyEyebrow: "— 03 / Estrategia",
    journeyTitle: "De huésped a inversor",
    journeyIntro:
      "Muchos de nuestros clientes comienzan con una estancia corta — y rápidamente descubren el potencial de poseer una propiedad en Dubai. Le acompañamos en todo el camino:",
    journeySteps: [
      { title: "Descubra Dubai", desc: "Viva la ciudad a través de una estancia premium." },
      { title: "Identifique zonas clave", desc: "Encuentre las ubicaciones con mayor potencial." },
      { title: "Elija la propiedad ideal", desc: "Según ROI, demanda y sus objetivos." },
      { title: "Maximice rendimientos", desc: "Gestione alquileres y optimice resultados." },
    ],

    typesEyebrow: "— 04 / Tipos de propiedad",
    typesTitle: "Tipos de propiedad para invertir",
    types: [
      {
        icon: Building2,
        tag: "Alto ROI",
        title: "Apartamentos",
        desc: "Ideales para alquiler corto en zonas de alta demanda.",
        list: ["Dubai Marina", "Business Bay", "Downtown Dubai"],
      },
      {
        icon: Waves,
        tag: "Premium",
        title: "Propiedades frente al mar",
        desc: "Segmento premium con fuerte potencial de revalorización.",
        list: ["Palm Jumeirah", "Dubai Islands"],
      },
      {
        icon: Compass,
        tag: "Crecimiento",
        title: "Zonas emergentes",
        desc: "Oportunidades con alto potencial alcista.",
        list: ["Dubai Creek Harbour", "Dubai South"],
      },
    ],

    stEyebrow: "— 05 / Alquiler corto plazo",
    stTitle: "Convierta su propiedad en ingresos",
    stIntro: "Dubai es uno de los mercados más sólidos de alquiler corto gracias a:",
    stPoints: [
      "Turismo durante todo el año",
      "Demanda de viajes de negocios",
      "Eventos y exposiciones globales",
      "Crecimiento del segmento de viajes de lujo",
    ],
    stOutro:
      "Con la propiedad y gestión adecuadas, el alquiler corto puede superar ampliamente al alquiler tradicional.",

    serviceEyebrow: "— 06 / Servicio integral",
    serviceTitle: "Nos encargamos de todo",
    serviceIntro: "Nuestro servicio no termina con la compra. Ofrecemos:",
    serviceList: [
      "Búsqueda de propiedades",
      "Asesoramiento de inversión",
      "Gestión de alquileres",
      "Comunicación con huéspedes",
      "Optimización de precios",
    ],
    serviceOutro: "Usted posee el activo — nosotros gestionamos la operación.",

    roiEyebrow: "— 07 / Rendimiento",
    roiTitle: "Diseñado para rendir",
    roiIntro: "El sector inmobiliario en Dubai combina:",
    roiPoints: [
      { k: "Plusvalía", v: "Crecimiento de valor a largo plazo en zonas prime." },
      { k: "Ingresos por alquiler", v: "Flujo estable de inquilinos cortos y largos." },
      { k: "Diversificación", v: "Activo global en una economía estable vinculada al USD." },
    ],
    roiOutro:
      "Ideal tanto para inversores principiantes como experimentados a nivel global.",

    ctaTitle: "Comience su viaje de inversión en Dubai",
    ctaDesc:
      "Tanto si busca ingresos pasivos como crecimiento a largo plazo, Dubai ofrece oportunidades inigualables.",
    ctaBtn: "Ver propiedades",
    ctaBtn2: "Contactar a un asesor",
  },
} as const;


const Invest = () => {
  const { i18n } = useTranslation();
  const lang = (["en", "cs", "es"].includes(i18n.language) ? i18n.language : "en") as keyof typeof COPY;
  const t = COPY[lang];

  return (
    <div className="min-h-screen bg-background">
      <SEO title={t.seoTitle} description={t.seoDesc} url="https://go2dubai.online/invest" />
      <Navbar />

      {/* Hero */}
      <section className="relative h-screen min-h-[680px] flex items-center -mt-[72px] pt-[72px] overflow-hidden">
        <video
          src={HERO_VIDEO}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-black/55" />

        <div className="container mx-auto px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="block text-xs uppercase tracking-[0.3em] text-white/85 mb-8 font-medium"
            >
              {t.eyebrow}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="editorial-headline text-white text-5xl md:text-7xl lg:text-[5.5rem] mb-2 text-balance"
            >
              {t.heroTitlePre}
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="editorial-headline italic text-5xl md:text-7xl lg:text-[5.5rem] mb-10 text-balance"
              style={{ color: 'hsl(var(--accent))' }}
            >
              {t.heroTitleAccent}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25 }}
              className="text-base md:text-lg text-white/85 mb-12 max-w-2xl mx-auto leading-relaxed font-light"
            >
              {t.heroSubtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Button
                asChild
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 px-7 h-12 text-sm font-medium rounded-full"
              >
                <Link to="/rentals">
                  {t.heroCta}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-transparent text-white border-white/40 hover:bg-white hover:text-foreground rounded-full px-7 h-12 text-sm font-medium"
              >
                <a href="#cta">
                  <Briefcase className="h-4 w-4 mr-2" />
                  {t.heroCta2}
                </a>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-28 md:py-36 bg-background">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-2">
              <span className="editorial-eyebrow">{t.introEyebrow}</span>
            </div>
            <div className="md:col-span-10">
              <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground text-balance max-w-3xl mb-8">
                {t.introTitle}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-light max-w-3xl">
                {t.introBody}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Dubai */}
      <section className="py-28 md:py-36 bg-secondary/40">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-8 mb-20 items-end">
            <div className="md:col-span-2">
              <span className="editorial-eyebrow">{t.whyEyebrow}</span>
            </div>
            <div className="md:col-span-10">
              <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground text-balance max-w-3xl">
                {t.whyTitle}
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
            {t.why.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-background p-8 md:p-10"
                >
                  <Icon className="h-6 w-6 mb-6" strokeWidth={1.25} style={{ color: 'hsl(var(--accent))' }} />
                  <h3 className="font-serif text-xl md:text-2xl mb-3 text-foreground leading-tight">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Journey — dark */}
      <section className="py-28 md:py-36 bg-foreground text-background">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-8 mb-16 items-end">
            <div className="md:col-span-2">
              <span className="text-xs uppercase tracking-[0.2em] text-background/50 font-medium">{t.journeyEyebrow}</span>
            </div>
            <div className="md:col-span-10">
              <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-balance max-w-3xl mb-8">
                {t.journeyTitle}
              </h2>
              <p className="text-base text-background/70 leading-relaxed font-light max-w-2xl">
                {t.journeyIntro}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-px bg-background/10 border border-background/10">
            {t.journeySteps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="bg-foreground p-8 md:p-10"
              >
                <span className="text-xs tracking-[0.2em] text-background/40 mb-6 block">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-xl md:text-2xl mb-3 leading-tight">{s.title}</h3>
                <p className="text-sm text-background/65 leading-relaxed font-light">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Property Types */}
      <section className="py-28 md:py-36 bg-background">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-8 mb-20 items-end">
            <div className="md:col-span-2">
              <span className="editorial-eyebrow">{t.typesEyebrow}</span>
            </div>
            <div className="md:col-span-10">
              <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground text-balance max-w-3xl">
                {t.typesTitle}
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {t.types.map((tp, i) => {
              const Icon = tp.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="border border-border p-8 md:p-10 flex flex-col hover-lift bg-background"
                >
                  <div className="flex items-start justify-between mb-8">
                    <Icon className="h-6 w-6" strokeWidth={1.25} style={{ color: 'hsl(var(--accent))' }} />
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground border border-border px-2.5 py-1 rounded-full">
                      {tp.tag}
                    </span>
                  </div>
                  <h3 className="font-serif text-2xl md:text-3xl text-foreground mb-3">{tp.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light mb-6">{tp.desc}</p>
                  <ul className="mt-auto space-y-2 pt-6 border-t border-border">
                    {tp.list.map((l, j) => (
                      <li key={j} className="text-sm text-foreground flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full" style={{ background: 'hsl(var(--accent))' }} />
                        {l}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Short-term + Service — split editorial */}
      <section className="py-28 md:py-36 bg-secondary/40">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-2 gap-16 lg:gap-24">
            {/* Short-term */}
            <div>
              <span className="editorial-eyebrow block mb-6">{t.stEyebrow}</span>
              <h2 className="editorial-headline text-3xl md:text-4xl lg:text-5xl text-foreground mb-6 text-balance">
                {t.stTitle}
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed font-light mb-6">
                {t.stIntro}
              </p>
              <ul className="divide-y divide-border border-y border-border mb-6">
                {t.stPoints.map((p, i) => (
                  <li key={i} className="py-4 flex gap-4 items-start">
                    <span className="text-xs tracking-[0.2em] text-muted-foreground font-medium pt-1 shrink-0 w-6">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-base text-foreground leading-relaxed font-light">{p}</p>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground italic font-light">{t.stOutro}</p>
            </div>

            {/* Service */}
            <div>
              <span className="editorial-eyebrow block mb-6">{t.serviceEyebrow}</span>
              <h2 className="editorial-headline text-3xl md:text-4xl lg:text-5xl text-foreground mb-6 text-balance">
                {t.serviceTitle}
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed font-light mb-6">
                {t.serviceIntro}
              </p>
              <ul className="divide-y divide-border border-y border-border mb-6">
                {t.serviceList.map((p, i) => (
                  <li key={i} className="py-4 flex gap-4 items-start">
                    <span className="text-xs tracking-[0.2em] text-muted-foreground font-medium pt-1 shrink-0 w-6">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-base text-foreground leading-relaxed font-light">{p}</p>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground italic font-light">{t.serviceOutro}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ROI */}
      <section className="py-28 md:py-36 bg-background">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-12">
            <div className="md:col-span-5">
              <span className="editorial-eyebrow block mb-6">{t.roiEyebrow}</span>
              <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 text-balance">
                {t.roiTitle}
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed font-light mb-6 max-w-md">
                {t.roiIntro}
              </p>
              <p className="text-sm text-muted-foreground italic font-light max-w-md">{t.roiOutro}</p>
            </div>

            <ul className="md:col-span-7 divide-y divide-border border-y border-border">
              {t.roiPoints.map((r, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className="py-7 flex gap-6 items-baseline"
                >
                  <span className="text-xs tracking-[0.2em] text-muted-foreground font-medium shrink-0 w-8">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-serif text-xl md:text-2xl text-foreground mb-2">{r.k}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-light">{r.v}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className="py-28 md:py-40 bg-background">
        <div className="container mx-auto px-8">
          <div className="max-w-3xl mx-auto text-center">
            <Sparkles className="h-6 w-6 mx-auto mb-8 text-foreground/40" strokeWidth={1.25} />
            <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground mb-8 text-balance">
              {t.ctaTitle}
            </h2>
            <p className="text-base text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed font-light">
              {t.ctaDesc}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90 font-medium rounded-full px-7 h-12 text-sm"
              >
                <Link to="/rentals">
                  {t.ctaBtn}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-foreground/20 text-foreground hover:bg-foreground hover:text-background font-medium rounded-full px-7 h-12 text-sm bg-transparent"
              >
                <Link to="/#contact">
                  <Briefcase className="h-4 w-4 mr-2" />
                  {t.ctaBtn2}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Invest;
