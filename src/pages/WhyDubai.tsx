import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ContactDialog } from "@/components/ContactDialog";
import {
  Sun,
  Plane,
  ShieldCheck,
  Building2,
  Sparkles,
  TrendingUp,
  Rocket,
  Crown,
  ArrowRight,
} from "lucide-react";

const COPY = {
  en: {
    seoTitle: "Why Dubai — Luxury, Innovation & Opportunity | go2dubai.online",
    seoDesc:
      "Discover why Dubai is one of the world's most desirable destinations — for travel, living, and investment.",
    heroEyebrow: "— Why Dubai",
    heroTitle: "Why Dubai",
    heroSubtitle:
      "A global destination where luxury living, innovation, and opportunity come together.",
    heroCta: "Explore properties",
    heroCta2: "Contact us",

    introEyebrow: "— A vision of the future",
    introTitle: "Dubai is not just a city — it is a vision of the future.",
    introP1:
      "Known for its iconic skyline, world-class infrastructure, and unmatched lifestyle, Dubai has become one of the most desirable destinations for both travel and living.",
    introP2:
      "From luxury beachfront residences to vibrant city living, Dubai offers a unique combination of comfort, safety, and global connectivity.",

    sections: [
      {
        eyebrow: "— 01 / Lifestyle",
        title: "A Lifestyle Without Limits",
        body:
          "Dubai sets a global benchmark for luxury living. From fine dining and beach clubs to high-end shopping and exclusive experiences, the city offers everything at the highest standard. Iconic locations like Downtown Dubai or Palm Jumeirah redefine what modern lifestyle means.",
        icon: Crown,
      },
      {
        eyebrow: "— 02 / Climate",
        title: "Perfect Climate All Year",
        body:
          "With over 300 sunny days per year, Dubai provides ideal conditions for outdoor living, relaxation, and activities year-round. Whether you're enjoying a beachfront villa or a skyline terrace, the weather is always part of the experience.",
        icon: Sun,
      },
      {
        eyebrow: "— 03 / Connectivity",
        title: "Connected to the World",
        body:
          "Dubai is one of the most important global hubs, connecting Europe, Asia, and Africa. Its strategic location and world-class airports make it easily accessible from anywhere in the world. This makes Dubai not only a perfect holiday destination, but also an ideal place for business and long-term stays.",
        icon: Plane,
      },
      {
        eyebrow: "— 04 / Safety",
        title: "One of the Safest Cities in the World",
        body:
          "Dubai is known for its high level of safety, modern infrastructure, and political stability. This creates a secure environment for travelers, families, and investors alike — so you can fully enjoy your stay with peace of mind.",
        icon: ShieldCheck,
      },
      {
        eyebrow: "— 05 / Real estate",
        title: "Premium Living Spaces",
        body:
          "Dubai offers some of the most impressive real estate in the world: high-rise apartments with skyline views, beachfront villas with private access, and serviced residences with hotel-level comfort. Areas like Dubai Marina and Business Bay provide vibrant city living, while Palm Jumeirah offers ultimate exclusivity.",
        icon: Building2,
      },
      {
        eyebrow: "— 06 / Experiences",
        title: "Endless Experiences",
        body:
          "Dubai is built for experiences — desert safaris and luxury camps, private yacht cruises, world-class events and nightlife, fine dining and beach clubs. From adventure to relaxation, everything is within reach.",
        icon: Sparkles,
      },
      {
        eyebrow: "— 07 / Investment",
        title: "A Growing Global Investment Destination",
        body:
          "Dubai is one of the fastest-growing real estate markets in the world, attracting investors thanks to high rental demand, attractive yields, a tax-efficient environment, and continuous development and innovation. Many visitors come for a stay — and stay for the opportunity.",
        icon: TrendingUp,
      },
      {
        eyebrow: "— 08 / Future",
        title: "A City That Never Stops Growing",
        body:
          "Dubai is constantly evolving, with new developments, infrastructure projects, and visionary concepts shaping its future. From smart city initiatives to new waterfront communities, Dubai continues to redefine modern urban living.",
        icon: Rocket,
      },
    ],

    ctaEyebrow: "— Get in touch",
    ctaTitle: "Experience Dubai for Yourself",
    ctaDesc:
      "Discover why Dubai is one of the most exciting destinations in the world.",
    ctaPrimary: "Explore properties",
    ctaSecondary: "Contact us",
  },
  cs: {
    seoTitle: "Proč Dubaj — Luxus, inovace a příležitosti | go2dubai.online",
    seoDesc:
      "Objevte, proč je Dubaj jednou z nejžádanějších destinací na světě — pro cestování, život i investice.",
    heroEyebrow: "— Proč Dubaj",
    heroTitle: "Proč Dubaj",
    heroSubtitle:
      "Globální destinace, kde se snoubí luxusní život, inovace a příležitosti.",
    heroCta: "Prohlédnout nemovitosti",
    heroCta2: "Kontaktujte nás",

    introEyebrow: "— Vize budoucnosti",
    introTitle: "Dubaj není jen město — je to vize budoucnosti.",
    introP1:
      "Známá svým ikonickým panoramatem, špičkovou infrastrukturou a životním stylem bez konkurence — Dubaj se stala jednou z nejžádanějších destinací pro cestování i život.",
    introP2:
      "Od luxusních rezidencí na pláži po pulzující městský život — Dubaj nabízí jedinečné spojení komfortu, bezpečí a globální dostupnosti.",

    sections: [
      {
        eyebrow: "— 01 / Životní styl",
        title: "Život bez hranic",
        body:
          "Dubaj nastavuje světový standard luxusního bydlení. Od špičkové gastronomie a beach clubů po prémiové nákupy a exkluzivní zážitky — město nabízí vše na nejvyšší úrovni. Ikonické lokality jako Downtown Dubai nebo Palm Jumeirah definují moderní životní styl.",
        icon: Crown,
      },
      {
        eyebrow: "— 02 / Klima",
        title: "Perfektní počasí celý rok",
        body:
          "S více než 300 slunnými dny v roce nabízí Dubaj ideální podmínky pro venkovní život, relaxaci i aktivity po celý rok. Ať už si užíváte vilu na pláži nebo terasu s výhledem na panorama — počasí je vždy součástí zážitku.",
        icon: Sun,
      },
      {
        eyebrow: "— 03 / Dostupnost",
        title: "Spojeno se světem",
        body:
          "Dubaj je jedním z nejdůležitějších globálních hubů, propojujícím Evropu, Asii a Afriku. Strategická poloha a špičková letiště ji činí snadno dostupnou odkudkoli na světě. Dubaj je tak nejen ideální dovolenková destinace, ale i skvělé místo pro byznys a dlouhodobé pobyty.",
        icon: Plane,
      },
      {
        eyebrow: "— 04 / Bezpečnost",
        title: "Jedno z nejbezpečnějších měst světa",
        body:
          "Dubaj je známá vysokou úrovní bezpečnosti, moderní infrastrukturou a politickou stabilitou. Vytváří bezpečné prostředí pro cestovatele, rodiny i investory — můžete si pobyt naplno užít s klidem v duši.",
        icon: ShieldCheck,
      },
      {
        eyebrow: "— 05 / Reality",
        title: "Prémiový životní prostor",
        body:
          "Dubaj nabízí jedny z nejpůsobivějších nemovitostí na světě: vysokopodlažní apartmány s výhledem na panorama, vily na pláži se soukromým přístupem a serviced rezidence s hotelovým komfortem. Lokality jako Dubai Marina a Business Bay nabízejí pulzující městský život, zatímco Palm Jumeirah představuje absolutní exkluzivitu.",
        icon: Building2,
      },
      {
        eyebrow: "— 06 / Zážitky",
        title: "Nekonečno zážitků",
        body:
          "Dubaj je stvořená pro zážitky — pouštní safari a luxusní kempy, plavby na soukromých jachtách, světové eventy a noční život, špičková gastronomie a beach cluby. Od dobrodružství po relaxaci — vše máte na dosah.",
        icon: Sparkles,
      },
      {
        eyebrow: "— 07 / Investice",
        title: "Rostoucí globální investiční destinace",
        body:
          "Dubaj patří mezi nejrychleji rostoucí realitní trhy na světě a přitahuje investory díky vysoké poptávce po pronájmech, atraktivním výnosům, daňově výhodnému prostředí a neustálému rozvoji. Mnoho návštěvníků přijede na pobyt — a zůstanou kvůli příležitosti.",
        icon: TrendingUp,
      },
      {
        eyebrow: "— 08 / Budoucnost",
        title: "Město, které nikdy nepřestává růst",
        body:
          "Dubaj se neustále vyvíjí — nové developmenty, infrastrukturní projekty a vizionářské koncepty utvářejí její budoucnost. Od smart city iniciativ po nové waterfront čtvrtě — Dubaj nadále nově definuje moderní městský život.",
        icon: Rocket,
      },
    ],

    ctaEyebrow: "— Zůstaňme v kontaktu",
    ctaTitle: "Zažijte Dubaj na vlastní kůži",
    ctaDesc:
      "Objevte, proč je Dubaj jednou z nejvzrušujících destinací na světě.",
    ctaPrimary: "Prohlédnout nemovitosti",
    ctaSecondary: "Kontaktujte nás",
  },
  es: {
    seoTitle: "Por qué Dubái — Lujo, innovación y oportunidad | go2dubai.online",
    seoDesc:
      "Descubre por qué Dubái es uno de los destinos más deseados del mundo — para viajar, vivir e invertir.",
    heroEyebrow: "— Por qué Dubái",
    heroTitle: "Por qué Dubái",
    heroSubtitle:
      "Un destino global donde el lujo, la innovación y la oportunidad se unen.",
    heroCta: "Ver propiedades",
    heroCta2: "Contáctanos",

    introEyebrow: "— Una visión del futuro",
    introTitle: "Dubái no es solo una ciudad — es una visión del futuro.",
    introP1:
      "Conocida por su skyline icónico, su infraestructura de primer nivel y un estilo de vida incomparable, Dubái se ha convertido en uno de los destinos más deseados para viajar y vivir.",
    introP2:
      "Desde residencias de lujo frente al mar hasta una vida urbana vibrante, Dubái ofrece una combinación única de confort, seguridad y conectividad global.",

    sections: [
      {
        eyebrow: "— 01 / Estilo de vida",
        title: "Una vida sin límites",
        body:
          "Dubái marca el estándar global del lujo. Desde alta gastronomía y beach clubs hasta compras exclusivas y experiencias únicas — la ciudad ofrece todo al más alto nivel. Lugares icónicos como Downtown Dubai o Palm Jumeirah redefinen el estilo de vida moderno.",
        icon: Crown,
      },
      {
        eyebrow: "— 02 / Clima",
        title: "Clima perfecto todo el año",
        body:
          "Con más de 300 días soleados al año, Dubái ofrece condiciones ideales para la vida al aire libre, la relajación y las actividades durante todo el año. Ya sea disfrutando de una villa frente al mar o de una terraza con vistas al skyline — el clima siempre forma parte de la experiencia.",
        icon: Sun,
      },
      {
        eyebrow: "— 03 / Conectividad",
        title: "Conectada con el mundo",
        body:
          "Dubái es uno de los hubs globales más importantes, conectando Europa, Asia y África. Su ubicación estratégica y aeropuertos de primer nivel la hacen accesible desde cualquier parte del mundo. Esto convierte a Dubái no solo en un destino ideal de vacaciones, sino también en un lugar perfecto para negocios y estancias largas.",
        icon: Plane,
      },
      {
        eyebrow: "— 04 / Seguridad",
        title: "Una de las ciudades más seguras del mundo",
        body:
          "Dubái destaca por su alto nivel de seguridad, infraestructura moderna y estabilidad política. Crea un entorno seguro para viajeros, familias e inversores — disfruta tu estancia con total tranquilidad.",
        icon: ShieldCheck,
      },
      {
        eyebrow: "— 05 / Inmobiliario",
        title: "Espacios premium para vivir",
        body:
          "Dubái ofrece algunos de los inmuebles más impresionantes del mundo: apartamentos en altura con vistas al skyline, villas frente al mar con acceso privado y residencias con servicio nivel hotel. Zonas como Dubai Marina y Business Bay ofrecen vida urbana vibrante, mientras que Palm Jumeirah representa la máxima exclusividad.",
        icon: Building2,
      },
      {
        eyebrow: "— 06 / Experiencias",
        title: "Experiencias sin fin",
        body:
          "Dubái está hecha para vivirla — safaris por el desierto y campamentos de lujo, cruceros privados en yate, eventos de talla mundial y vida nocturna, alta gastronomía y beach clubs. De la aventura a la relajación — todo está al alcance.",
        icon: Sparkles,
      },
      {
        eyebrow: "— 07 / Inversión",
        title: "Un destino global de inversión en crecimiento",
        body:
          "Dubái es uno de los mercados inmobiliarios de mayor crecimiento del mundo, atrayendo inversores gracias a la alta demanda de alquiler, rentabilidades atractivas, un entorno fiscal favorable y un desarrollo e innovación constantes. Muchos visitantes vienen por una estancia — y se quedan por la oportunidad.",
        icon: TrendingUp,
      },
      {
        eyebrow: "— 08 / Futuro",
        title: "Una ciudad que nunca deja de crecer",
        body:
          "Dubái evoluciona constantemente — nuevos desarrollos, proyectos de infraestructura y conceptos visionarios moldean su futuro. Desde iniciativas smart city hasta nuevas comunidades frente al mar — Dubái sigue redefiniendo la vida urbana moderna.",
        icon: Rocket,
      },
    ],

    ctaEyebrow: "— Hablemos",
    ctaTitle: "Vive Dubái por ti mismo",
    ctaDesc:
      "Descubre por qué Dubái es uno de los destinos más emocionantes del mundo.",
    ctaPrimary: "Ver propiedades",
    ctaSecondary: "Contáctanos",
  },
} as const;

