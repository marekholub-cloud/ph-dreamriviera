import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface TermsOfServiceDialogProps {
  children: ReactNode;
}

type Lang = "en" | "cs" | "es";

const T = {
  en: {
    eyebrow: "Legal",
    title: "Terms of Service",
    subtitle: "GO2DUBAI.ONLINE",
    intro:
      'These Terms of Service ("Terms") govern your access to and use of the GO2DUBAI.ONLINE platform (the "Platform"), operated by the company below. The Platform enables users to list, discover, and book villas and other accommodation in Dubai. By accessing or using the Platform, you agree to be bound by these Terms.',
    company: "PRESTON DEVELOPMENT FZ LLC",
    cid: "Licence: 5024998",
    creg: "Academic Zone 01 – Business Center 5, B12-428, RAKEZ Business Zone-FZ",
    caddr: "Registered office: Ras Al Khaimah, UAE",
    sections: [
      ["Introduction", "These Terms govern your access to and use of GO2DUBAI.ONLINE. By using the Platform, you agree to comply with them in full."],
      ["Nature of the Service", "GO2DUBAI.ONLINE is an online marketplace platform connecting hosts and guests. The Company does not own or operate properties and acts only as an intermediary."],
      ["User Accounts", "Users must provide accurate information and are responsible for all activity that occurs under their account."],
      ["Booking Process", "Confirmed bookings create a binding agreement directly between Guest and Host."],
      ["Payments", "Payments are securely processed via third-party providers."],
      ["Cancellations and Refunds", "Cancellation and refund terms are defined by each Host and disclosed before booking."],
      ["Host Obligations", "Hosts must provide accurate listings, maintain their property, and comply with all applicable laws."],
      ["Guest Obligations", "Guests must respect property rules, neighbors, and applicable regulations, and are liable for any damages caused."],
      ["Platform Fees", "Service fees may apply and will be clearly disclosed before any transaction is completed."],
      ["Liability Disclaimer", "The Company is not liable for property conditions, host or guest actions, or any indirect damages."],
      ["Insurance", "No insurance coverage is provided by the Platform. Users are responsible for their own coverage."],
      ["Prohibited Activities", "Fraud, misrepresentation, harassment, or attempts to bypass the Platform are strictly prohibited."],
      ["Reviews and Content", "By submitting content, users grant the Platform a non-exclusive license to display and distribute it."],
      ["Termination", "Accounts may be suspended or terminated for violation of these Terms or applicable laws."],
      ["Dispute Resolution", "Disputes should first be resolved directly between users; the Platform may assist as a mediator."],
      ["Governing Law", "These Terms are governed by the laws of the Czech Republic."],
      ["Changes to Terms", "We may update these Terms at any time. Continued use of the Platform constitutes acceptance."],
    ] as const,
    contactTitle: "Contact",
    contactAddr: "PRESTON DEVELOPMENT FZ LLC, Academic Zone 01 – Business Center 5, B12-428, RAKEZ Business Zone-FZ, Ras Al Khaimah, UAE",
    emailLbl: "Email",
  },
  cs: {
    eyebrow: "Právní informace",
    title: "Obchodní podmínky",
    subtitle: "GO2DUBAI.ONLINE",
    intro:
      'Tyto obchodní podmínky ("Podmínky") upravují váš přístup k platformě GO2DUBAI.ONLINE ("Platforma") a její používání. Platforma umožňuje uživatelům nabízet, objevovat a rezervovat vily a další ubytování v Dubaji. Přístupem k Platformě nebo jejím používáním souhlasíte s těmito Podmínkami.',
    company: "PRESTON DEVELOPMENT FZ LLC",
    cid: "Licence: 5024998",
    creg: "Academic Zone 01 – Business Center 5, B12-428, RAKEZ Business Zone-FZ",
    caddr: "Sídlo: Ras Al Khaimah, Spojené arabské emiráty",
    sections: [
      ["Úvod", "Tyto Podmínky upravují váš přístup k platformě GO2DUBAI.ONLINE. Používáním Platformy s nimi v plném rozsahu souhlasíte."],
      ["Povaha služby", "GO2DUBAI.ONLINE je online tržní platforma propojující hostitele a hosty. Společnost nevlastní ani neprovozuje nemovitosti a vystupuje pouze jako zprostředkovatel."],
      ["Uživatelské účty", "Uživatelé musí uvádět přesné informace a odpovídají za veškerou aktivitu na svém účtu."],
      ["Proces rezervace", "Potvrzené rezervace vytvářejí závaznou dohodu přímo mezi Hostem a Hostitelem."],
      ["Platby", "Platby jsou bezpečně zpracovávány prostřednictvím poskytovatelů třetích stran."],
      ["Zrušení a vrácení peněz", "Storno podmínky určuje každý Hostitel a jsou zveřejněny před rezervací."],
      ["Povinnosti hostitele", "Hostitelé musí poskytovat přesné nabídky, udržovat nemovitost a dodržovat platné zákony."],
      ["Povinnosti hosta", "Hosté musí respektovat pravidla nemovitosti, sousedy a platné předpisy a odpovídají za způsobené škody."],
      ["Poplatky platformy", "Mohou být účtovány servisní poplatky, které budou jasně uvedeny před dokončením transakce."],
      ["Vyloučení odpovědnosti", "Společnost neodpovídá za stav nemovitostí, jednání uživatelů ani za jakékoli nepřímé škody."],
      ["Pojištění", "Platforma neposkytuje žádné pojištění. Uživatelé si zajišťují vlastní krytí."],
      ["Zakázané činnosti", "Podvod, klamavé jednání, obtěžování nebo obcházení Platformy je přísně zakázáno."],
      ["Recenze a obsah", "Odesláním obsahu udělují uživatelé Platformě nevýhradní licenci k jeho zobrazování a šíření."],
      ["Ukončení", "Účty mohou být pozastaveny nebo zrušeny v případě porušení těchto Podmínek nebo zákonů."],
      ["Řešení sporů", "Spory by měly být primárně řešeny mezi uživateli; Platforma může vystupovat jako mediátor."],
      ["Rozhodné právo", "Tyto Podmínky se řídí právem České republiky."],
      ["Změny podmínek", "Tyto Podmínky můžeme kdykoli aktualizovat. Pokračující používání Platformy znamená jejich přijetí."],
    ] as const,
    contactTitle: "Kontakt",
    contactAddr: "PRESTON DEVELOPMENT FZ LLC, Academic Zone 01 – Business Center 5, B12-428, RAKEZ Business Zone-FZ, Ras Al Khaimah, UAE",
    emailLbl: "E-mail",
  },
  es: {
    eyebrow: "Legal",
    title: "Términos del Servicio",
    subtitle: "GO2DUBAI.ONLINE",
    intro:
      'Estos Términos del Servicio ("Términos") rigen su acceso y uso de la plataforma GO2DUBAI.ONLINE (la "Plataforma"). La Plataforma permite a los usuarios publicar, descubrir y reservar villas y otros alojamientos en Dubái. Al acceder o utilizar la Plataforma, usted acepta estar sujeto a estos Términos.',
    company: "PRESTON DEVELOPMENT FZ LLC",
    cid: "Licencia: 5024998",
    creg: "Academic Zone 01 – Business Center 5, B12-428, RAKEZ Business Zone-FZ",
    caddr: "Domicilio social: Ras Al Khaimah, Emiratos Árabes Unidos",
    sections: [
      ["Introducción", "Estos Términos rigen su acceso y uso de GO2DUBAI.ONLINE. Al utilizar la Plataforma, acepta cumplirlos en su totalidad."],
      ["Naturaleza del Servicio", "GO2DUBAI.ONLINE es una plataforma de mercado en línea que conecta a anfitriones y huéspedes. La Compañía no posee ni opera propiedades y actúa únicamente como intermediario."],
      ["Cuentas de Usuario", "Los usuarios deben proporcionar información precisa y son responsables de toda actividad realizada en su cuenta."],
      ["Proceso de Reserva", "Las reservas confirmadas crean un acuerdo vinculante directamente entre Huésped y Anfitrión."],
      ["Pagos", "Los pagos se procesan de forma segura a través de proveedores externos."],
      ["Cancelaciones y Reembolsos", "Las condiciones de cancelación las define cada Anfitrión y se comunican antes de reservar."],
      ["Obligaciones del Anfitrión", "Los anfitriones deben ofrecer listados precisos, mantener la propiedad y cumplir las leyes aplicables."],
      ["Obligaciones del Huésped", "Los huéspedes deben respetar las reglas, vecinos y normativas, y son responsables de los daños causados."],
      ["Tarifas de la Plataforma", "Pueden aplicarse tarifas de servicio, que se mostrarán claramente antes de completar la transacción."],
      ["Exención de Responsabilidad", "La Compañía no se hace responsable del estado de las propiedades, acciones de usuarios ni daños indirectos."],
      ["Seguro", "La Plataforma no proporciona ningún seguro. Los usuarios son responsables de su propia cobertura."],
      ["Actividades Prohibidas", "Se prohíbe el fraude, tergiversación, acoso o cualquier intento de eludir la Plataforma."],
      ["Reseñas y Contenido", "Al enviar contenido, los usuarios otorgan a la Plataforma una licencia no exclusiva para mostrarlo y distribuirlo."],
      ["Terminación", "Las cuentas pueden suspenderse o cerrarse por incumplimiento de estos Términos o de la ley."],
      ["Resolución de Disputas", "Las disputas deben resolverse primero entre los usuarios; la Plataforma puede actuar como mediadora."],
      ["Ley Aplicable", "Estos Términos se rigen por las leyes de la República Checa."],
      ["Cambios en los Términos", "Podemos actualizar estos Términos en cualquier momento. El uso continuado implica su aceptación."],
    ] as const,
    contactTitle: "Contacto",
    contactAddr: "PRESTON DEVELOPMENT FZ LLC, Academic Zone 01 – Business Center 5, B12-428, RAKEZ Business Zone-FZ, Ras Al Khaimah, UAE",
    emailLbl: "Email",
  },
} as const;

