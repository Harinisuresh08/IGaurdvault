/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          bg: "#080B14", surface: "#0F1421", card: "#141B2D",
          elevated: "#1A2336", border: "#1E293B", hover: "#243049",
        },
        accent: { DEFAULT: "#00E5FF", soft: "#00E5FF33", glow: "#00E5FF80" },
        success: { DEFAULT: "#22C55E", soft: "#22C55E33" },
        warning: { DEFAULT: "#F59E0B", soft: "#F59E0B33" },
        danger: { DEFAULT: "#EF4444", soft: "#EF444433" },
        muted: { DEFAULT: "#64748B", light: "#94A3B8", faint: "#475569" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px #00E5FF33",
        "glow-lg": "0 0 40px #00E5FF22",
        "glow-success": "0 0 20px #22C55E33",
        "glow-danger": "0 0 20px #EF444433",
        "glow-warning": "0 0 20px #F59E0B33",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        scaleIn: { from: { opacity: "0", transform: "scale(0.9)" }, to: { opacity: "1", transform: "scale(1)" } },
      },
    },
  },
};
