import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface PrivacyPolicyDialogProps {
  children: ReactNode;
}

type Lang = "en" | "cs" | "es";

const T = {
  en: {
    title: "Privacy Policy – GO2DUBAI.ONLINE",
    s1: "1. Introduction",
    s1p1:
      'This Privacy Policy explains how PRESTON DEVELOPMENT FZ LLC, Licence: 5024998, with its registered office at Academic Zone 01 – Business Center 5, B12-428, RAKEZ Business Zone-FZ, Ras Al Khaimah, UAE (hereinafter referred to as the "Controller", "we", "us", or "our"), processes personal data of users of the platform.',
    s1p2:
      "GO2DUBAI.ONLINE is an online platform that enables users to search, book, and manage accommodation, as well as related services.",
    s1p3: "We process personal data in accordance with:",
    s1l: ["Regulation (EU) 2016/679 (GDPR)", "Applicable laws of the European Union and the Czech Republic"],
    s2: "2. Personal Data We Collect",
    s2p: "We may collect and process the following categories of personal data:",
    s2a: "a) Identification Data",
    s2al: ["Full name", "Date of birth", "Nationality"],
    s2b: "b) Contact Information",
    s2bl: ["Email address", "Phone number", "Residential address"],
    s2c: "c) Booking and Transaction Data",
    s2cl: ["Accommodation details", "Booking dates and duration", "Number of guests", "Pricing and payment details"],
    s2d: "d) Technical Data",
    s2dl: ["IP address", "Device and browser information", "Cookies and tracking data", "Platform usage logs"],
    s2e: "e) Payment Data",
    s2el: ["Payment information processed via third-party payment providers"],
    s3: "3. Purpose of Processing",
    s3p: "We process your personal data for the following purposes:",
    s3l: [
      "To create and manage user accounts",
      "To process bookings and fulfill contractual obligations",
      "To facilitate communication between users (guests and hosts)",
      "To process payments and issue invoices",
      "To improve our services and user experience",
      "To ensure platform security and prevent fraud",
      "To send marketing communications (with consent)",
      "To comply with legal obligations",
    ],
    s4: "4. Legal Basis for Processing",
    s4p: "We process personal data based on:",
    s4l: [
      "Performance of a contract (booking services)",
      "Compliance with legal obligations",
      "Legitimate interests (e.g., security, analytics, platform improvement)",
      "Consent (e.g., marketing communications, cookies)",
    ],
    s5: "5. Sharing of Personal Data",
    s5p: "Your personal data may be shared with:",
    s5l: [
      "Accommodation providers (hosts, property managers)",
      "Payment service providers",
      "IT and hosting service providers",
      "CRM and analytics tools",
      "Legal, tax, and accounting advisors",
      "Public authorities, where required by law",
    ],
    s6: "6. International Data Transfers",
    s6p1: "Some of our service providers may be located outside the European Economic Area (EEA).",
    s6p2: "In such cases, we ensure appropriate safeguards, including:",
    s6l: ["Standard Contractual Clauses (SCCs)", "Adequacy decisions where applicable"],
    s7: "7. Data Retention",
    s7p: "We retain personal data only for as long as necessary:",
    s7l: [
      "For the duration of the contractual relationship",
      "As required by applicable laws (e.g., accounting, tax obligations)",
      "For the protection of legal claims",
      "For marketing purposes until consent is withdrawn",
    ],
    s8: "8. Your Rights",
    s8p: "Under GDPR, you have the right to:",
    s8l: [
      "Access your personal data",
      "Rectify inaccurate or incomplete data",
      'Request deletion of your data ("right to be forgotten")',
      "Restrict processing",
      "Data portability",
      "Object to processing",
      "Withdraw consent at any time",
    ],
    s8c: "To exercise your rights, contact us at:",
    s8end: "You also have the right to lodge a complaint with a supervisory authority.",
    s9: "9. Cookies and Tracking Technologies",
    s9p: "GO2DUBAI.ONLINE uses cookies and similar technologies to:",
    s9l: ["Ensure proper functionality of the platform", "Analyze user behavior", "Personalize content and ads"],
    s9end: "You can manage your cookie preferences in your browser settings.",
    s10: "10. Data Security",
    s10p: "We implement appropriate technical and organizational measures to protect personal data, including:",
    s10l: ["Data encryption", "Secure servers and infrastructure", "Access control mechanisms", "Regular security audits"],
    s11: "11. User Roles and Platform-Specific Processing",
    s11p1:
      "Depending on your role on the GO2DUBAI.ONLINE platform (e.g., guest, host, property manager, investor, or partner), your data may be processed differently to enable platform functionality.",
    s11p2: "This includes:",
    s11l: [
      "Sharing booking details with hosts",
      "Managing property listings",
      "Tracking referrals and commissions (affiliate system)",
      "Internal CRM processing",
    ],
    s12: "12. Updates to This Privacy Policy",
    s12p1: "We may update this Privacy Policy from time to time.",
    s12p2: "The latest version will always be available on the GO2DUBAI.ONLINE platform.",
    s13: "13. Contact Information",
    s13p: "If you have any questions regarding this Privacy Policy or personal data processing, please contact:",
    s13addr: "Address: Academic Zone 01 – Business Center 5, B12-428, RAKEZ Business Zone-FZ, Ras Al Khaimah, UAE",
    s13email: "Email:",
  },
  cs: {
    title: "Zásady ochrany osobních údajů – GO2DUBAI.ONLINE",
    s1: "1. Úvod",
    s1p1:
      'Tyto zásady ochrany osobních údajů vysvětlují, jak společnost PRESTON DEVELOPMENT FZ LLC, Licence: 5024998, se sídlem Academic Zone 01 – Business Center 5, B12-428, RAKEZ Business Zone-FZ, Ras Al Khaimah, Spojené arabské emiráty (dále jen "Správce", "my", "nás" nebo "naše"), zpracovává osobní údaje uživatelů platformy.',
    s1p2:
      "GO2DUBAI.ONLINE je online platforma, která uživatelům umožňuje vyhledávat, rezervovat a spravovat ubytování a související služby.",
    s1p3: "Osobní údaje zpracováváme v souladu s:",
    s1l: ["Nařízením (EU) 2016/679 (GDPR)", "Platnými právními předpisy Evropské unie a České republiky"],
    s2: "2. Jaké osobní údaje shromažďujeme",
    s2p: "Můžeme shromažďovat a zpracovávat následující kategorie osobních údajů:",
    s2a: "a) Identifikační údaje",
    s2al: ["Celé jméno", "Datum narození", "Státní příslušnost"],
    s2b: "b) Kontaktní údaje",
    s2bl: ["E-mailová adresa", "Telefonní číslo", "Adresa bydliště"],
    s2c: "c) Údaje o rezervacích a transakcích",
    s2cl: ["Údaje o ubytování", "Termíny a délka rezervace", "Počet hostů", "Cena a platební údaje"],
    s2d: "d) Technické údaje",
    s2dl: ["IP adresa", "Informace o zařízení a prohlížeči", "Cookies a sledovací data", "Logy užívání platformy"],
    s2e: "e) Platební údaje",
    s2el: ["Platební informace zpracovávané prostřednictvím poskytovatelů plateb třetích stran"],
    s3: "3. Účel zpracování",
    s3p: "Vaše osobní údaje zpracováváme pro následující účely:",
    s3l: [
      "Vytváření a správa uživatelských účtů",
      "Zpracování rezervací a plnění smluvních povinností",
      "Zprostředkování komunikace mezi uživateli (hosté a hostitelé)",
      "Zpracování plateb a vystavování faktur",
      "Zlepšování našich služeb a uživatelského zážitku",
      "Zajištění bezpečnosti platformy a prevence podvodů",
      "Zasílání marketingové komunikace (se souhlasem)",
      "Plnění zákonných povinností",
    ],
    s4: "4. Právní základ zpracování",
    s4p: "Osobní údaje zpracováváme na základě:",
    s4l: [
      "Plnění smlouvy (rezervační služby)",
      "Plnění zákonných povinností",
      "Oprávněných zájmů (např. bezpečnost, analytika, vylepšování platformy)",
      "Souhlasu (např. marketingová komunikace, cookies)",
    ],
    s5: "5. Sdílení osobních údajů",
    s5p: "Vaše osobní údaje mohou být sdíleny s:",
    s5l: [
      "Poskytovateli ubytování (hostitelé, správci nemovitostí)",
      "Poskytovateli platebních služeb",
      "Poskytovateli IT a hostingu",
      "CRM a analytickými nástroji",
      "Právními, daňovými a účetními poradci",
      "Orgány veřejné moci, pokud to vyžaduje zákon",
    ],
    s6: "6. Mezinárodní předávání údajů",
    s6p1: "Někteří naši poskytovatelé služeb se mohou nacházet mimo Evropský hospodářský prostor (EHP).",
    s6p2: "V takových případech zajišťujeme odpovídající záruky, včetně:",
    s6l: ["Standardních smluvních doložek (SCC)", "Rozhodnutí o odpovídající úrovni ochrany, kde je to relevantní"],
    s7: "7. Doba uchovávání údajů",
    s7p: "Osobní údaje uchováváme pouze po dobu nezbytně nutnou:",
    s7l: [
      "Po dobu trvání smluvního vztahu",
      "Jak vyžadují platné právní předpisy (např. účetní, daňové povinnosti)",
      "Pro ochranu právních nároků",
      "Pro marketingové účely do odvolání souhlasu",
    ],
    s8: "8. Vaše práva",
    s8p: "Podle GDPR máte právo:",
    s8l: [
      "Přístupu k vašim osobním údajům",
      "Opravy nepřesných nebo neúplných údajů",
      'Požadovat výmaz vašich údajů ("právo být zapomenut")',
      "Omezení zpracování",
      "Přenositelnosti údajů",
      "Vznést námitku proti zpracování",
      "Kdykoliv odvolat souhlas",
    ],
    s8c: "Pro uplatnění svých práv nás kontaktujte na:",
    s8end: "Máte také právo podat stížnost u dozorového úřadu.",
    s9: "9. Cookies a sledovací technologie",
    s9p: "GO2DUBAI.ONLINE používá cookies a podobné technologie pro:",
    s9l: ["Zajištění správné funkčnosti platformy", "Analýzu chování uživatelů", "Personalizaci obsahu a reklam"],
    s9end: "Předvolby cookies můžete spravovat v nastavení svého prohlížeče.",
    s10: "10. Bezpečnost údajů",
    s10p: "Zavádíme odpovídající technická a organizační opatření k ochraně osobních údajů, včetně:",
    s10l: ["Šifrování dat", "Zabezpečených serverů a infrastruktury", "Mechanismů řízení přístupu", "Pravidelných bezpečnostních auditů"],
    s11: "11. Uživatelské role a specifické zpracování platformy",
    s11p1:
      "V závislosti na vaší roli na platformě GO2DUBAI.ONLINE (např. host, hostitel, správce nemovitosti, investor nebo partner) mohou být vaše údaje zpracovávány odlišně, aby byla umožněna funkčnost platformy.",
    s11p2: "To zahrnuje:",
    s11l: [
      "Sdílení detailů rezervace s hostiteli",
      "Správu nabídek nemovitostí",
      "Sledování doporučení a provizí (affiliate systém)",
      "Interní zpracování v CRM",
    ],
    s12: "12. Aktualizace těchto zásad",
    s12p1: "Tyto zásady ochrany osobních údajů můžeme čas od času aktualizovat.",
    s12p2: "Nejnovější verze bude vždy k dispozici na platformě GO2DUBAI.ONLINE.",
    s13: "13. Kontaktní informace",
    s13p: "Máte-li jakékoli dotazy ohledně těchto zásad nebo zpracování osobních údajů, kontaktujte:",
    s13addr: "Adresa: Academic Zone 01 – Business Center 5, B12-428, RAKEZ Business Zone-FZ, Ras Al Khaimah, UAE",
    s13email: "E-mail:",
  },
  es: {
    title: "Política de Privacidad – GO2DUBAI.ONLINE",
    s1: "1. Introducción",
    s1p1:
      'Esta Política de Privacidad explica cómo PRESTON DEVELOPMENT FZ LLC, Licencia: 5024998, con domicilio social en Academic Zone 01 – Business Center 5, B12-428, RAKEZ Business Zone-FZ, Ras Al Khaimah, Emiratos Árabes Unidos (en adelante, el "Responsable", "nosotros" o "nuestro"), trata los datos personales de los usuarios de la plataforma.',
    s1p2:
      "GO2DUBAI.ONLINE es una plataforma en línea que permite a los usuarios buscar, reservar y gestionar alojamientos, así como servicios relacionados.",
    s1p3: "Procesamos los datos personales de acuerdo con:",
    s1l: ["Reglamento (UE) 2016/679 (RGPD)", "Leyes aplicables de la Unión Europea y la República Checa"],
    s2: "2. Datos Personales que Recopilamos",
    s2p: "Podemos recopilar y procesar las siguientes categorías de datos personales:",
    s2a: "a) Datos de identificación",
    s2al: ["Nombre completo", "Fecha de nacimiento", "Nacionalidad"],
    s2b: "b) Información de contacto",
    s2bl: ["Dirección de correo electrónico", "Número de teléfono", "Dirección de residencia"],
    s2c: "c) Datos de reservas y transacciones",
    s2cl: ["Detalles del alojamiento", "Fechas y duración de la reserva", "Número de huéspedes", "Precio y datos de pago"],
    s2d: "d) Datos técnicos",
    s2dl: ["Dirección IP", "Información del dispositivo y navegador", "Cookies y datos de seguimiento", "Registros de uso de la plataforma"],
    s2e: "e) Datos de pago",
    s2el: ["Información de pago procesada a través de proveedores externos"],
    s3: "3. Finalidad del Tratamiento",
    s3p: "Procesamos sus datos personales para las siguientes finalidades:",
    s3l: [
      "Crear y gestionar cuentas de usuario",
      "Procesar reservas y cumplir obligaciones contractuales",
      "Facilitar la comunicación entre usuarios (huéspedes y anfitriones)",
      "Procesar pagos y emitir facturas",
      "Mejorar nuestros servicios y la experiencia del usuario",
      "Garantizar la seguridad de la plataforma y prevenir fraudes",
      "Enviar comunicaciones de marketing (con consentimiento)",
      "Cumplir con las obligaciones legales",
    ],
    s4: "4. Base Legal del Tratamiento",
    s4p: "Procesamos los datos personales sobre la base de:",
    s4l: [
      "Ejecución de un contrato (servicios de reserva)",
      "Cumplimiento de obligaciones legales",
      "Intereses legítimos (por ejemplo, seguridad, análisis, mejora de la plataforma)",
      "Consentimiento (por ejemplo, comunicaciones de marketing, cookies)",
    ],
    s5: "5. Compartir Datos Personales",
    s5p: "Sus datos personales pueden compartirse con:",
    s5l: [
      "Proveedores de alojamiento (anfitriones, gestores)",
      "Proveedores de servicios de pago",
      "Proveedores de TI y hosting",
      "Herramientas de CRM y analítica",
      "Asesores legales, fiscales y contables",
      "Autoridades públicas, cuando lo exija la ley",
    ],
    s6: "6. Transferencias Internacionales de Datos",
    s6p1: "Algunos de nuestros proveedores de servicios pueden estar ubicados fuera del Espacio Económico Europeo (EEE).",
    s6p2: "En tales casos, garantizamos las salvaguardas apropiadas, incluyendo:",
    s6l: ["Cláusulas Contractuales Estándar (CCE)", "Decisiones de adecuación cuando proceda"],
    s7: "7. Conservación de Datos",
    s7p: "Conservamos los datos personales solo durante el tiempo necesario:",
    s7l: [
      "Durante la relación contractual",
      "Según lo exijan las leyes aplicables (por ejemplo, contables, fiscales)",
      "Para la protección de reclamaciones legales",
      "Para fines de marketing hasta que se retire el consentimiento",
    ],
    s8: "8. Sus Derechos",
    s8p: "Bajo el RGPD, usted tiene derecho a:",
    s8l: [
      "Acceder a sus datos personales",
      "Rectificar datos inexactos o incompletos",
      'Solicitar la eliminación de sus datos ("derecho al olvido")',
      "Restringir el tratamiento",
      "Portabilidad de datos",
      "Oponerse al tratamiento",
      "Retirar el consentimiento en cualquier momento",
    ],
    s8c: "Para ejercer sus derechos, contáctenos en:",
    s8end: "También tiene derecho a presentar una reclamación ante una autoridad de control.",
    s9: "9. Cookies y Tecnologías de Seguimiento",
    s9p: "GO2DUBAI.ONLINE utiliza cookies y tecnologías similares para:",
    s9l: ["Garantizar el correcto funcionamiento de la plataforma", "Analizar el comportamiento del usuario", "Personalizar contenido y anuncios"],
    s9end: "Puede gestionar sus preferencias de cookies en la configuración de su navegador.",
    s10: "10. Seguridad de los Datos",
    s10p: "Implementamos medidas técnicas y organizativas adecuadas para proteger los datos personales, incluyendo:",
    s10l: ["Cifrado de datos", "Servidores e infraestructura seguros", "Mecanismos de control de acceso", "Auditorías de seguridad periódicas"],
    s11: "11. Roles de Usuario y Tratamiento Específico",
    s11p1:
      "Dependiendo de su rol en la plataforma GO2DUBAI.ONLINE (por ejemplo, huésped, anfitrión, gestor, inversor o socio), sus datos pueden tratarse de manera diferente para habilitar la funcionalidad de la plataforma.",
    s11p2: "Esto incluye:",
    s11l: [
      "Compartir detalles de reservas con anfitriones",
      "Gestionar listados de propiedades",
      "Seguimiento de referencias y comisiones (sistema de afiliados)",
      "Procesamiento interno en CRM",
    ],
    s12: "12. Actualizaciones de esta Política",
    s12p1: "Podemos actualizar esta Política de Privacidad de vez en cuando.",
    s12p2: "La versión más reciente estará siempre disponible en la plataforma GO2DUBAI.ONLINE.",
    s13: "13. Información de Contacto",
    s13p: "Si tiene alguna pregunta sobre esta Política de Privacidad o el tratamiento de datos, contacte:",
    s13addr: "Dirección: Academic Zone 01 – Business Center 5, B12-428, RAKEZ Business Zone-FZ, Ras Al Khaimah, UAE",
    s13email: "Email:",
  },
} as const;

