import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { ThemeToggle } from "@/components/theme-toggle";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Health Note",
  description: "Track your blood pressure",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ibmPlexSansThai.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${ibmPlexSansThai.className} min-h-full flex flex-col bg-background text-foreground transition-colors`}
      >
        <div className="flex w-full justify-end px-4 pt-4 sm:px-6">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
