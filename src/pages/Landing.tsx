import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import { ArrowRight, ChevronDown, RotateCcw } from 'lucide-react';
import { IntroOverlay } from '../components/animations/IntroOverlay';
import { PrivacyPrismShaderCanvas } from '../components/animations/PrivacyPrismShaderCanvas';
import { InteractiveDemoSection } from '../components/landing/InteractiveDemoSection';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { LandingSections } from '../components/landing/LandingSections';
import { useRouter } from '../hooks/useRouter';

export function LandingPage() {
  const { navigate } = useRouter();
  const heroRef = useRef<HTMLElement | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [replayNonce, setReplayNonce] = useState(0);
  const [heroScrollValue, setHeroScrollValue] = useState(0);

  const { scrollYProgress: pageProgress } = useScroll();
  const smoothPageProgress = useSpring(pageProgress, { stiffness: 220, damping: 32, restDelta: 0.001 });

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  useEffect(() => {
    return heroProgress.on('change', (v) => {
      setHeroScrollValue(v);
    });
  }, [heroProgress]);

  const handleCompleteIntro = useCallback(() => {
    setShowIntro(false);
  }, []);

  const handleReplayIntro = () => {
    setReplayNonce((n) => n + 1);
    setShowIntro(true);
  };

  const scrollToTech = () => {
    const el = document.getElementById('technology');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] flex flex-col">
      {/* Dedicated Opening Intro Sequence (skippable immediately, zero forced delay on /app) */}
      <IntroOverlay open={showIntro} onComplete={handleCompleteIntro} />

      {/* Subtle fixed scroll-progress hairline */}
      <motion.div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-[2px] bg-[#A8E6CF] origin-left z-40 pointer-events-none"
        style={{ scaleX: smoothPageProgress }}
      />

      <LandingNavbar />

      <main className="flex-1">
        {/* SECTION 2 — Fluted-Glass Intro Shader Hero */}
        <section
          ref={heroRef}
          className="relative min-h-[calc(100vh-64px)] flex items-center overflow-hidden bg-[#050505]"
        >
          {/* Radial Fluted-Glass Shader Background */}
          <div className="absolute inset-0 z-0">
            <PrivacyPrismShaderCanvas scrollProgress={heroScrollValue} replayNonce={replayNonce} />
          </div>

          {/* Crisp readability scrim protecting left-aligned and mobile typography */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 bg-[#050505]/55 sm:bg-transparent sm:bg-gradient-to-r sm:from-[#050505]/92 sm:via-[#050505]/58 sm:to-transparent pointer-events-none"
          />

          <div className="relative z-20 max-w-[1280px] mx-auto px-5 sm:px-8 py-20 sm:py-28 w-full">
            <div className="max-w-3xl space-y-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0C0D0E]/90 border border-[#26282A] text-[11px] sm:text-[12px] font-mono text-[#A3A3A3]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8E6CF] shrink-0" aria-hidden="true" />
                <span>Browser-Only • Zero Server Uploads</span>
              </div>

              <h1 className="text-[40px] sm:text-[58px] lg:text-[78px] font-semibold leading-[1.03] tracking-[-0.035em] text-[#F5F5F5]">
                Protect identities.
                <br />
                <span className="text-[#A8E6CF]">Preserve humanity.</span>
              </h1>

              <p className="text-[15px] sm:text-[17px] text-[#A3A3A3] leading-[1.6] max-w-2xl">
                Privacy-first data sanitization for humanitarian teams, relief organizations and anyone who needs to share information without unnecessarily exposing sensitive identities.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold bg-[#F5F5F5] text-[#050505] hover:bg-[#A8E6CF] transition-colors cursor-pointer"
                >
                  <span>Launch Clyro</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={scrollToTech}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-medium border border-[#26282A] bg-[#0C0D0E]/85 text-[#F5F5F5] hover:border-[#525252] transition-colors cursor-pointer"
                >
                  <span>Explore the technology</span>
                  <ChevronDown className="w-4 h-4 text-[#A3A3A3]" />
                </button>
              </div>
            </div>
          </div>

          {/* Subtle Replay Intro control */}
          <button
            type="button"
            onClick={handleReplayIntro}
            className="absolute bottom-5 right-5 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono bg-[#0C0D0E]/85 border border-[#26282A] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#3A3D40] transition-colors cursor-pointer"
            title="Replay full intro shader animation"
          >
            <RotateCcw className="w-3 h-3 text-[#A8E6CF]" />
            <span>Replay Intro</span>
          </button>
        </section>

        <LandingSections interactiveDemo={<InteractiveDemoSection />} />
      </main>
    </div>
  );
}
