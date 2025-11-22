"use client";
import React from "react";
import Link from "next/link";
import { IoLogoGithub } from "react-icons/io";


export default function Footer() {
  return (
    <footer className="w-full py-4 border-t font-mono text-sm bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center px-4 sm:px-6">
        {/* Left side - Copyright and Avasero */}
        <div className="text-center md:text-left">
          <div style={{color: 'var(--foreground)'}}>
            &copy; {new Date().getFullYear()} <span style={{color: 'var(--accent)'}}>powershell.exposed</span>, All Rights Reserved
          </div>
          <div className="mt-1" style={{color: 'var(--muted-foreground)'}}>
            built by <a href="https://avasero.com" target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent)', textDecoration: 'underline'}}>avasero</a>
          </div>
        </div>
        
        {/* Right side - Links */}
        <div className="mt-2 md:mt-0 text-center md:text-right" style={{color: 'var(--muted-foreground)'}}>
          <Link href="/terms" style={{color: 'var(--accent)', textDecoration: 'underline'}}>
            Terms & Conditions
          </Link>
          {' - '}
          <Link href="/imprint" style={{color: 'var(--accent)', textDecoration: 'underline'}}>
            Imprint
          </Link>
          {' - '}
          <Link href="https://github.com/avasero/psexposed#readme" title="Contribute" target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent)', textDecoration: 'underline'}}>
            <IoLogoGithub className="w-10 h-10 inline-block justify-center self-center" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
