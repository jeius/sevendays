import type { Config } from "tailwindcss";

// Shared design tokens for landing + admin. Each app's tailwind.config.ts
// should spread `presets: [sevendaysPreset]`. shadcn/ui components are
// generated per-app via the shadcn CLI, but should reference these tokens
// (see packages/ui/src/globals.css for the CSS variables shadcn expects).
const sevendaysPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
};

export default sevendaysPreset;
