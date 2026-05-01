import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Fraunces', 'Didot', 'Georgia', 'serif'],
        display: ['Fraunces', 'Didot', 'Georgia', 'serif'],
      },
      fontSize: {
        'xs': '0.75rem',      // 12px
        'sm': '0.875rem',     // 14px
        'base': '1rem',       // 16px - zvýšeno z 14.4px
        'lg': '1.125rem',     // 18px - zvýšeno z 16px
        'xl': '1.25rem',      // 20px - zvýšeno z 17.6px
        '2xl': '1.5rem',      // 24px - zvýšeno z 20.8px
        '3xl': '1.875rem',    // 30px - zvýšeno z 25.6px
        '4xl': '2.25rem',     // 36px - zvýšeno z 32px
        '5xl': '3rem',        // 48px - zvýšeno z 40px
        '6xl': '3.75rem',     // 60px - zvýšeno z 48px
        '7xl': '4.5rem',      // 72px - zvýšeno z 56px
        '8xl': '6rem',        // 96px - zvýšeno z 64px
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
        crm: {
          primary: "hsl(var(--crm-primary))",
          "primary-light": "hsl(var(--crm-primary-light))",
          "primary-dark": "hsl(var(--crm-primary-dark))",
          "accent-green": "hsl(var(--crm-accent-green))",
          "accent-blue": "hsl(var(--crm-accent-blue))",
          "accent-orange": "hsl(var(--crm-accent-orange))",
          "accent-purple": "hsl(var(--crm-accent-purple))",
          "accent-teal": "hsl(var(--crm-accent-teal))",
          "accent-yellow": "hsl(var(--crm-accent-yellow))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "slide-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(30px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out",
        "slide-up": "slide-up 0.6s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
