import type { Config } from "tailwindcss";

const config: Config = {
  // Tone colour classes live as literal strings in app/lib/tone.ts, so scanning .ts
  // as well as .tsx is what keeps them in the build.
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Google Fonts is unreachable from the build sandbox, so next/font/google
        // fails at build time. System stacks look native on every platform anyway.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        han: [
          "PingFang HK",
          "Hiragino Sans CNS",
          "Noto Sans HK",
          "Microsoft JhengHei",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
