'use client';

import React from 'react';
import Link from 'next/link';
import ThemedButton from '../components/ThemedButton';
import { useAuth } from '../contexts/AuthContext';
import { FaGithub } from 'react-icons/fa';
import { IoNotifications } from 'react-icons/io5';

export default function AboutPage() {
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-[calc(100vh-80px)] pt-16 pb-12 px-4 md:px-8 max-w-4xl mx-auto font-mono overflow-y-auto">
            {/* Header */}
            <div className="text-center mb-12 space-y-4">
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold break-words" style={{ color: 'var(--accent)' }}>
                    ABOUT
                </h1>
                <p className="text-base sm:text-lg md:text-xl mx-auto whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>
                    Spotting Suspicious PowerShell payloads, one indicator at a time.
                </p>
            </div>

            {/* Content */}
            <div className="space-y-8">
                {/* Mission Section */}
                <section
                    className="p-6 rounded-lg border"
                    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                >
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                        Our Mission
                    </h2>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                        Powershell.exposed exists to make PowerShell command analysis faster, clearer, and more reliable — especially in high-pressure security investigations. The platform helps security teams, analysts, and defenders quickly understand what a command does and whether it is commonly associated with malicious, suspicious, or abuse-prone behavior by matching it against a growing indicator database.
                    </p>
                </section>

                {/* Community Section */}
                <section
                    className="p-6 rounded-lg border"
                    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                >
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                        Community-Driven
                    </h2>
                    <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--muted-foreground)' }}>
                        Indicators are maintained in a public repository and shaped by the cybersecurity community. Contributions, improvements, and peer review are actively encouraged, ensuring the dataset evolves alongside real attacker techniques and defensive insights. Anyone with hands-on experience is invited to participate, review existing indicators, or contribute new findings.
                    </p>
                    <Link href="https://github.com/avasero/psexposed" target="_blank">
                        <ThemedButton className="gap-2">
                            <FaGithub size={18} />
                            Explore on GitHub
                        </ThemedButton>
                    </Link>
                </section>

                {/* Team Section */}
                <section
                    className="p-6 rounded-lg border"
                    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                >
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                        Built by Practitioners
                    </h2>
                    <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--muted-foreground)' }}>
                        The service is developed by experienced cybersecurity practitioners with deep backgrounds in enterprise security operations, detection engineering, and large-scale monitoring platforms. This real-world expertise directly informs the design of advanced and premium features, focused on professional workflows, scalability, and integration into modern SOC environments.
                    </p>
                    <Link href={isAuthenticated() ? '/settings?notify=true' : '/register'}>
                        <ThemedButton variant="outline" className="gap-2" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                            <IoNotifications size={18} />
                            Get Notified About Premium Features
                        </ThemedButton>
                    </Link>
                </section>
            </div>
        </div>
    );
}
