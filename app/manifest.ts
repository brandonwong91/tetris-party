import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tetris Party",
    short_name: "Tetris",
    description:
      "A multiplayer Tetris game with real-time competitive gameplay",
    start_url: "/",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#1f2937",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
