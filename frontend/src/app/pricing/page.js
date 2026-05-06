'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PricingCard from '../components/PricingCard';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession, makeAuthenticatedJSONRequest } from '../../lib/api';

const PREMIUM_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || '';

export default function PricingPage() {
    const { isAuthenticated } = useAuth();
    const searchParams = useSearchParams();
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [banner, setBanner] = useState(null);
    const [userPlan, setUserPlan] = useState(null);

    useEffect(() => {
        if (searchParams.get('success') === 'true') {
            setBanner({ type: 'success', message: 'Payment successful! Your plan has been upgraded.' });
        } else if (searchParams.get('canceled') === 'true') {
            setBanner({ type: 'canceled', message: 'Checkout canceled. No charges were made.' });
        }
    }, [searchParams]);

    useEffect(() => {
        if (isAuthenticated()) {
            makeAuthenticatedJSONRequest('/user/plan')
                .then(data => setUserPlan(data?.plan?.plan_name || null))
                .catch(() => setUserPlan(null));
        }
    }, [isAuthenticated]);

    const isPremiumUser = userPlan === 'premium' || userPlan === 'enterprise';

    const handleCheckout = async (priceId) => {
        if (!isAuthenticated()) {
            window.location.href = '/register';
            return;
        }
        setCheckoutLoading(true);
        try {
            const data = await createCheckoutSession(priceId);
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error('Checkout error:', err);
            alert('Failed to start checkout. Please try again.');
        } finally {
            setCheckoutLoading(false);
        }
    };

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
            subtitle: isAuthenticated() ? 'You are on this plan' : 'Free forever, promised!',
            buttonText: isAuthenticated() ? 'Your Tier' : 'Signup Now',
            buttonVariant: isAuthenticated() ? 'default' : 'primary',
            buttonAction: isAuthenticated() ? () => window.location.href = '/evaluate' : () => window.location.href = '/register',
            buttonDisabled: isAuthenticated(),
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
            price: '$9.99/mo',
            subtitle: 'Secure your organization',
            buttonText: isPremiumUser ? 'Your Tier' : (checkoutLoading ? 'Loading...' : 'Upgrade'),
            buttonAction: () => handleCheckout(PREMIUM_PRICE_ID),
            buttonDisabled: isPremiumUser || checkoutLoading || !PREMIUM_PRICE_ID,
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
            {banner && (
                <div
                    className="max-w-2xl mx-auto mb-8 px-6 py-4 rounded-lg border font-mono text-sm flex items-center justify-between"
                    style={{
                        backgroundColor: banner.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                        borderColor: banner.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)',
                        color: banner.type === 'success' ? '#22c55e' : '#eab308',
                    }}
                >
                    <span>{banner.message}</span>
                    <button
                        onClick={() => setBanner(null)}
                        className="ml-4 hover:opacity-70 text-lg"
                        style={{ color: 'inherit' }}
                    >
                        x
                    </button>
                </div>
            )}
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
