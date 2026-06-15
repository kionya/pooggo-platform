import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // 대표 도메인 정규화: pooggo-platform.vercel.app 접속은 pooggo.totopapa.com 으로 308 영구 리다이렉트.
  // (커스텀 도메인/프리뷰 호스트는 일치하지 않으므로 영향 없음 — 루프 없음)
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "pooggo-platform.vercel.app" }],
        destination: "https://pooggo.totopapa.com/:path*",
        permanent: true,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
export default withNextIntl(nextConfig);
