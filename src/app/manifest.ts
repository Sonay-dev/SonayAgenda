import type { MetadataRoute } from "next";

// Manifest do PWA (Next injeta <link rel="manifest"> automaticamente).
// Cores da marca: fundo escuro #15131f.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgendaSonay",
    short_name: "AgendaSonay",
    description:
      "Agendamento de serviços para profissionais autônomos e pequenos negócios.",
    id: "/",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#15131f",
    theme_color: "#15131f",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
