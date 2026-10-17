import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { RootShell } from "@/layouts/RootShell";
import "./globals.scss";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Banda Carmelitana Luminarense",
  description: "Portal e gestão da Banda Carmelitana Luminarense",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`h-full antialiased ${inter.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html:
              'html.portal-intro-pending,html.portal-intro-pending body{background:#000}html.portal-intro-pending body{overflow:hidden}html.portal-intro-pending body::before{content:"";position:fixed;inset:0;z-index:1999;background:#000;pointer-events:none}',
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(()=>{try{var p=location.pathname;if(p==="/"||p===""){var r=document.documentElement;r.classList.add("portal-intro-pending");r.style.background="#000"}}catch(e){}})()',
          }}
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Icons&display=block"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            <RootShell>{children}</RootShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