import HERO_VIDEO from "@/assets/why-dubai-hero.mp4";
import IMG_INTRO from "@/assets/why-dubai-cityscape.jpg";

const WhyDubai = () => {
  const { i18n } = useTranslation();
  const lang = (["en", "cs", "es"].includes(i18n.language) ? i18n.language : "en") as keyof typeof COPY;
  const c = COPY[lang];

  return (
    <div className="min-h-screen bg-background">
      <SEO title={c.seoTitle} description={c.seoDesc} />
      <Navbar />

      {/* HERO */}
      <section className="relative h-screen min-h-[640px] flex items-end -mt-[72px] pt-[72px] overflow-hidden">
        <video
          src={HERO_VIDEO}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-black/80" />

        <div className="container mx-auto px-8 relative z-10 pb-24">
          <div className="max-w-5xl">
            <span className="block text-xs uppercase tracking-[0.3em] text-white/80 mb-6 font-medium">
              {c.heroEyebrow}
            </span>
            <h1 className="editorial-headline text-white text-5xl md:text-7xl lg:text-[5.5rem] mb-8 max-w-4xl text-balance">
              {c.heroTitle}
            </h1>
            <p className="text-base md:text-lg text-white/85 mb-10 max-w-xl leading-relaxed font-light">
              {c.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 px-7 h-12 text-sm font-medium rounded-full group"
                asChild
              >
                <Link to="/rentals" className="flex items-center gap-2">
                  {c.heroCta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <ContactDialog>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-transparent text-white hover:bg-white hover:text-foreground px-7 h-12 text-sm font-medium rounded-full"
                >
                  {c.heroCta2}
                </Button>
              </ContactDialog>
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="py-28 md:py-36 bg-background">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-5">
              <span className="editorial-eyebrow block mb-6">{c.introEyebrow}</span>
              <h2 className="editorial-headline text-3xl md:text-4xl lg:text-5xl text-foreground text-balance">
                {c.introTitle}
              </h2>
            </div>
            <div className="md:col-span-7 space-y-5">
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-light">
                {c.introP1}
              </p>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-light">
                {c.introP2}
              </p>
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mt-8">
                <img
                  src={IMG_INTRO}
                  alt="Dubai cityscape"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8 SECTIONS — alternating */}
      <section className="bg-muted/30">
        <div className="container mx-auto px-8 py-24 md:py-32 space-y-24 md:space-y-32">
          {c.sections.map((s, i) => {
            const Icon = s.icon;
            const reversed = i % 2 === 1;
            return (
              <div
                key={i}
                className={`grid md:grid-cols-12 gap-10 items-start ${
                  reversed ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className="md:col-span-5">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-foreground text-background mb-6">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <span className="editorial-eyebrow block mb-4">{s.eyebrow}</span>
                </div>
                <div className="md:col-span-7">
                  <h3 className="editorial-headline text-3xl md:text-4xl lg:text-5xl text-foreground mb-6 text-balance">
                    {s.title}
                  </h3>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-light">
                    {s.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 md:py-36 bg-foreground text-background">
        <div className="container mx-auto px-8">
          <div className="max-w-3xl mx-auto text-center">
            <span className="editorial-eyebrow block mb-8 text-background/60">
              {c.ctaEyebrow}
            </span>
            <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl mb-6 text-balance">
              {c.ctaTitle}
            </h2>
            <p className="text-base md:text-lg text-background/75 mb-10 max-w-xl mx-auto leading-relaxed font-light">
              {c.ctaDesc}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 font-medium rounded-full px-7 h-12 text-sm group"
                asChild
              >
                <Link to="/rentals" className="flex items-center gap-2">
                  {c.ctaPrimary}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <ContactDialog>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-background/30 bg-transparent text-background hover:bg-background hover:text-foreground rounded-full px-7 h-12 text-sm font-medium"
                >
                  {c.ctaSecondary}
                </Button>
              </ContactDialog>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default WhyDubai;
