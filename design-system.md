# 🎨 Design System Export - Admin Panel

Tento dokument obsahuje kompletní design systém admin panelu pro přenos do jiných projektů.

---

## 📋 Obsah

1. [Přehled](#přehled)
2. [Fonty](#fonty)
3. [CSS Proměnné](#css-proměnné)
4. [Tailwind Konfigurace](#tailwind-konfigurace)
5. [Scrollbar Styling](#scrollbar-styling)
6. [Animace](#animace)
7. [Závislosti](#závislosti)
8. [Instrukce pro integraci](#instrukce-pro-integraci)
9. [Quick Reference](#quick-reference)

---

## Přehled

Design systém je postaven na:
- **Dark elegant theme** inspirovaný luxusními real estate weby
- **HSL barevný systém** pro snadnou úpravu
- **Tailwind CSS** s custom tokens
- **shadcn/ui** komponenty

### Soubory k přenosu:
| Soubor | Popis |
|--------|-------|
| `index.html` | Google Fonts odkazy |
| `src/index.css` | CSS proměnné a globální styly |
| `tailwind.config.ts` | Rozšíření Tailwind konfigurace |

---

## Fonty

### Google Fonts - vložit do `<head>` v `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap" rel="stylesheet">
```

### Font Stack:
- **Sans-serif (UI):** `'Nunito Sans', 'Segoe UI', system-ui, sans-serif`
- **Serif (Headings):** `'Bodoni Moda', 'Playfair Display', Georgia, serif`

---

## CSS Proměnné

### Vložit do `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Dark elegant theme - All colors MUST be HSL */

@layer base {
  :root {
    /* ═══════════════════════════════════════════════════════════
       ZÁKLADNÍ BARVY
       ═══════════════════════════════════════════════════════════ */
    --background: 220 15% 8%;
    --foreground: 45 20% 95%;

    --card: 220 15% 12%;
    --card-foreground: 45 20% 95%;

    --popover: 220 15% 12%;
    --popover-foreground: 45 20% 95%;

    --primary: 42 50% 55%;
    --primary-foreground: 220 15% 8%;

    --secondary: 220 12% 18%;
    --secondary-foreground: 45 20% 95%;

    --muted: 220 12% 25%;
    --muted-foreground: 45 10% 60%;

    --accent: 42 50% 55%;
    --accent-foreground: 220 15% 8%;

    --destructive: 0 65% 55%;
    --destructive-foreground: 45 20% 95%;

    --border: 220 12% 20%;
    --input: 220 12% 20%;
    --ring: 42 50% 55%;

    --radius: 0.5rem;

    /* ═══════════════════════════════════════════════════════════
       SIDEBAR
       ═══════════════════════════════════════════════════════════ */
    --sidebar-background: 220 15% 10%;
    --sidebar-foreground: 45 20% 95%;
    --sidebar-primary: 42 50% 55%;
    --sidebar-primary-foreground: 220 15% 8%;
    --sidebar-accent: 220 12% 18%;
    --sidebar-accent-foreground: 45 20% 95%;
    --sidebar-border: 220 12% 20%;
    --sidebar-ring: 42 50% 55%;

    /* ═══════════════════════════════════════════════════════════
       EFEKTY
       ═══════════════════════════════════════════════════════════ */
    --gradient-radial: radial-gradient(circle at top, hsl(220 15% 12%), hsl(220 15% 8%));
    --transition-smooth: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    
    /* ═══════════════════════════════════════════════════════════
       LUXURY GOLD VARIANTY
       ═══════════════════════════════════════════════════════════ */
    --gold: 42 70% 50%;
    --gold-light: 42 60% 65%;
    --gold-dark: 42 50% 35%;
    --gold-muted: 42 30% 45%;
    
    /* ═══════════════════════════════════════════════════════════
       STATUS COLORS
       Pro indikaci stavu leadů, uživatelů apod.
       ═══════════════════════════════════════════════════════════ */
    --status-premium: 42 70% 50%;      /* Zlatá - Premium */
    --status-vip: 280 60% 55%;         /* Fialová - VIP */
    --status-client: 160 60% 45%;      /* Zelená - Client */
    --status-qualified: 200 70% 50%;   /* Modrá - Qualified */
    --status-lead: 30 70% 50%;         /* Oranžová - Lead */
    --status-visitor: 220 40% 50%;     /* Šedá-modrá - Visitor */

    /* ═══════════════════════════════════════════════════════════
       CRM ACCENT COLORS (Hoomeee UI Kit style)
       ═══════════════════════════════════════════════════════════ */
    --crm-primary: 152 69% 31%;
    --crm-primary-light: 152 69% 45%;
    --crm-primary-dark: 152 69% 20%;
    --crm-accent-green: 145 65% 39%;
    --crm-accent-blue: 207 90% 54%;
    --crm-accent-orange: 27 98% 54%;
    --crm-accent-purple: 263 70% 50%;
    --crm-accent-teal: 174 72% 40%;
    --crm-accent-yellow: 45 93% 47%;
    
    /* ═══════════════════════════════════════════════════════════
       CARD GRADIENT BACKGROUNDS
       Pro gradient karty v dashboardu
       ═══════════════════════════════════════════════════════════ */
    --card-green-start: 152 69% 25%;
    --card-green-end: 152 50% 18%;
    --card-blue-start: 207 75% 35%;
    --card-blue-end: 207 60% 22%;
    --card-orange-start: 27 80% 40%;
    --card-orange-end: 27 60% 25%;
    --card-dark-start: 220 15% 18%;
    --card-dark-end: 220 15% 12%;

    /* ═══════════════════════════════════════════════════════════
       ADMIN SECTION COLORS
       Pro barevné rozlišení sekcí v administraci
       ═══════════════════════════════════════════════════════════ */
    --admin-system: 215 20% 50%;
    --admin-system-muted: 215 15% 25%;
    --admin-events: 207 90% 54%;
    --admin-events-muted: 207 50% 20%;
    --admin-clients: 152 69% 40%;
    --admin-clients-muted: 152 50% 18%;
    --admin-content: 27 98% 54%;
    --admin-content-muted: 27 50% 20%;
    --admin-leads: 350 70% 55%;
    --admin-leads-muted: 350 50% 20%;
    --admin-stats: 174 72% 45%;
    --admin-stats-muted: 174 50% 18%;
    --admin-deals: 45 93% 50%;
    --admin-deals-muted: 45 50% 20%;

    /* ═══════════════════════════════════════════════════════════
       CRM/DASHBOARD ENHANCEMENT TOKENS
       ═══════════════════════════════════════════════════════════ */
    --sidebar-hover: 152 30% 18%;
    --sidebar-active: 152 69% 31%;
    --header-glass: 220 15% 10% / 0.9;
    --card-elevated: 220 15% 14%;
    --card-highlight: 152 30% 15%;
    --success: 145 65% 39%;
    --success-muted: 145 40% 18%;
    --warning: 27 98% 54%;
    --warning-muted: 27 50% 18%;
    --info: 207 90% 54%;
    --info-muted: 207 50% 18%;
  }

  /* Dark mode (stejné jako root pro dark-first přístup) */
  .dark {
    --background: 220 15% 8%;
    --foreground: 45 20% 95%;
    --card: 220 15% 12%;
    --card-foreground: 45 20% 95%;
    --popover: 220 15% 12%;
    --popover-foreground: 45 20% 95%;
    --primary: 42 50% 55%;
    --primary-foreground: 220 15% 8%;
    --secondary: 220 12% 18%;
    --secondary-foreground: 45 20% 95%;
    --muted: 220 12% 25%;
    --muted-foreground: 45 10% 60%;
    --accent: 42 50% 55%;
    --accent-foreground: 220 15% 8%;
    --destructive: 0 65% 55%;
    --destructive-foreground: 45 20% 95%;
    --border: 220 12% 20%;
    --input: 220 12% 20%;
    --ring: 42 50% 55%;
    --sidebar-background: 220 15% 10%;
    --sidebar-foreground: 45 20% 95%;
    --sidebar-primary: 42 50% 55%;
    --sidebar-primary-foreground: 220 15% 8%;
    --sidebar-accent: 220 12% 18%;
    --sidebar-accent-foreground: 45 20% 95%;
    --sidebar-border: 220 12% 20%;
    --sidebar-ring: 42 50% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}
```

---

## Scrollbar Styling

### Vložit na konec `src/index.css`:

```css
/* Custom scrollbar for dark theme */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: hsl(220 15% 8%);
}

::-webkit-scrollbar-thumb {
  background: hsl(220 12% 25%);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(42 50% 55%);
}
```

---

## Animace

### Infinite scroll animace pro carousely:

```css
/* Infinite scroll animation */
@keyframes scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.animate-scroll {
  animation: scroll 30s linear infinite;
}

.animate-scroll:hover {
  animation-play-state: paused;
}
```

---

## Tailwind Konfigurace

### Merge do `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Nunito Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
        serif: ['Bodoni Moda', 'Playfair Display', 'Georgia', 'serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Luxury gold
        gold: {
          DEFAULT: "hsl(var(--gold))",
          light: "hsl(var(--gold-light))",
          dark: "hsl(var(--gold-dark))",
          muted: "hsl(var(--gold-muted))",
        },
        // Status colors
        status: {
          premium: "hsl(var(--status-premium))",
          vip: "hsl(var(--status-vip))",
          client: "hsl(var(--status-client))",
          qualified: "hsl(var(--status-qualified))",
          lead: "hsl(var(--status-lead))",
          visitor: "hsl(var(--status-visitor))",
        },
        // CRM colors
        crm: {
          primary: "hsl(var(--crm-primary))",
          "primary-light": "hsl(var(--crm-primary-light))",
          "primary-dark": "hsl(var(--crm-primary-dark))",
          green: "hsl(var(--crm-accent-green))",
          blue: "hsl(var(--crm-accent-blue))",
          orange: "hsl(var(--crm-accent-orange))",
          purple: "hsl(var(--crm-accent-purple))",
          teal: "hsl(var(--crm-accent-teal))",
          yellow: "hsl(var(--crm-accent-yellow))",
        },
        // Admin section colors
        admin: {
          system: "hsl(var(--admin-system))",
          "system-muted": "hsl(var(--admin-system-muted))",
          events: "hsl(var(--admin-events))",
          "events-muted": "hsl(var(--admin-events-muted))",
          clients: "hsl(var(--admin-clients))",
          "clients-muted": "hsl(var(--admin-clients-muted))",
          content: "hsl(var(--admin-content))",
          "content-muted": "hsl(var(--admin-content-muted))",
          leads: "hsl(var(--admin-leads))",
          "leads-muted": "hsl(var(--admin-leads-muted))",
          stats: "hsl(var(--admin-stats))",
          "stats-muted": "hsl(var(--admin-stats-muted))",
          deals: "hsl(var(--admin-deals))",
          "deals-muted": "hsl(var(--admin-deals-muted))",
        },
        // Dashboard tokens
        success: {
          DEFAULT: "hsl(var(--success))",
          muted: "hsl(var(--success-muted))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          muted: "hsl(var(--warning-muted))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          muted: "hsl(var(--info-muted))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.6s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

## Závislosti

### NPM balíčky k instalaci:

```bash
npm install tailwindcss-animate
# nebo
bun add tailwindcss-animate
```

---

## Instrukce pro integraci

### Krok 1: Fonty
1. Otevřete `index.html`
2. Vložte Google Fonts `<link>` tagy do `<head>` sekce

### Krok 2: CSS Proměnné
1. Otevřete `src/index.css`
2. Nahraďte nebo sloučte CSS proměnné v `:root` a `.dark`
3. Přidejte scrollbar styling na konec souboru

### Krok 3: Tailwind Config
1. Otevřete `tailwind.config.ts`
2. Merge `extend` sekci s existující konfigurací
3. Přidejte `tailwindcss-animate` do plugins

### Krok 4: Závislosti
```bash
npm install tailwindcss-animate
```

### Krok 5: Restartujte dev server
```bash
npm run dev
```

---

## Quick Reference

### Základní barvy
| Token | Hodnota HSL | Použití |
|-------|-------------|---------|
| `--background` | `220 15% 8%` | Hlavní pozadí |
| `--foreground` | `45 20% 95%` | Hlavní text |
| `--primary` | `42 50% 55%` | Zlatá - akční prvky |
| `--secondary` | `220 12% 18%` | Sekundární pozadí |
| `--muted` | `220 12% 25%` | Tlumené pozadí |
| `--card` | `220 15% 12%` | Karty |

### Admin sekce
| Token | Barva | Sekce |
|-------|-------|-------|
| `--admin-system` | Šedá | Systémové nastavení |
| `--admin-events` | Modrá | Události |
| `--admin-clients` | Zelená | Klienti |
| `--admin-content` | Oranžová | Obsah |
| `--admin-leads` | Červená | Leady |
| `--admin-stats` | Teal | Statistiky |
| `--admin-deals` | Žlutá | Obchody |

### Status barvy
| Token | Barva | Status |
|-------|-------|--------|
| `--status-premium` | Zlatá | Premium uživatel |
| `--status-vip` | Fialová | VIP |
| `--status-client` | Zelená | Klient |
| `--status-qualified` | Modrá | Kvalifikovaný |
| `--status-lead` | Oranžová | Lead |
| `--status-visitor` | Šedo-modrá | Návštěvník |

### Tailwind třídy - příklady
```tsx
// Pozadí
<div className="bg-background" />
<div className="bg-card" />
<div className="bg-secondary" />

// Text
<p className="text-foreground" />
<p className="text-muted-foreground" />
<p className="text-primary" />

// Admin sekce
<div className="bg-admin-clients-muted text-admin-clients" />
<div className="bg-admin-leads-muted text-admin-leads" />

// Status badge
<span className="bg-status-premium/20 text-status-premium" />
<span className="bg-status-client/20 text-status-client" />

// CRM barvy
<div className="bg-crm-primary" />
<div className="text-crm-blue" />

// Gold akcenty
<span className="text-gold" />
<div className="border-gold-dark" />
```

---

## 📝 Poznámky

- Všechny barvy jsou v **HSL formátu** pro snadnou úpravu
- Design je **dark-first** - light mode vyžaduje dodatečnou konfiguraci
- Pro komponenty jako `StatCard`, `CircularProgress` apod. zkopírujte celé soubory z `src/components/admin/`

---

*Vytvořeno: 2026-01-02*
*Verze: 1.0*
