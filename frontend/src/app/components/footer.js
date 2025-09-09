"use client";
import React from "react";

export default function Footer() {
  return (
    <footer className="w-full py-4 text-center border-t font-mono text-sm" style={{backgroundColor: 'var(--primary-black)', borderColor: 'var(--primary-green)', color: 'var(--primary-white)'}}>
      <div>
        &copy; {new Date().getFullYear()} <span style={{color: 'var(--primary-green)'}}>powershell.exposed</span>
      </div>
      <div className="mt-1">
        by <a href="https://avasero.com" target="_blank" rel="noopener noreferrer" style={{color: 'var(--primary-green)', textDecoration: 'underline'}}>avasero</a>
      </div>
    </footer>
  );
}
