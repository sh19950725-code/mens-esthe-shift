import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "店舗シフト管理",
    short_name: "シフト管理",
    description: "店舗スタッフ向けのシフト・キャスト・部屋管理システム",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#111827",
    orientation: "portrait",
    lang: "ja",
    icons: [
      {
        src: "/shift-app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/shift-app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
