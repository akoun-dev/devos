import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevOS — Assistant vocal proactif",
  description:
    "Rappels vocaux intelligents : nouvelles tâches, échéances et priorités annoncées.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      {/* suppressHydrationWarning sur <body> : certaines extensions navigateur (ex. Bitdefender —
          attributs bis_skin_checked / bis_register) mutent le DOM avant l'hydratation React et
          déclenchent un avertissement de mismatch sur les attributs du body. L'attribut neutralise
          l'avertissement pour CET élément uniquement — aucun changement de comportement. */}
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
