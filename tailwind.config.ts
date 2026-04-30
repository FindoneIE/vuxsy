import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#007AFF",
        "primary-hover": "#0066CC",
      },
    },
  },
  plugins: [],
};

export default config;