const Section = ({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: ReactNode;
}) => (
  <section className="border-t border-border pt-10 first:border-t-0 first:pt-0">
    <div className="grid md:grid-cols-12 gap-6 mb-4">
      <div className="md:col-span-2">
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          — {String(num).padStart(2, "0")}
        </span>
      </div>
      <div className="md:col-span-10">
        <h3 className="editorial-headline text-2xl md:text-3xl text-foreground">
          {title}
        </h3>
      </div>
    </div>
    <div className="md:ml-[16.666%] space-y-3 text-foreground/70 font-light leading-relaxed">
      {children}
    </div>
  </section>
);

export function TermsOfServiceDialog({ children }: TermsOfServiceDialogProps) {
  const { i18n } = useTranslation();
  const lang = (["en", "cs", "es"].includes(i18n.language) ? i18n.language : "en") as Lang;
  const t = T[lang];

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden gap-0">
        {/* Hero header */}
        <div className="bg-foreground text-background px-8 md:px-12 pt-12 pb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-background/60 mb-4">
            {t.eyebrow}
          </p>
          <h2 className="editorial-headline text-4xl md:text-5xl leading-[1.05]">
            {t.title}
          </h2>
          <p className="mt-3 text-background/70 text-sm tracking-wide">
            {t.subtitle}
          </p>
        </div>

        <ScrollArea className="h-[calc(92vh-220px)]">
          <div className="px-8 md:px-12 py-12 space-y-12">
            {/* Intro + company */}
            <div className="grid md:grid-cols-12 gap-6">
              <div className="md:col-span-2">
                <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  — 00
                </span>
              </div>
              <div className="md:col-span-10 space-y-6">
                <p className="text-base md:text-lg text-foreground/80 font-light leading-relaxed">
                  {t.intro}
                </p>
                <div className="border-l-2 border-accent pl-5 py-1 space-y-1">
                  <p className="font-medium text-foreground">{t.company}</p>
                  <p className="text-sm text-muted-foreground">{t.cid}</p>
                  <p className="text-sm text-muted-foreground">{t.creg}</p>
                  <p className="text-sm text-muted-foreground">{t.caddr}</p>
                </div>
              </div>
            </div>

            {t.sections.map(([title, body], i) => (
              <Section key={title} num={i + 1} title={title}>
                <p>{body}</p>
              </Section>
            ))}

            {/* Contact */}
            <Section num={t.sections.length + 1} title={t.contactTitle}>
              <p>{t.contactAddr}</p>
              <p>
                <span className="text-muted-foreground">{t.emailLbl}: </span>
                <a
                  href="mailto:info@produbai.eu"
                  className="text-accent hover:underline underline-offset-4"
                >
                  info@produbai.eu
                </a>
              </p>
            </Section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
