"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemedButton from "../components/ThemedButton";

const SCORE_RANGES = {
  informational: {
    label: "1.0 - 1.99",
    description: "Informational: Extremely common, benign behavior",
  },
  low: {
    label: "2.0 - 4.99", 
    description: "Low: Relevant activity",
  },
  medium: {
    label: "5.0 - 7.99",
    description: "Medium: Fairly notable activity",
  },
  high: {
    label: "8.0 - 9.99",
    description: "High: Highly notable activity",
  },
  critical: {
    label: "10.0+",
    description: "Critical: Extremely notable, likely suspicious activity",
  },
};

const SCORE_COLORS = {
  informational: "border-blue-400 text-blue-400",
  low: "border-green-400 text-green-400",
  medium: "border-yellow-400 text-yellow-400", 
  high: "border-orange-400 text-orange-400",
  critical: "border-red-600 text-red-600",
};

export default function ScoringInfoPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl">
        <div className="mb-8">
          <ThemedButton variant="outline" className="mb-6" onClick={() => router.back()}>
            ← Back
          </ThemedButton>
          
          <h1 className="text-3xl sm:text-4xl font-mono font-bold mb-6" style={{color: 'var(--accent)'}}>
            Scoring Information
          </h1>
        </div>

        <div className="space-y-6">
         
          <div className="border rounded-lg p-6 bg-black/80 border-green-500/30">
            <h2 className="text-xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
              Scoring Tiers
            </h2>
            <div className="space-y-4">
              <div>
                <p className="font-mono text-sm font-bold mb-2" style={{color: 'var(--foreground)'}}>
                  Basic Tier
                </p>
                <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                  The Basic tier evaluates payloads against a limited set of indicators, primarily based on pattern and regex matching.
                </p>
                <p className="font-mono text-sm mt-2" style={{color: 'var(--muted-foreground)'}}>
                  Scoring is calculated using a simple, aggregated model.
                </p>
              </div>
              <div>
                <p className="font-mono text-sm font-bold mb-2" style={{color: 'var(--foreground)'}}>
                  Premium Tier
                </p>
                <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                  The Premium tier expands coverage by evaluating payloads against a broader and more sophisticated indicator set, including both regex-based and behavioral/anomaly-driven detections.
                </p>
                <p className="font-mono text-sm mt-2" style={{color: 'var(--muted-foreground)'}}>
                  Scoring is derived from a weighted model and additionally produces a severity classification.
                </p>
              </div>
            </div>
          </div>

         
          <div className="border rounded-lg p-6 bg-black/80 border-green-500/30">
            <h2 className="text-xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
              Notes on Aggregated Scoring
            </h2>
            <ul className="space-y-2">
              <li className="font-mono text-sm flex gap-3" style={{color: 'var(--muted-foreground)'}}>
                <span style={{color: 'var(--accent)'}}>•</span>
                <span>Each regex or pattern-based indicator is assigned a predefined base score.</span>
              </li>
              <li className="font-mono text-sm flex gap-3" style={{color: 'var(--muted-foreground)'}}>
                <span style={{color: 'var(--accent)'}}>•</span>
                <span>Individual indicator scores are summed to produce the final aggregated score.</span>
              </li>
              <li className="font-mono text-sm flex gap-3" style={{color: 'var(--muted-foreground)'}}>
                <span style={{color: 'var(--accent)'}}>•</span>
                <span>Certain indicators may match multiple times, subject to the maxmatch parameter defined in the indicator definition (YAML).</span>
              </li>
              <li className="font-mono text-sm flex gap-3" style={{color: 'var(--muted-foreground)'}}>
                <span style={{color: 'var(--accent)'}}>•</span>
                <span>Higher aggregated scores do not inherently indicate malicious behavior; they reflect a larger indicator footprint rather than intent or threat severity.</span>
              </li>
              <li className="font-mono text-sm flex gap-3" style={{color: 'var(--muted-foreground)'}}>
                <span style={{color: 'var(--accent)'}}>•</span>
                <span>Scores are designed to guide analysis and prioritization, not to serve as standalone verdicts of malicious activity.</span>
              </li>
            </ul>
          </div>

        
          <div className="border rounded-lg p-6 bg-black/80 border-green-500/30">
            <h2 className="text-xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
              Score Ranges
            </h2>
            <div className="space-y-3">
              {Object.entries(SCORE_RANGES).map(([key, val]) => (
                <div key={key} className={`border-l-4 pl-4 py-3 rounded bg-black/50 ${SCORE_COLORS[key]}`}>
                  <div className="font-mono font-bold text-sm mb-1" style={{color: 'var(--foreground)'}}>
                    {val.label}
                  </div>
                  <div className="font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>
                    {val.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          
        </div>

        <div className="mt-8 text-center">
          <ThemedButton onClick={() => router.back()}>
            ← Back to Evaluation
          </ThemedButton>
        </div>
      </div>
    </div>
  );
}
