import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useRouter } from '../../hooks/useRouter';
import { ClyroLogo } from '../shared/ClyroLogo';

const NAV_LINKS = [
  { label: 'About', hash: 'about' },
  { label: 'Technology', hash: 'technology' },
  { label: 'Use Cases', hash: 'use-cases' },
  { label: 'Privacy', hash: 'privacy' },
];

export function LandingNavbar() {
  const { navigate } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleHashClick = (hash: string) => {
    setMobileOpen(false);
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/', hash);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#1B1D1F] bg-[#050505]/85 backdrop-blur-md">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="cursor-pointer focus-visible:outline-none"
          aria-label="Clyro Home"
        >
          <ClyroLogo />
        </button>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <button
              key={link.hash}
              type="button"
              onClick={() => handleHashClick(link.hash)}
              className="text-[13px] font-medium text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-[#F5F5F5] text-[#050505] hover:bg-[#A8E6CF] transition-colors cursor-pointer"
          >
            <span>Launch Clyro</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden p-2 rounded-md border border-[#26282A] text-[#A3A3A3] hover:text-[#F5F5F5]"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#1B1D1F] bg-[#0C0D0E] px-5 py-4 space-y-2">
          {NAV_LINKS.map((link) => (
            <button
              key={link.hash}
              type="button"
              onClick={() => handleHashClick(link.hash)}
              className="block w-full text-left py-2 text-[14px] text-[#D4D4D4] hover:text-[#A8E6CF]"
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
