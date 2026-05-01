import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { ContactDialog } from "@/components/ContactDialog";
import {
  ArrowRight,
  MapPin,
  Plane,
  Compass,
  TrendingUp,
  TreePalm,
  Waves,
  ShieldCheck,
  Home,
  Utensils,
  ConciergeBell,
  Lock,
  CheckCircle2,
  Sun,
  Building2,
  FileText,
  Phone,
  Mail,
  Globe,
} from "lucide-react";

import cover from "@/assets/island-nest/cover.jpg";
import aerial from "@/assets/island-nest/aerial.jpg";
import villaPool from "@/assets/island-nest/villa-pool.jpg";
import villaAerial from "@/assets/island-nest/villa-aerial.jpg";
import villaExterior from "@/assets/island-nest/villa-exterior.jpg";
import interiorBathroom from "@/assets/island-nest/interior-bathroom.jpg";
import interiorLiving from "@/assets/island-nest/interior-living.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

const IslandNest = () => {
  const [contactOpen, setContactOpen] = useState(false);

  const locationFeatures = [
    { icon: Plane, text: "Accessible via international airport" },
    { icon: Compass, text: "Tourist-friendly area" },
    { icon: TrendingUp, text: "Rising rental demand" },
    { icon: TreePalm, text: "Nature without mass tourism" },
    { icon: Waves, text: "Close to the sea and beaches" },
  ];

  const masterplan = [
    { icon: Home, text: "25 standalone villas" },
    { icon: Waves, text: "Central pool & relax zone" },
    { icon: Utensils, text: "Restaurant & lounge" },
    { icon: ConciergeBell, text: "Reception & resort management" },
    { icon: TreePalm, text: "Tropical greenery & privacy" },
    { icon: Lock, text: "Gated community for owners & guests" },
  ];

  const villaFeatures = [
    "Private swimming pool",
    "Terrace and garden",
    "Fully furnished interior",
    "Air conditioning",
    "Modern tropical design",
    "Ready for resort operation",
  ];

  const phases = [
    {
      label: "Reservation",
      amount: "€10,000",
      points: [
        "Reserves your specific unit",
        "Counted toward villa price",
        "Villa is blocked for the investor",
      ],
    },
    {
      label: "40% — Project kickoff",
      amount: "40%",
      points: [
        "Investment contract signed",
        "Project preparation",
        "Construction team mobilization",
        "Material orders",
      ],
    },
    {
      label: "30% — Shell construction",
      amount: "30%",
      points: [
        "Completed structure",
        "Roof and outer walls",
        "Water & electrical rough-ins",
        "Photo documentation for the investor",
      ],
    },
    {
      label: "30% — Completion & handover",
      amount: "30%",
      points: [
        "Finished interiors",
        "Functional installations",
        "Pool completed and operational",
        "Ready for rental operation",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Island Nest Resort — Investment Villas in the Philippines"
        description="Boutique investment resort in Dapitan City, Philippines. Only 25 villas for sale. Private ownership, full management, EUR rental returns of 7–10% p.a."
      />
      <Navbar />

      {/* HERO */}
      <section className="relative h-[90vh] min-h-[640px] flex items-end -mt-[72px] pt-[72px] overflow-hidden">
        <img
          src={cover}
          alt="Island Nest Resort cover"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/80" />

        <div className="container mx-auto px-8 relative z-10 pb-20">
          <div className="max-w-4xl">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="inline-block text-xs uppercase tracking-[0.3em] text-white/85 mb-6 font-medium border border-white/30 px-4 py-1.5 rounded-full"
            >
              Limited project — Only 25 villas
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="editorial-headline text-white text-4xl md:text-6xl lg:text-7xl mb-6 max-w-3xl text-balance"
            >
              Island Nest Resort
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15 }}
              className="text-lg md:text-xl text-white/90 mb-3 font-light flex items-center gap-2"
            >
              <MapPin className="h-5 w-5" /> Dapitan City, Philippines
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25 }}
              className="text-base md:text-lg text-white/80 mb-10 max-w-2xl leading-relaxed font-light"
            >
              Beachfront investment villas. Privacy · Full management · EUR returns.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button
                size="lg"
                onClick={() => setContactOpen(true)}
                className="bg-background text-foreground hover:bg-background/90 px-7 h-12 text-sm font-medium rounded-full group"
              >
                Reserve a villa
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white hover:text-foreground px-7 h-12 text-sm font-medium rounded-full"
                asChild
              >
                <a href="#concept">Discover the project</a>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CONCEPT */}
      <section id="concept" className="py-28 md:py-36 bg-background">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-5">
              <span className="editorial-eyebrow block mb-6">— 01 / Concept</span>
              <h2 className="editorial-headline text-3xl md:text-4xl lg:text-5xl text-foreground text-balance">
                A boutique resort built for owners who want returns without the hassle.
              </h2>
            </div>
            <div className="md:col-span-7 space-y-6 text-base md:text-lg text-muted-foreground leading-relaxed font-light">
              <p>
                Island Nest Resort is a boutique investment resort in the Philippines, designed for clients who want
                to own beachfront real estate while earning income from it.
              </p>

              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 pt-4">
                <h3 className="sm:col-span-2 text-sm uppercase tracking-[0.2em] text-foreground font-medium mb-2">
                  How the model works
                </h3>
                {[
                  "Private villa ownership",
                  "Resort handles tourist rentals",
                  "Complete management & service",
                  "Rental income for owners",
                  "Zero operational worries",
                ].map((p) => (
                  <div key={p} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span className="text-sm">{p}</span>
                  </div>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 pt-4">
                <h3 className="sm:col-span-2 text-sm uppercase tracking-[0.2em] text-foreground font-medium mb-2">
                  Who it's for
                </h3>
                {[
                  "Investors seeking passive income",
                  "Buyers wanting a second home by the sea",
                  "Anyone diversifying their assets",
                ].map((p) => (
                  <div key={p} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span className="text-sm">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOCATION */}
      <section className="py-28 md:py-36 bg-secondary/30">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-12 items-end mb-16">
            <div className="md:col-span-2">
              <span className="editorial-eyebrow">— 02 / Location</span>
            </div>
            <div className="md:col-span-7">
              <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground text-balance">
                Dapitan City — calm, nature, and investment potential.
              </h2>
            </div>
            <div className="md:col-span-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                A quiet, growing destination on the Philippine coast with rising tourist interest in extended stays.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-px bg-border">
            {locationFeatures.map(({ icon: Icon, text }) => (
              <motion.div
                key={text}
                {...fadeUp}
                className="bg-background p-8 flex flex-col items-start gap-4"
              >
                <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
                <p className="text-sm text-foreground font-light leading-relaxed">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MASTERPLAN */}
      <section className="py-28 md:py-36 bg-background">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-6">
              <motion.img
                {...fadeUp}
                src={aerial}
                alt="Resort masterplan aerial view"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
            <div className="md:col-span-6">
              <span className="editorial-eyebrow block mb-6">— 03 / Masterplan</span>
              <h2 className="editorial-headline text-3xl md:text-4xl lg:text-5xl text-foreground text-balance mb-6">
                A gated boutique resort designed around privacy, greenery, and comfort.
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed font-light mb-8">
                Island Nest Resort is built as an enclosed boutique compound for guests and owners alike.
              </p>

              <ul className="divide-y divide-border">
                {masterplan.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-4 py-4">
                    <Icon className="h-5 w-5 text-primary shrink-0" strokeWidth={1.5} />
                    <span className="text-base text-foreground font-light">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* VILLA TYPES */}
      <section className="py-28 md:py-36 bg-foreground text-background">
        <div className="container mx-auto px-8">
          <div className="max-w-3xl mb-16">
            <span className="text-xs uppercase tracking-[0.2em] text-background/50 font-medium block mb-6">
              — 04 / Villa types
            </span>
            <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-balance mb-6">
              Modern tropical villas built for comfort and privacy.
            </h2>
            <p className="text-base md:text-lg text-background/70 leading-relaxed font-light">
              A villa that combines personal use and investment potential.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <motion.img {...fadeUp} src={villaPool} alt="Villa with pool" className="w-full aspect-[4/3] object-cover" />
            <motion.img {...fadeUp} src={villaAerial} alt="Villa aerial view with solar panels" className="w-full aspect-[4/3] object-cover" />
          </div>

          <motion.img
            {...fadeUp}
            src={villaExterior}
            alt="Villa exterior with pool and ocean view"
            className="w-full aspect-[21/9] object-cover mb-12"
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            {villaFeatures.map((f) => (
              <div key={f} className="flex items-start gap-3 border-t border-background/15 pt-4">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-base font-light">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERIORS */}
      <section className="py-28 md:py-36 bg-background">
        <div className="container mx-auto px-8">
          <div className="max-w-3xl mb-16">
            <span className="editorial-eyebrow block mb-6">— 05 / Interiors</span>
            <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground text-balance">
              A space where vacation meets everyday comfort.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <motion.img {...fadeUp} src={interiorBathroom} alt="Modern bathroom with ocean view" className="w-full aspect-[4/5] object-cover" />
            <motion.img {...fadeUp} src={interiorLiving} alt="Living room with kitchen area" className="w-full aspect-[4/5] object-cover" />
          </div>
          <p className="mt-12 max-w-3xl text-base md:text-lg text-muted-foreground leading-relaxed font-light">
            Interiors are designed in a modern tropical style that combines elegance, natural materials, and maximum
            comfort.
          </p>
        </div>
      </section>

      {/* PROCESS */}
      <section className="py-28 md:py-36 bg-secondary/30">
        <div className="container mx-auto px-8">
          <div className="max-w-3xl mb-16">
            <span className="editorial-eyebrow block mb-6">— 06 / How it works</span>
            <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground text-balance mb-6">
              A managed development process with one clear goal.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-light">
              Island Nest Resort is a development project. Your villa is built progressively — this isn't an off-the-shelf
              purchase, but a controlled investment process under European-standard transparency.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div {...fadeUp} className="bg-background border border-border p-10">
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="h-6 w-6 text-primary" />
                <h3 className="font-serif text-2xl text-foreground">Step 1 — Reservation</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Reserve a specific villa</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Secure your spot in the resort</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Set the basic terms of cooperation</li>
              </ul>
            </motion.div>

            <motion.div {...fadeUp} className="bg-background border border-border p-10">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="h-6 w-6 text-primary" />
                <h3 className="font-serif text-2xl text-foreground">Step 2 — Construction</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Investment / construction agreement</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Payments tied to construction milestones</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Clearly defined schedule</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* INVESTMENT MODEL */}
      <section className="py-28 md:py-36 bg-background">
        <div className="container mx-auto px-8">
          <div className="max-w-3xl mb-16">
            <span className="editorial-eyebrow block mb-6">— 07 / Investment model</span>
            <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground text-balance mb-6">
              A simple, transparent payment plan in three construction phases.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-light">
              You pay progressively, in line with real construction progress.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {phases.map((phase, i) => (
              <motion.div
                key={phase.label}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                className="border border-border p-8 hover:border-primary/40 transition-colors"
              >
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phase {i + 1}</span>
                <p className="text-3xl font-serif text-primary my-4">{phase.amount}</p>
                <h3 className="font-serif text-xl text-foreground mb-5">{phase.label}</h3>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {phase.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 grid md:grid-cols-2 gap-8 bg-secondary/40 p-10 md:p-14">
            <div>
              <h3 className="font-serif text-2xl text-foreground mb-4">Project schedule</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex gap-2"><Sun className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Construction proceeds in phases</li>
                <li className="flex gap-2"><Sun className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Target completion by end of 2028</li>
                <li className="flex gap-2"><Sun className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Regular reporting for investors</li>
              </ul>
            </div>
            <div>
              <h3 className="font-serif text-2xl text-foreground mb-4">What this means for you</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Pay in line with real construction progress</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Full visibility into every project phase</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Investment tied to actual development</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Resort model unlocks rental income</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* RETURNS */}
      <section className="py-28 md:py-36 bg-foreground text-background">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-5">
              <span className="text-xs uppercase tracking-[0.2em] text-background/50 font-medium block mb-6">
                — 08 / Returns
              </span>
              <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-balance mb-6">
                Income potential built on data, not promises.
              </h2>
              <p className="text-base md:text-lg text-background/70 leading-relaxed font-light">
                These are realistic targets based on comparable resort projects — not guaranteed returns.
              </p>
            </div>

            <div className="md:col-span-7 grid sm:grid-cols-2 gap-6">
              <div className="border border-background/20 p-8">
                <TrendingUp className="h-8 w-8 text-primary mb-5" strokeWidth={1.5} />
                <p className="text-4xl font-serif mb-2">7–10%</p>
                <p className="text-sm text-background/70">Annual rental yield (target)</p>
              </div>
              <div className="border border-background/20 p-8">
                <Building2 className="h-8 w-8 text-primary mb-5" strokeWidth={1.5} />
                <p className="text-4xl font-serif mb-2">20–30%</p>
                <p className="text-sm text-background/70">Long-term property value growth</p>
              </div>

              <div className="sm:col-span-2 border border-background/20 p-8">
                <ConciergeBell className="h-7 w-7 text-primary mb-5" strokeWidth={1.5} />
                <h3 className="font-serif text-xl mb-4">Zero operational hassle</h3>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-background/75">
                  <div className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Booking management</div>
                  <div className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Villa maintenance</div>
                  <div className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Resort operations</div>
                  <div className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Security</div>
                </div>
              </div>

              <div className="sm:col-span-2 border border-background/20 p-8">
                <ShieldCheck className="h-7 w-7 text-primary mb-5" strokeWidth={1.5} />
                <h3 className="font-serif text-xl mb-4">Legal framework</h3>
                <ul className="space-y-2 text-sm text-background/75">
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Investment relations under Czech law</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Local contracts in English under Philippine law</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Long-term land lease (up to 75 years)</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Standard model for foreign investors</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT / CTA */}
      <section className="py-28 md:py-36 bg-background">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-6">
              <span className="editorial-eyebrow block mb-6">— 09 / Contact</span>
              <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground text-balance mb-6">
                Czech Republic representation
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-light mb-10">
                Island Nest Resort is a boutique development project for a limited group of investors. A personal
                approach and long-term vision are the foundation of our work.
              </p>

              <Button
                size="lg"
                onClick={() => setContactOpen(true)}
                className="bg-foreground text-background hover:bg-foreground/90 px-7 h-12 text-sm font-medium rounded-full group"
              >
                Request information
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            <div className="md:col-span-6 space-y-8">
              <div className="border-t border-border pt-6">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Island Nest Group</p>
                <div className="space-y-2 text-sm text-foreground">
                  <a href="tel:+420608656420" className="flex items-center gap-2.5 hover:text-primary transition-colors">
                    <Phone className="h-4 w-4" /> +420 608 65 64 20
                  </a>
                  <a href="mailto:info@islandnest-group.com" className="flex items-center gap-2.5 hover:text-primary transition-colors">
                    <Mail className="h-4 w-4" /> info@islandnest-group.com
                  </a>
                  <a href="https://www.islandnest-group.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:text-primary transition-colors">
                    <Globe className="h-4 w-4" /> www.islandnest-group.com
                  </a>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Head of Sales — Czech Republic</p>
                <p className="text-base font-serif text-foreground mb-2">Bc. Martin Halík</p>
                <div className="space-y-2 text-sm text-foreground">
                  <a href="tel:+420608656420" className="flex items-center gap-2.5 hover:text-primary transition-colors">
                    <Phone className="h-4 w-4" /> +420 608 65 64 20
                  </a>
                  <a href="mailto:martin.halik@islandnest-group.com" className="flex items-center gap-2.5 hover:text-primary transition-colors">
                    <Mail className="h-4 w-4" /> martin.halik@islandnest-group.com
                  </a>
                </div>
              </div>

              <div className="border-t border-border pt-6 text-xs text-muted-foreground leading-relaxed">
                <p className="font-medium text-foreground mb-1">ISLAND NEST DEVELOPMENTS INTERNATIONAL, s.r.o.</p>
                <p>Rybná 716/24, Staré Město, 110 00 Praha 1, Czech Republic</p>
                <p>Company ID: 238 26 550</p>
                <p className="mt-2">
                  Registered in the Commercial Register kept by the Municipal Court in Prague, Section C, Insert 433550.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
};

export default IslandNest;
