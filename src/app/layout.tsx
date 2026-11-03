import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ActingUserProvider } from "@/components/ActingUserContext";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

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
      <body className="h-screen overflow-hidden bg-background text-foreground">
        <ActingUserProvider>
          <div className="flex h-full">
            <Sidebar />
            <div className="flex h-full min-w-0 flex-1 flex-col">
              <Topbar />
              <main className="flex-1 overflow-y-auto px-5 py-8 sm:px-8 lg:px-10">
                <div className="mx-auto w-full max-w-6xl">{children}</div>
              </main>
            </div>
          </div>
        </ActingUserProvider>
      </body>
    </html>
  );
}
