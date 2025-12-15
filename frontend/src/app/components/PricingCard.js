import React from 'react';

const PricingCard = ({
    title,
    price,
    subtitle,
    buttonText,
    buttonAction,
    isPopular,
    features,
    buttonVariant = 'default',
    isUserAuthenticated = false
}) => {
    const isSignupButton = buttonText === 'Signup Now';
    return (
        <div className={`relative flex flex-col p-6 rounded-lg border bg-black/80 h-full transition-all duration-300 ${isPopular
            ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
            : 'border-green-500/30'
            }`}>
            {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-black text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                </div>
            )}

            <div className="mb-4 text-center">
                <h3 className="text-xl font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{title}</h3>
            </div>

            <div className="mb-6 text-center h-20 flex flex-col justify-center">
                {price ? (
                    <div className="flex items-center justify-center gap-1">
                        <span className="text-3xl font-mono font-bold text-white">{price}</span>
                        {price !== 'Free' && <span className="text-sm font-mono text-gray-400">/mo</span>}
                    </div>
                ) : (
                    <div className="text-3xl font-mono font-bold text-white">Coming</div>
                )}
                <div className="text-xs font-mono mt-2" style={{ color: 'var(--muted-foreground)' }}>{subtitle}</div>
            </div>

            <div className="mb-8">
                {isSignupButton && isUserAuthenticated ? (
                    <button
                        disabled
                        className="w-full py-2 px-4 rounded font-mono font-bold uppercase tracking-wider transition-all duration-300 bg-gray-600/20 border border-gray-500/50 text-gray-500 cursor-not-allowed opacity-60"
                    >
                        Active
                    </button>
                ) : (
                    <button
                        onClick={buttonAction}
                        className={`w-full py-2 px-4 rounded font-mono font-bold uppercase tracking-wider transition-all duration-300 ${buttonVariant === 'primary'
                            ? 'bg-green-600/20 border border-green-500 text-green-400 hover:bg-green-600 hover:text-black shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                            : 'bg-transparent border border-green-500/50 text-green-500/70 hover:border-green-500 hover:text-green-400'
                            }`}
                    >
                        {buttonText}
                    </button>
                )}
            </div>

            {features && features.length > 0 && (
                <div className="flex flex-col border-t border-green-500/30 pt-4">
                    {features.map((feature, idx) => {
                        const isSubfeature = feature.trim().startsWith('-');
                        const displayFeature = isSubfeature ? feature.replace('-', '').trim() : feature;
                        let marginClass = 'mt-0';
                        if (idx > 0) {
                            marginClass = isSubfeature ? 'mt-0.5' : 'mt-4';
                        }

                        return (
                            <div key={idx} className={`flex items-start gap-2  text-[11px] font-mono text-gray-300 ${isSubfeature ? 'pl-8' : ''} ${marginClass}`}>
                                {!isSubfeature ? (
                                    <span className="text-green-500 mt-[2px] flex-shrink-0">✓</span>
                                ) : (
                                    <span className="text-gray-500 mt-[2px] flex-shrink-0">-</span>
                                )}
                                <span className="whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>{displayFeature}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PricingCard;
