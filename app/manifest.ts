import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MAIGE Bioscience",
    short_name: "MAIGE",
    description: "Life science research products from MAIGE Bioscience.",
    start_url: "/en",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#103b7d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
