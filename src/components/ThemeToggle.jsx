import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';

// Self-contained — owns its own state.
// Only THIS component re-renders on toggle, not the whole App tree.
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    // Synchronous DOM class change — CSS variables update instantly
    if (next) document.documentElement.classList.add('dark');
    else      document.documentElement.classList.remove('dark');
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-full border transition-all shadow-sm hover:shadow-md"
      style={{ background: 'var(--d2)', borderColor: 'var(--bd)' }}
      aria-label="Toggle theme"
    >
      {isDark
        ? <Sun  size={20} className="text-amber-400" />
        : <Moon size={20} style={{ color: 'var(--tx2)' }} />}
    </button>
  );
}
