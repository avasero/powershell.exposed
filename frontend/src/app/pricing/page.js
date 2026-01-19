'use client';

import React from 'react';
import PricingCard from '../components/PricingCard';
import { useAuth } from '../contexts/AuthContext';

export default function PricingPage() {
    const { isAuthenticated } = useAuth();
    const tiers = [
        {
            id: 'guest',
            title: 'Guest',
            price: 'Free',
            subtitle: 'Enjoy as a guest',
            buttonText: 'Start Analysis',
            buttonAction: () => window.location.href = '/evaluate',
            isPopular: false,
            summaryFeatures: [
                'Full access to evaluation engine',
                '- 5 Requests / Minute',
                'Automated **command decoding**',
                '- 1 Decode / Minute',
                'Completely anonymous use',
                'Standard email support'
            ]
        },
        {
            id: 'basic',
            title: 'Basic',
            price: 'Free',
            subtitle: 'Free forever, promised!',
            buttonText: 'Signup Now',
            buttonVariant: 'primary',
            buttonAction: () => window.location.href = '/register',
            isPopular: true,
            summaryFeatures: [
                'Full access to evaluation engine',
                '- 10 Requests / Minute',
                'Automated **command decoding**',
                '- 5 Decodes / Minute',
                '**Complete search history**',
                '**API Access** (limits apply)',
                'Standard email support'
            ]
        },
        //comment pro category
        /*
        {
            id: 'pro',
            title: 'Pro',
            price: '', // Shows 'Coming'
            subtitle: 'For ambitious power users',
            buttonText: 'Get notified',
            buttonAction: () => window.location.href = isAuthenticated() ? '/settings?notify=true' : '/register',
            isPopular: false,
            summaryFeatures: [
                'Full access to evaluation engine',
                '- 100 Requests / Minute',
                'Automated **command decoding**',
                '- 50 Decodes / Minute',
                'Automated **Deobfuscation**',
                '- 10 Deobfuscation / Minute',
                '**Premium detection engine**',
                '- Contextual information over time',
                '- Command prevalence',
                '**Complete search history**',
                '**API Access** (limits apply)',
                'Standard email support'
            ]
        },
*/
        {
            id: 'enterprise',
            title: 'Premium',
            price: '', // Shows 'Coming'
            subtitle: 'Secure your organization',
            buttonText: 'Get notified',
            buttonAction: () => window.location.href = isAuthenticated() ? '/settings?notify=true' : '/register',
            isPopular: false,
            isPremium: true,
            summaryFeatures: [
                'Full  access to evaluation engine',
                ' - **Unlimited**',
                'Automated **command decoding**',
                ' - **Unlimited**',
                'Automated **Deobfuscation**',
                ' - **Unlimited**',
                '**Premium detection engine**',
                ' - Contextual information over time',
                ' - Command prevalence',
                '**Complete search history**',
                '**API Access** (limits apply)',
                'Standard email support'
            ]
        }
    ];

    return (
        <div className="min-h-[calc(100vh-80px)] pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto font-mono flex flex-col justify-center">
            <div className="text-center mb-16 space-y-4">
                <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold break-words" style={{ color: 'var(--accent)' }}>
                    USAGE TIERS
                </h1>
                <p className="text-base sm:text-lg md:text-xl mx-auto whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>
                    Scale your detection capabilities with our flexible tiers.
                </p>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {tiers.map((tier) => (
                    <PricingCard
                        key={tier.id}
                        {...tier}
                        features={tier.summaryFeatures}
                        isUserAuthenticated={isAuthenticated()}
                    />
                ))}
            </div>
        </div>
    );
}
