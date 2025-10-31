import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import CookieBanner from "./components/CookieBanner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DrawerProvider } from "./contexts/DrawerContext";
import { AnalysisDrawerProvider } from "./contexts/AnalysisDrawerContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AnalysisEventProvider } from "./contexts/AnalysisEventContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Community-driven PowerShell Detection Indicators",
  description: "Advanced PowerShell command analysis for malware detection",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)', color: 'var(--foreground)', overflow: 'hidden' }}
      >
        <ThemeProvider>
          <AuthProvider>
              <AnalysisEventProvider>
              <DrawerProvider>
                <AnalysisDrawerProvider>
                  <Navbar />
                  <main className="flex-1">{children}</main>
                  <Footer />
                  <CookieBanner />
                </AnalysisDrawerProvider>
              </DrawerProvider>
            </AnalysisEventProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
