import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PasteMotion — Remotion Paste Renderer",
  description:
    "Claude 결과를 붙여넣으면 영상 초안이 됩니다. 강한 훅과 Remotion skills 기반 디자인 규칙으로 MP4까지 렌더링.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
