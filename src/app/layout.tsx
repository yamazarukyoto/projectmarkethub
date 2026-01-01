import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Inter } from "next/font/google";
import "./globals.css";
import { ModeProvider } from "@/components/providers/ModeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Project Market Hub",
  description: "信頼できるプロフェッショナルと出会えるクラウドソーシングプラットフォーム",
  icons: {
    icon: "/bee-favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} ${inter.variable} font-sans antialiased min-h-screen bg-background text-foreground`}>
        <ModeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ModeProvider>
      </body>
    </html>
  );
}
