import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    maxWorkers: 2,
    setupFiles: "./src/test/setup.ts",
    testTimeout: 20_000,
  },
});
