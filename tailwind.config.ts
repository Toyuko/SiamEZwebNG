import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic (theme-aware via CSS vars in globals.css)
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        border: "var(--border)",
        "header-bg": "var(--header-bg)",
        "header-border": "var(--header-border)",
        "header-text": "var(--header-text)",
        "header-text-muted": "var(--header-text-muted)",
        input: "var(--input)",
        "input-border": "var(--input-border)",
        overlay: "var(--overlay)",
        ring: "var(--ring)",
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        // Brand – preserved siam.blue / siam.yellow (CSS var single source)
        siam: {
          blue: {
            DEFAULT: "var(--siam-blue)",
            light: "var(--siam-blue-light)",
            dark: "var(--siam-blue-dark)",
            bright: "var(--siam-blue-bright)",
          },
          yellow: {
            DEFAULT: "var(--siam-yellow)",
            light: "var(--siam-yellow-light)",
            dark: "var(--siam-yellow-dark)",
          },
          gray: {
            DEFAULT: "#374151",
            light: "#6b7280",
            dark: "#1f2937",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        "display-lg": ["clamp(2.25rem, 5vw, 3.5rem)", { lineHeight: "1.15" }],
        "display-md": ["clamp(1.875rem, 4vw, 2.5rem)", { lineHeight: "1.2" }],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "skeleton-pulse": {
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-out forwards",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "fade-in-scale": "fade-in-scale 0.5s ease-out forwards",
        "slide-in-right": "slide-in-right 0.6s ease-out forwards",
        "skeleton-pulse": "skeleton-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
