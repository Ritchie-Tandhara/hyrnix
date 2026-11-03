import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ActingUserProvider } from "@/components/ActingUserContext";
import NavBar from "@/components/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HYRNIX",
  description: "AI-native People Operations Decision and Automation Platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("hyrnix-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <ActingUserProvider>
          <NavBar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 sm:px-10 lg:px-12">{children}</main>
        </ActingUserProvider>
      </body>
    </html>
  );
}
