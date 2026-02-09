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
        siam: {
          blue: {
            DEFAULT: "#2C54C6",
            light: "#3D5FCE",
            dark: "#2344B0",
            bright: "#5B76E0",
          },
          yellow: {
            DEFAULT: "#FFCE2D",
            light: "#FFD84D",
            dark: "#E6B828",
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
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-out forwards",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "fade-in-scale": "fade-in-scale 0.5s ease-out forwards",
        "slide-in-right": "slide-in-right 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
