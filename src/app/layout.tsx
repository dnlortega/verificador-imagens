import type { Metadata } from "next";
import { Outfit, Space_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const fontOutfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontSpaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PixelArmor PRO | O Verificador Definitivo",
  description: "Plataforma avançada para detecção e proteção contra imagens corrompidas e arquivos ausentes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${fontOutfit.variable} ${fontSpaceMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
