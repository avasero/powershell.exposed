"use client";
import Link from "next/link";
import ThemedButton from "./components/ThemedButton";
import { useAuth } from "./contexts/AuthContext";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-4xl text-center space-y-10">
       
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-mono font-bold" style={{color: 'var(--accent)'}}>
            powershell.exposed
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl font-mono" style={{color: 'var(--muted-foreground)'}}>
            Suspicious PowerShell Detection Engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
          <div className="p-6 rounded-lg border bg-black/80 border-green-500/30">
            <h3 className="font-mono font-semibold mb-2" style={{color: 'var(--foreground)'}}>
              Community version
            </h3>
            <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              Over 80 pattern based indicators ( and counting ). Check the Github project.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-black/80 border-green-500/30">
            <h3 className="font-mono font-semibold mb-2" style={{color: 'var(--foreground)'}}>
              Free Analysis
            </h3>
            <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              Including aggregated scoring and command evaluation history.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-black/80 border-green-500/30">
            <h3 className="font-mono font-semibold mb-2" style={{color: 'var(--foreground)'}}>
              Eenterprise Version
            </h3>
            <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              API access, unlimited rate, premium indicators |( behavioral, anomaly ).
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-lg font-mono" style={{color: 'var(--foreground)'}}>
            Ready to start analyzing PowerShell commands?
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/evaluate">
              <ThemedButton 
                size="lg" 
                className="w-full sm:w-auto"
              >
                Start Analysis
              </ThemedButton>
            </Link>
            
            
          </div>
        </div>
      </div>
    </div>
  );
}