import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ディレクトリマップ生成ツール",
  description: "WebサイトをクロールしてディレクトリマップをExcelで出力するツール",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
