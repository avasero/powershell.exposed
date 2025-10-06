"use client";
import Link from "next/link";
import ThemedButton from "../components/ThemedButton";
import { useAuth } from "../contexts/AuthContext";

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto text-center space-y-8">
       
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-mono font-bold" style={{color: 'var(--accent)'}}>
            PowerShell.exposed
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl font-mono" style={{color: 'var(--muted-foreground)'}}>
            Community-Driven PowerShell Detection Indicators
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
          <div className="p-6 rounded-lg border bg-black/80 border-green-500/30">
            <h3 className="font-mono font-semibold mb-2" style={{color: 'var(--foreground)'}}>
              Free Pattern Indicator Matching
            </h3>
            <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              Public access to all pattern/regex-based indicators
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-black/80 border-green-500/30">
            <h3 className="font-mono font-semibold mb-2" style={{color: 'var(--foreground)'}}>
              Real-Time Evaluation
            </h3>
            <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              Detailed analysis, including historic evaluations for registered users
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-black/80 border-green-500/30">
            <h3 className="font-mono font-semibold mb-2" style={{color: 'var(--foreground)'}}>
              Detection Model API
            </h3>
            <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              Coming Soon, with premium indicators (behavioral, anomaly)
            </p>
          </div>
        </div>

        
        <div className="space-y-6">
          <p className="text-lg font-mono" style={{color: 'var(--foreground)'}}>
            Ready to start analyzing PowerShell commands?
          </p>
          
          {!isAuthenticated() && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              
              <Link href="/">
                <ThemedButton 
                  size="lg" 
                  className="w-full sm:w-auto"
                  onClick={() => {
                  
                  }}
                >
                  Try Analysis Now
                </ThemedButton>
              </Link>
              
              <Link href="/register">
                <ThemedButton 
                  variant="outline"
                  size="lg" 
                  className="w-full sm:w-auto"
                >
                  Create Free Account
                </ThemedButton>
              </Link>
              
              <Link href="/login">
                <ThemedButton variant="outline" size="lg" className="w-full sm:w-auto">
                  Login
                </ThemedButton>
              </Link>
            </div>
          )}

          {isAuthenticated() && (
            <div className="flex justify-center">
              <Link href="/">
                <ThemedButton size="lg" className="w-full sm:w-auto">
                  Go to Analysis
                </ThemedButton>
              </Link>
            </div>
          )}
        </div>

       
        <div className="mt-16 p-6 rounded-lg border bg-black/80 border-green-500/30">
          <h2 className="text-xl font-mono font-semibold mb-4" style={{color: 'var(--accent)'}}>
            How It Works?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-mono" style={{color: 'var(--muted-foreground)'}}>
            <div className="text-center p-4 rounded-lg border bg-black/80 border-green-500/30">
              <div className="text-lg mb-2 font-bold" style={{color: 'var(--accent)'}}>1</div>
              <p>Write or paste PowerShell command(s)</p>
            </div>
            <div className="text-center p-4 rounded-lg border bg-black/80 border-green-500/30">
              <div className="text-lg mb-2 font-bold" style={{color: 'var(--accent)'}}>2</div>
              <p>Hit ENTER or click &quot;Evaluate&quot;</p>
            </div>
            <div className="text-center p-4 rounded-lg border bg-black/80 border-green-500/30">
              <div className="text-lg mb-2 font-bold" style={{color: 'var(--accent)'}}>3</div>
              <p>Consume the report and insights</p>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
