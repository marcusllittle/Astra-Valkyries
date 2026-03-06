import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.astravalkyries.rhythmjetsquadron",
  appName: "Astra Valkyries",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
