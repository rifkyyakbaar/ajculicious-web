import os from "os";
import type { NextConfig } from "next";

const localIps = Object.values(os.networkInterfaces())
  .flat()
  .filter((iface) => iface && iface.family === "IPv4")
  .map((iface) => iface!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    ...localIps,
    ...Array.from({ length: 254 }, (_, i) => `192.168.1.${i + 1}`),
  ],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
