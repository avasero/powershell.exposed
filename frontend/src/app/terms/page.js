"use client";
import Link from 'next/link';
import ThemedButton from '../components/ThemedButton';

export default function TermsPage() {
  return (
    <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-mono font-bold" style={{color: 'var(--accent)'}}>
            Terms & Conditions
          </h1>
          <p className="mt-2 font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
            Last updated: November 11, 2025
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
          <div className="prose prose-invert max-w-none font-mono text-sm space-y-6" style={{color: 'var(--foreground)'}}>
            <p>
              When we say &quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot; in this document, we are referring to the PowerShell Exposed service and Avasero GmbH as the operator.
            </p>
            
            <p>
              When we say &quot;Service&quot;, we mean our website powershell.exposed, and any product created by Avasero GmbH and affiliated with powershell.exposed.
            </p>
            
            <p>
              When we say &quot;You&quot; or &quot;your&quot;, we are referring to the people or organizations that own an account with our Service.
            </p>
            
            <p>
              We may update these Terms of Service (&quot;Terms&quot;) in the future. Typically these changes have been to clarify some of these terms by linking to an expanded related policy. Whenever we make a significant change to our policies, we will refresh the date at the top of this page and take any other appropriate steps to notify account holders.
            </p>
            
            <p>
              When you use our Services, now or in the future, you are agreeing to the latest Terms. There may be times where we do not exercise or enforce a right or provision of the Terms; however, that does not mean we are waiving that right or provision. These Terms do contain a limitation of our liability.
            </p>
            
            <p style={{color: 'var(--accent)', fontWeight: 'bold'}}>
              If you violate any of the Terms, we may terminate your account.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-4" style={{color: 'var(--accent)'}}>Account Terms</h2>
            
            <p>
              You are responsible for maintaining the security of your account and password (if used) and for ensuring that any of your users do the same. The Company cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.
            </p>
            
            <p>
              You are responsible for all content posted to and activity that occurs under your account, including content posted by and activity of any users in your account.
            </p>
            
            <p>
              You must be a human. Accounts registered by &quot;bots&quot; or other automated methods are not permitted.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-4" style={{color: 'var(--accent)'}}>Payment and Plan Changes</h2>
            
            <p>
              If you are using a free version of one of our Services, it is really free: we do not ask you for your credit card and — just like for customers who pay for our Services — we do not sell your data.
            </p>
            
            <p>
              For paid Services that offer a free trial, we explain the length of trial when you sign up. After the trial period, you need to pay in advance to keep using the Service. If you do not pay, we will freeze your account and it will be inaccessible until you make payment. If your account has been frozen for a while, we will queue it up for auto-cancellation.
            </p>
            
            <p>
              If you are upgrading from a free plan to a paid plan, we will charge your card immediately and your billing cycle starts on the day of upgrade. For other upgrades or downgrades in plan level, the new rate starts from the next billing cycle.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-4" style={{color: 'var(--accent)'}}>Uptime, Security, and Privacy</h2>
            
            <p>
              Your use of the Services is at your sole risk. We provide these Services on an &quot;as is&quot; and &quot;as available&quot; basis. We do not offer service-level agreements for our Service but do take uptime of our applications seriously.
            </p>
            
            <p>
              We reserve the right to temporarily disable your account if your usage significantly exceeds the average usage of other customers of the Service. Of course, we&apos;ll reach out to the account owner before taking any action except in rare cases where the level of use may negatively impact the performance of the Service for other customers.
            </p>
            
            <p>
              We take many measures to protect and secure your data through backups, redundancies, and encryption. We enforce encryption for data transmission from the public Internet. There are some edge cases where we may send your data through our network unencrypted.
            </p>
            
            <p>
              When you use our Services, you entrust us with your data. We take that trust to heart. You agree that Avasero may process your data as described in our Privacy Policy and for no other purpose. We as humans can access your data for the following reasons:
            </p>
            
            <ul className="list-disc pl-6 space-y-2">
              <li>To help you with support requests you make. We&apos;ll ask for express consent before accessing your account.</li>
              <li>On the rare occasions when an error occurs that stops an automated process partway through. We get automated alerts when such errors occur. When we can fix the issue and restart automated processing without looking at any personal data, we do. In rare cases, we have to look at a minimum amount of personal data to fix the issue. In these rare cases, we aim to fix the root cause to prevent the errors from recurring.</li>
              <li>To safeguard powershell.exposed. We&apos;ll look at logs and metadata as part of our work to ensure the security of your data and the Services as a whole.</li>
              <li>To the extent required by applicable law.</li>
            </ul>
            
            <p>
              We use third party vendors and hosting partners to provide the necessary hardware, software, networking, storage, and related technology required to run the Services.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-4" style={{color: 'var(--accent)'}}>Copyright and Content Ownership</h2>
            
            <p>
              You give us a limited license to use the content posted by you in order to provide the Service to you, but we claim no ownership rights over those materials. All materials you submit to the Services remain yours.
            </p>
            
            <p>
              We do not pre-screen content, but we reserve the right (but not the obligation) in our sole discretion to refuse or remove any content that is available via the Service.
            </p>
            
            <p>
              The Company or its licensors own all right, title, and interest in and to the Services, including all intellectual property rights therein, and you obtain no ownership rights in the Services as a result of your use. You may not duplicate, copy, or reuse any portion of the HTML, CSS, JavaScript, or visual design elements without express written permission from the Company. You must request permission to use the Company&apos;s logos or any Service logos for promotional purposes. We reserve the right to rescind any permissions if you violate these Terms.
            </p>
            
            <p>
              You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the Services, use of the Services, or access to the Services without the express written permission of the Company.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-4" style={{color: 'var(--accent)'}}>Features and Bugs</h2>
            
            <p>
              We design our Services with care, based on our own experience and the experiences of customers who share their time and feedback. However, there is no such thing as a service that pleases everybody. We make no guarantees that our Services will meet your specific requirements or expectations.
            </p>
            
            <p>
              We also test all of our features extensively before shipping them. As with any software, our Services inevitably have some bugs. We track the bugs reported to us and work through priority ones, especially any related to security or privacy. Not all reported bugs will get fixed and we don&apos;t guarantee completely error-free Services.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-4" style={{color: 'var(--accent)'}}>Services Adaptations and API Terms</h2>
            
            <p>
              We offer Application Program Interfaces (&quot;API&quot;s) for our Service. Any use of the API, including through a third-party product that accesses the Services, is bound by these Terms plus the following specific terms:
            </p>
            
            <ul className="list-disc pl-6 space-y-2">
              <li>You expressly understand and agree that we are not liable for any damages or losses resulting from your use of the API or third-party products that access data via the API.</li>
              <li>Abuse or excessively frequent requests to the Services via the API may result in the temporary or permanent suspension of your account&apos;s access to the API. The Company, in its sole discretion, will determine abuse or excessive usage of the API. If we need to suspend your account&apos;s access, we will attempt to warn the account owner first. If your API usage could or has caused downtime, we may cut off access without prior notice.</li>
            </ul>

            <h2 className="text-xl font-bold mt-8 mb-4" style={{color: 'var(--accent)'}}>Liability</h2>
            
            <p>
              We mention liability throughout these Terms but to put it all in one section:
            </p>
            
            <p style={{color: 'var(--accent)'}}>
              You expressly understand and agree that the Company shall not be liable, in law or in equity, to you or to any third party for any direct, indirect, incidental, lost profits, special, consequential, punitive or exemplary damages, including, but not limited to, damages for loss of profits, goodwill, use, data or other intangible losses (even if the Company has been advised of the possibility of such damages), resulting from: (i) the use or the inability to use the Service; (ii) the cost of procurement of substitute goods and services resulting from any goods, data, information or services purchased or obtained or messages received or transactions entered into through or from the Service; (iii) unauthorized access to or alteration of your transmissions or data; (iv) statements or conduct of any third party on the service; (v) or any other matter relating to these Terms or the Service, whether as a breach of contract, tort (including negligence whether active or passive), or any other theory of liability.
            </p>
            
            <p className="mt-8">
              If you have a question about any of these Terms, please contact us at{' '}
              <a href="mailto:hi@powershell.exposed" className="hover:underline" style={{color: 'var(--accent)'}}>
                hi@powershell.exposed
              </a>
            </p>
          </div>
        </div>

        <div className="text-center pb-8">
          <Link href="/register">
            <ThemedButton variant="outline">
              Back to Sign Up
            </ThemedButton>
          </Link>
        </div>
      </div>
    </div>
  );
}