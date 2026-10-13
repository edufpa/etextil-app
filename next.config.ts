import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Subida de archivos por partes (chunks de ~3 MB) — límite de Vercel 4.5 MB por request
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
