import type { Metadata } from "next";
import { Geist, Geist_Mono, Fira_Code } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "slidedude — Animated Code Presentations",
  description:
    "Create beautiful, animated code presentations with Shiki Magic Move",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_URL ?? "https://slidedude.io",
  ),
  openGraph: {
    title: "slidedude — Animated Code Presentations",
    description:
      "Create beautiful, animated code presentations with Shiki Magic Move",
    siteName: "slidedude",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "slidedude — Animated Code Presentations",
    description:
      "Create beautiful, animated code presentations with Shiki Magic Move",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${firaCode.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full">
        <SessionProvider session={session} refetchOnWindowFocus={false}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
