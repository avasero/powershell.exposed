"use client";
import React from "react";

export default function Footer() {
  return (
    <footer className="w-full py-4 text-center border-t font-mono text-sm bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all">
      <div style={{color: 'var(--foreground)'}}>
        &copy; {new Date().getFullYear()} <span style={{color: 'var(--accent)'}}>powershell.exposed</span>
      </div>
      <div className="mt-1" style={{color: 'var(--muted-foreground)'}}>
        by <a href="https://avasero.com" target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent)', textDecoration: 'underline'}}>avasero</a>
      </div>
    </footer>
  );
}
