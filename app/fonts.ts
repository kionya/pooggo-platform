import { Noto_Serif_KR } from "next/font/google";

// CJK 폰트는 용량이 커 preload 비활성(요청 시 swap). --font-serif-kr 변수로 노출(consumed via --font-serif in @theme).
export const notoSerifKr = Noto_Serif_KR({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-serif-kr",
});
