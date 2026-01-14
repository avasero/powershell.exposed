"use client";
import Link from 'next/link';
import { CiCircleInfo } from "react-icons/ci";


export default function SeverityLegend({ className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Link href="/scoring">
        <CiCircleInfo size={25} className="text-green-500" />
      </Link>
    </div>
  );
}
