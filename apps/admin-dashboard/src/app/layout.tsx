import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "物流ERP 管理ダッシュボード",
  description: "物流ERP 管理者向けダッシュボード",
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
