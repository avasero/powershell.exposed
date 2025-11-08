"use client";
import Link from "next/link";
import ThemedButton from "../../components/ThemedButton";

const SCORE_RANGES = {
  informational: {
    label: "1.0",
    description: "Informational: Extremely common, benign behavior",
  },
  low: {
    label: "2.0 - 4.0", 
    description: "Low: Relevant activity",
  },
  medium: {
    label: "5.0 - 7.0",
    description: "Medium: Fairly notable activity",
  },
  high: {
    label: "8.0 - 9.0",
    description: "High: Highly notable activity",
  },
  critical: {
    label: "10.0",
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
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <ThemedButton variant="outline" className="mb-6">
              ← Back
            </ThemedButton>
          </Link>
          
          <h1 className="text-3xl sm:text-4xl font-mono font-bold mb-6" style={{color: 'var(--accent)'}}>
            Scoring Information
          </h1>
        </div>

        <div className="space-y-6">
          {/* Tier Information */}
          <div className="border rounded-lg p-6 bg-black/80 border-green-500/30">
            <h2 className="text-xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
              Scoring Tiers
            </h2>
            <div className="space-y-4">
              <div>
                <p className="font-mono text-sm font-bold mb-2" style={{color: 'var(--foreground)'}}>
                  📊 Basic Tier
                </p>
                <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                  Matches against a limited set of indicators, mostly pattern/regex based and only enables simple, aggregated score.
                </p>
              </div>
              <div>
                <p className="font-mono text-sm font-bold mb-2" style={{color: 'var(--foreground)'}}>
                  ⭐ Premium Tier
                </p>
                <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                  Besides testing payloads against a wider range of indicators (regex plus behavioral/anomaly), the scoring is based on a weighted model which also outputs a severity label.
                </p>
              </div>
            </div>
          </div>

          {/* How Scoring Works */}
          <div className="border rounded-lg p-6 bg-black/80 border-green-500/30">
            <h2 className="text-xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
              A few notes on the simple, aggregated scoring
            </h2>
            <ul className="space-y-2">
              <li className="font-mono text-sm flex gap-3" style={{color: 'var(--muted-foreground)'}}>
                <span style={{color: 'var(--accent)'}}>•</span>
                <span>Each regex/pattern indicator has a base score.</span>
              </li>
              <li className="font-mono text-sm flex gap-3" style={{color: 'var(--muted-foreground)'}}>
                <span style={{color: 'var(--accent)'}}>•</span>
                <span>A few indicators are subject to multi-matching (refer to "maxmatch" parameter in the YAML).</span>
              </li>
              <li className="font-mono text-sm flex gap-3" style={{color: 'var(--muted-foreground)'}}>
                <span style={{color: 'var(--accent)'}}>•</span>
                <span>Individual indicator scores are summed up to form the aggregated, total score.</span>
              </li>
              <li className="font-mono text-sm flex gap-3" style={{color: 'var(--muted-foreground)'}}>
                <span style={{color: 'var(--accent)'}}>•</span>
                <span>Higher scores are NOT necessarily tied to a suspicious payload but larger indicator footprint.</span>
              </li>
            </ul>
          </div>

          {/* Score Ranges */}
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
          <Link href="/">
            <ThemedButton>
              ← Back to Evaluation
            </ThemedButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