const Bullets = ({ items }: { items: readonly string[] }) => (
  <ul className="mt-3 space-y-2">
    {items.map((i) => (
      <li key={i} className="flex gap-3 items-start text-sm text-muted-foreground font-light leading-relaxed">
        <span className="h-1 w-1 rounded-full mt-2 shrink-0" style={{ background: "hsl(var(--accent))" }} />
        <span>{i}</span>
      </li>
    ))}
  </ul>
);

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
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium">
          — {String(num).padStart(2, "0")}
        </span>
      </div>
      <div className="md:col-span-10">
        <h3 className="editorial-headline text-2xl md:text-3xl text-foreground leading-tight text-balance">
          {title.replace(/^\d+\.\s*/, "")}
        </h3>
      </div>
    </div>
    <div className="md:ml-[16.666%] space-y-3">{children}</div>
  </section>
);

export function PrivacyPolicyDialog({ children }: PrivacyPolicyDialogProps) {
  const { i18n } = useTranslation();
  const lang = (["en", "cs", "es"].includes(i18n.language) ? i18n.language : "en") as Lang;
  const t = T[lang];

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 gap-0 bg-background border-border overflow-hidden">
        {/* Editorial dark hero header */}
        <DialogHeader className="bg-foreground text-background px-8 md:px-12 py-10 md:py-12 space-y-4 text-left border-b-0">
          <span className="text-xs uppercase tracking-[0.3em] text-background/60 font-medium">
            — Legal
          </span>
          <DialogTitle className="editorial-headline text-2xl md:text-4xl text-balance leading-[1.1] text-background">
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-8 md:px-12 py-12 max-h-[calc(92vh-200px)]">
          <div className="space-y-12 max-w-4xl mx-auto">
            <Section num={1} title={t.s1}>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s1p1}</p>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s1p2}</p>
              <p className="text-foreground font-medium pt-2">{t.s1p3}</p>
              <Bullets items={t.s1l} />
            </Section>

            <Section num={2} title={t.s2}>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s2p}</p>

              <h4 className="font-serif text-base text-foreground mt-6">{t.s2a}</h4>
              <Bullets items={t.s2al} />
              <h4 className="font-serif text-base text-foreground mt-6">{t.s2b}</h4>
              <Bullets items={t.s2bl} />
              <h4 className="font-serif text-base text-foreground mt-6">{t.s2c}</h4>
              <Bullets items={t.s2cl} />
              <h4 className="font-serif text-base text-foreground mt-6">{t.s2d}</h4>
              <Bullets items={t.s2dl} />
              <h4 className="font-serif text-base text-foreground mt-6">{t.s2e}</h4>
              <Bullets items={t.s2el} />
            </Section>

            <Section num={3} title={t.s3}>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s3p}</p>
              <Bullets items={t.s3l} />
            </Section>

            <Section num={4} title={t.s4}>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s4p}</p>
              <Bullets items={t.s4l} />
            </Section>

            <Section num={5} title={t.s5}>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s5p}</p>
              <Bullets items={t.s5l} />
            </Section>

            <Section num={6} title={t.s6}>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s6p1}</p>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s6p2}</p>
              <Bullets items={t.s6l} />
            </Section>

            <Section num={7} title={t.s7}>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s7p}</p>
              <Bullets items={t.s7l} />
            </Section>

            <Section num={8} title={t.s8}>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s8p}</p>
              <Bullets items={t.s8l} />
              <p className="text-muted-foreground font-light leading-relaxed pt-3">
                {t.s8c}{" "}
                <a
                  href="mailto:info@go2dubai.online"
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                  style={{ color: "hsl(var(--accent))" }}
                >
                  info@go2dubai.online
                </a>
              </p>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s8end}</p>
            </Section>

            <Section num={9} title={t.s9}>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s9p}</p>
              <Bullets items={t.s9l} />
              <p className="text-muted-foreground font-light leading-relaxed">{t.s9end}</p>
            </Section>

            <Section num={10} title={t.s10}>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s10p}</p>
              <Bullets items={t.s10l} />
            </Section>

            <Section num={11} title={t.s11}>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s11p1}</p>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s11p2}</p>
              <Bullets items={t.s11l} />
            </Section>

            <Section num={12} title={t.s12}>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s12p1}</p>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s12p2}</p>
            </Section>

            <Section num={13} title={t.s13}>
              <p className="text-muted-foreground font-light leading-relaxed">{t.s13p}</p>
              <div className="mt-6 border border-border p-6 md:p-8 bg-secondary/40">
                <p className="font-serif text-lg text-foreground mb-3">PRESTON DEVELOPMENT FZ LLC</p>
                <p className="text-sm text-muted-foreground font-light">
                  {t.s13email}{" "}
                  <a
                    href="mailto:info@produbai.eu"
                    className="underline underline-offset-4 hover:text-foreground transition-colors"
                    style={{ color: "hsl(var(--accent))" }}
                  >
                    info@produbai.eu
                  </a>
                </p>
                <p className="text-sm text-muted-foreground font-light mt-2 leading-relaxed">
                  {t.s13addr}
                </p>
              </div>
            </Section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
