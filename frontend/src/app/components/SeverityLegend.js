"use client";
import Link from 'next/link';

export default function SeverityLegend({ className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Link href="/scoring">
        <button
          className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs font-normal hover:bg-current hover:text-black transition-colors"
          style={{color: 'var(--accent)', textTransform: 'none'}}
          title="Score ranges information"
        >
          i
        </button>
      </Link>
    </div>
  );
}
