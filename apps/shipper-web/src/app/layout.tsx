import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "物流ERP 荷主向けWeb",
  description: "荷主向けWebアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
