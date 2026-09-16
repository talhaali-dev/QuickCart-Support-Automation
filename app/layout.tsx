import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuickCart Support Automation",
  description: "Production-minded proof of concept for customer support automation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
