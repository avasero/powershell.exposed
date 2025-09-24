"use client";
import Link from 'next/link';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--background)', color: 'var(--foreground)'}}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
            Terms and Conditions
          </h1>
          <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Back to Home */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 font-mono text-sm hover:underline"
            style={{color: 'var(--accent)'}}
          >
            ← Back to Home
          </Link>
        </div>

        {/* Terms Content */}
        <div className="space-y-8 font-mono text-sm leading-relaxed">
          
          {/* Section 1: Acceptance */}
          <section className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-xl font-bold mb-4" style={{color: 'var(--accent)'}}>
              1. Acceptance of Terms
            </h2>
            <p style={{color: 'var(--foreground)'}}>
              By accessing and using PowerShell.exposed, you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          {/* Section 2: Service Description */}
          <section className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-xl font-bold mb-4" style={{color: 'var(--accent)'}}>
              2. Service Description
            </h2>
            <p style={{color: 'var(--foreground)'}}>
              PowerShell.exposed is a security analysis tool that evaluates PowerShell commands and scripts for potential malicious behavior. 
              The service provides risk assessments, signature detection, and educational insights about PowerShell security.
            </p>
          </section>

          {/* Section 3: Acceptable Use */}
          <section className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-xl font-bold mb-4" style={{color: 'var(--accent)'}}>
              3. Acceptable Use Policy
            </h2>
            <div style={{color: 'var(--foreground)'}} className="space-y-3">
              <p><strong>You agree to use this service only for:</strong></p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Educational purposes and learning about PowerShell security</li>
                <li>Legitimate security research and analysis</li>
                <li>Testing your own scripts and commands for security issues</li>
                <li>Cybersecurity training and awareness programs</li>
              </ul>
              
              <p className="mt-4"><strong>You agree NOT to use this service for:</strong></p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Creating, distributing, or facilitating malicious software</li>
                <li>Any illegal activities or violations of applicable laws</li>
                <li>Analyzing commands you don&apos;t own without proper authorization</li>
                <li>Attempting to bypass, exploit, or overwhelm the service</li>
              </ul>
            </div>
          </section>

          {/* Section 4: Privacy and Data */}
          <section className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-xl font-bold mb-4" style={{color: 'var(--accent)'}}>
              4. Privacy and Data Handling
            </h2>
            <div style={{color: 'var(--foreground)'}} className="space-y-3">
              <p><strong>Data Collection:</strong></p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Commands submitted for analysis may be logged for service improvement</li>
                <li>IP addresses and basic usage analytics are collected</li>
                <li>User accounts store analysis history and preferences</li>
              </ul>
              
              <p className="mt-4"><strong>Data Protection:</strong></p>
              <ul className="list-disc ml-6 space-y-1">
                <li>We implement reasonable security measures to protect your data</li>
                <li>Submitted commands are processed securely and not shared with third parties</li>
                <li>You can delete your account and associated data at any time</li>
              </ul>
            </div>
          </section>

          {/* Section 5: Rate Limiting */}
          <section className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-xl font-bold mb-4" style={{color: 'var(--accent)'}}>
              5. Rate Limiting and Fair Use
            </h2>
            <p style={{color: 'var(--foreground)'}}>
              To ensure fair access for all users, the service implements rate limiting. 
              Excessive usage may result in temporary restrictions. 
              Users requiring higher limits should contact us about API access options.
            </p>
          </section>

          {/* Section 6: Disclaimers */}
          <section className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-xl font-bold mb-4" style={{color: 'var(--accent)'}}>
              6. Disclaimers and Limitations
            </h2>
            <div style={{color: 'var(--foreground)'}} className="space-y-3">
              <p><strong>Service Availability:</strong></p>
              <ul className="list-disc ml-6 space-y-1">
                <li>The service is provided &quot;as is&quot; without warranties of any kind</li>
                <li>We do not guarantee 100% uptime or availability</li>
                <li>Analysis results are for informational purposes only</li>
              </ul>
              
              <p className="mt-4"><strong>Limitation of Liability:</strong></p>
              <ul className="list-disc ml-6 space-y-1">
                <li>We are not liable for any damages arising from use of the service</li>
                <li>Users are responsible for their own security decisions</li>
                <li>The service should not be the sole basis for security assessments</li>
              </ul>
            </div>
          </section>

          {/* Section 7: Account Termination */}
          <section className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-xl font-bold mb-4" style={{color: 'var(--accent)'}}>
              7. Account Termination
            </h2>
            <p style={{color: 'var(--foreground)'}}>
              We reserve the right to terminate or suspend access to the service at any time, 
              without prior notice, for conduct that we believe violates these Terms of Service 
              or is harmful to other users, us, or third parties, or for any other reason.
            </p>
          </section>

          {/* Section 8: Changes to Terms */}
          <section className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-xl font-bold mb-4" style={{color: 'var(--accent)'}}>
              8. Changes to Terms
            </h2>
            <p style={{color: 'var(--foreground)'}}>
              We reserve the right to modify these terms at any time. 
              Changes will be effective immediately upon posting. 
              Your continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          {/* Section 9: Contact */}
          <section className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-xl font-bold mb-4" style={{color: 'var(--accent)'}}>
              9. Contact Information
            </h2>
            <p style={{color: 'var(--foreground)'}}>
              If you have any questions about these Terms and Conditions, please contact us through our website at{' '}
              <a href="https://avasero.com" target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent)', textDecoration: 'underline'}}>
                avasero.com
              </a>
            </p>
          </section>

          {/* Legal Notice */}
          <div className="p-4 rounded-lg border-2" style={{backgroundColor: 'var(--muted)', borderColor: 'var(--accent)'}}>
            <div className="flex items-start gap-3">
              <span className="text-xl">⚖️</span>
              <div>
                <h3 className="font-bold mb-2" style={{color: 'var(--accent)'}}>Legal Notice</h3>
                <p className="text-xs" style={{color: 'var(--muted-foreground)'}}>
                  These terms are governed by applicable laws. 
                  By using PowerShell.exposed, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Navigation */}
        <div className="mt-12 text-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 font-mono text-sm hover:underline"
            style={{color: 'var(--accent)'}}
          >
            ← Return to PowerShell.exposed
          </Link>
        </div>
      </div>
    </div>
  );
}