import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DrawerProvider } from "./contexts/DrawerContext";
import { AuthProvider } from "./contexts/AuthContext";
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
  title: "PowerShell.exposed - Malware Detection Tool",
  description: "Advanced PowerShell command analysis for malware detection",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
      >
        <ThemeProvider>
          <DrawerProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </AuthProvider>
          </DrawerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
