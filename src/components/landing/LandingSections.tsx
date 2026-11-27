import { useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Database,
  EyeOff,
  FileCheck2,
  Fingerprint,
  HardDrive,
  HeartPulse,
  Lock,
  Network,
  Shield,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react';
import {
  createPseudonymRegistry,
  detectEntitiesInText,
  ENTITY_TYPES,
  isRepeatedDigitSequence,
  isValidLuhn,
  parseIPv4,
  RECIPIENT_PRESETS,
  runSanitizationPipeline,
  type Mode,
  type RecipientType,
} from '../../engine';
import { LANDING_DEMO_CSV } from '../../fixtures/syntheticRelief';
import { useRouter } from '../../hooks/useRouter';
import { WireframeFunnelCanvas } from '../animations/WireframeFunnelCanvas';
import { ClyroLogo } from '../shared/ClyroLogo';
import { ENTITY_META } from '../shared/EntityMeta';

const PRINCIPLES = [
  '100% Client-side Processing',
  'No Record Uploads',
  'Six PII Categories',
  'Consistent Pseudonymization',
  'Local File Export',
];

const PIPELINE_STEPS = [
  {
    code: '01',
    title: 'Input',
    desc: 'Paste multiline text or read local .txt/.csv files in browser volatile memory.',
  },
  {
    code: '02',
    title: 'Detection',
    desc: 'Bounded linear scanners locate Email, Phone, IP, PAN, Aadhaar, and Card candidates.',
  },
  {
    code: '03',
    title: 'Validation',
    desc: 'Luhn filtering rejects random 16-digit numbers; IPv4/IPv6 parsers enforce strict syntax.',
  },
  {
    code: '04',
    title: 'Transformation',
    desc: 'Deterministic overlap resolution applies Full Mask, Partial Mask, or scoped Pseudonyms.',
  },
  {
    code: '05',
    title: 'Audit',
    desc: 'Reconciles counts, unique entities, and validation coverage without storing raw values.',
  },
  {
    code: '06',
    title: 'Export',
    desc: 'Writes sanitized bytes via local Blob URLs with neutral filenames and formula safety.',
  },
];

const USE_CASES: Array<{
  scope: RecipientType;
  icon: typeof Building2;
  title: string;
  need: string;
  protection: string;
}> = [
  {
    scope: 'ngo',
    icon: Building2,
    title: 'NGO Coordination',
    need: 'Needs district, household size, shelter requirements, and urgency levels to allocate supplies.',
    protection:
      'Strips direct government IDs, phone numbers, and free-text notes while issuing NGO-scoped case pseudonyms.',
  },
  {
    scope: 'municipal',
    icon: Shield,
    title: 'Government Relief Operations',
    need: 'Consolidates regional intake spreadsheets across multiple administrative units.',
    protection:
      'Normalizes formatted IDs and phone variants consistently while auditing rejected numeric anomalies locally.',
  },
  {
    scope: 'hospital',
    icon: HeartPulse,
    title: 'Hospital Referral Preparation',
    need: 'Coordinates triage capacity and urgent referral counts without broadcast exposure.',
    protection:
      'Holds medical text and exact street details behind manual review flags; never auto-discloses clinical notes.',
  },
  {
    scope: 'volunteer',
    icon: Users,
    title: 'Volunteer Distribution Teams',
    need: 'Requires only broad zone, supply category, household count, and fulfillment status.',
    protection:
      'Applies strict minimum-necessary column policies before generating a clean local handover file.',
  },
];

const TRUST_NODES = [
  {
    id: 'input',
    icon: FileCheck2,
    title: 'Local Input',
    sub: 'Paste or File.text()',
    detail: 'Reads uploaded .txt/.csv files strictly via Browser File API up to 5 MB. Binary files and malformed quotes are rejected locally before processing.',
  },
  {
    id: 'detect',
    icon: Network,
    title: 'Detection Engine',
    sub: 'Bounded match + Luhn',
    detail: 'Runs linear-time regex scanners, RFC 5952 IPv6 normalization, Verhoeff labeling, and Luhn validation inside JavaScript RAM or local Web Worker.',
  },
  {
    id: 'redact',
    icon: Lock,
    title: 'Redaction Engine',
    sub: 'Volatile Map scopes',
    detail: 'Maps canonical identifiers in volatile Maps per scope without persisting to localStorage, sessionStorage, or IndexedDB.',
  },
  {
    id: 'export',
    icon: Database,
    title: 'Local Export',
    sub: 'Revoked Blob URL',
    detail: 'Serializes output to a local Blob object URL, triggers download under a neutral filename (clyro-sanitized.csv), and revokes the URL immediately.',
  },
];

const FAQS = [
  {
    q: 'Does Clyro upload my files?',
    a: 'No. Files and pasted records are read via the Browser File API and processed strictly inside JavaScript volatile memory (or a local Web Worker for large inputs). Zero record bytes are transmitted over the network.',
  },
  {
    q: 'Which PII categories are supported?',
    a: 'Clyro detects six core structured categories: Email addresses, Indian mobile numbers (+91, 0-trunk, and 10-digit formats), IPv4 and IPv6 addresses (including compressed and IPv4-mapped forms), Indian PAN format, 12-digit Aadhaar format, and Luhn-validated payment card numbers (13–19 digits).',
  },
  {
    q: 'What is consistent pseudonymization?',
    a: 'Equivalent canonical values of the same category receive the exact same session token (such as EMAIL_001 or PHONE_001) across rows and lines, while distinct entities receive distinct sequential tokens. No lookup map is exported or persisted.',
  },
  {
    q: 'How does credit card validation work?',
    a: 'Candidates of 13–19 digits are checked against repeated-digit heuristics and validated locally using the Luhn checksum algorithm. Invalid 16-digit sequences are rejected from card counts and flagged separately for manual review. A passing checksum never proves an account is live.',
  },
  {
    q: 'Can Clyro detect every type of personal information?',
    a: 'No. Pattern-based detection cannot reliably identify personal names, village or street addresses, free-text medical conditions, or obfuscated text. Users should pair Clyro with manual select-and-redact and human review.',
  },
  {
    q: 'How does organization-specific handover work?',
    a: 'Safe Handover generates an independent cryptographic scope prefix per recipient type (such as NGO_A7F2_PHONE_001 vs HOSPITAL_B8C3_PHONE_001) and pairs it with editable CSV column allowlists so high-risk columns can be excluded before export.',
  },
  {
    q: 'Can Clyro work offline?',
    a: 'Once the static bundle is loaded in your browser tab, 100% of detection, redaction, auditing, and file download works offline with zero network calls. Full closed-tab offline relaunch without network depends on browser cache because no custom Service Worker cache is registered.',
  },
  {
    q: 'Is pseudonymized data anonymous?',
    a: 'No. Pseudonymization replaces direct identifiers with consistent tokens, not irreversible anonymity. Combinations of non-PII attributes such as district, household size, and urgency can still link or re-identify families.',
  },
];

const REVEAL_PROPS = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

export function LandingSections({ interactiveDemo }: { interactiveDemo?: ReactNode }) {
  const { navigate } = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showProtectedProblemPeek, setShowProtectedProblemPeek] = useState(true);
  const [activePipelineIdx, setActivePipelineIdx] = useState<number>(2); // Validation default
  const [validatorProbe, setValidatorProbe] = useState<string>('4111 1111 1111 1112');
  const [bentoMode, setBentoMode] = useState<Mode>('pseudonym');
  const [bentoCategory, setBentoCategory] = useState<(typeof ENTITY_TYPES)[number]>('CARD');
  const [selectedUseCase, setSelectedUseCase] = useState<RecipientType>('ngo');
  const [activeTrustNode, setActiveTrustNode] = useState<string>('detect');

  // Scroll-scrubbed progress rail for Technology Pipeline
  const techSectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: techScroll } = useScroll({
    target: techSectionRef,
    offset: ['start 78%', 'end 42%'],
  });
  const techLineWidth = useTransform(techScroll, [0, 1], ['0%', '100%']);

  // Live Luhn/Detection inspector inside Technology stage
  const probeEval = useMemo(() => {
    const trimmed = validatorProbe.trim();
    const digits = trimmed.replace(/\D/g, '');
    const { entities, flagged } = detectEntitiesInText(trimmed);
    const luhnOk = digits.length >= 13 && digits.length <= 19 ? isValidLuhn(digits) : false;
    const repeated = digits.length >= 13 ? isRepeatedDigitSequence(digits) : false;
    const ipv4Ok = parseIPv4(trimmed) !== null;
    return { entities, flagged, digits, luhnOk, repeated, ipv4Ok };
  }, [validatorProbe]);

  // Live recipient handover simulation for Use Cases section
  const useCaseHandover = useMemo(() => {
    const idMap: Record<RecipientType, string> = {
      default: 'LOCAL',
      ngo: 'A7F2',
      hospital: 'B8C3',
      municipal: 'C4D1',
      volunteer: 'E9A2',
      custom: 'F1B8',
    };
    const reg = createPseudonymRegistry(selectedUseCase, idMap[selectedUseCase]);
    return runSanitizationPipeline({
      input: LANDING_DEMO_CSV,
      format: 'csv',
      mode: 'pseudonym',
      recipientScope: selectedUseCase,
      registry: reg,
    });
  }, [selectedUseCase]);

  const activeNodeMeta = TRUST_NODES.find((n) => n.id === activeTrustNode) ?? TRUST_NODES[0]!;

  return (
    <>
      {/* SECTION 3 — Privacy Principles Strip */}
      <section className="border-t border-b border-[#1B1D1F] bg-[#0C0D0E]">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
          {PRINCIPLES.map((item) => (
            <div key={item} className="flex items-center gap-2.5 text-[12px] font-mono text-[#A3A3A3]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8E6CF]" aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4 — Scroll-Revealed Problem Statement with Interactive Raw vs Protected Peek */}
      <section id="about" className="py-20 sm:py-28 bg-arch-grid">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 space-y-14">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <motion.div {...REVEAL_PROPS} className="max-w-3xl space-y-4">
              <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#737373]">
                Humanitarian Data Dilemma
              </div>
              <h2 className="text-[32px] sm:text-[44px] lg:text-[52px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#F5F5F5]">
                The world needs information.
                <br />
                <span className="text-[#A3A3A3]">Not exposed identities.</span>
              </h2>
            </motion.div>

            <div className="inline-flex p-1 rounded-lg bg-[#0C0D0E] border border-[#26282A] self-start">
              <button
                type="button"
                onClick={() => setShowProtectedProblemPeek(false)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-mono cursor-pointer ${
                  !showProtectedProblemPeek
                    ? 'bg-[#E87D85]/20 text-[#E87D85]'
                    : 'text-[#737373] hover:text-[#F5F5F5]'
                }`}
              >
                Raw Exposure
              </button>
              <button
                type="button"
                onClick={() => setShowProtectedProblemPeek(true)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-mono cursor-pointer ${
                  showProtectedProblemPeek
                    ? 'bg-[#A8E6CF]/15 text-[#A8E6CF]'
                    : 'text-[#737373] hover:text-[#F5F5F5]'
                }`}
              >
                Clyro Handover
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border border-[#1B1D1F] bg-[#0C0D0E]/90 divide-y md:divide-y-0 md:divide-x divide-[#1B1D1F]">
            <motion.div {...REVEAL_PROPS} className="p-7 sm:p-8 space-y-4">
              <div className="w-9 h-9 rounded-md bg-[#111315] border border-[#26282A] flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-[#E87D85]" />
              </div>
              <h3 className="text-[18px] font-semibold tracking-tight text-[#F5F5F5]">
                Sensitive information is exposed during handovers.
              </h3>
              <p className="text-[14px] text-[#A3A3A3] leading-relaxed">
                Emergency intake sheets frequently pass between agencies with phone numbers, Aadhaar numbers, PAN IDs, and payment details intact in raw CSV exports.
              </p>
            </motion.div>

            <motion.div {...REVEAL_PROPS} className="p-7 sm:p-8 space-y-4">
              <div className="w-9 h-9 rounded-md bg-[#111315] border border-[#26282A] flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#F5F5F5]" />
              </div>
              <h3 className="text-[18px] font-semibold tracking-tight text-[#F5F5F5]">
                Relief teams still need actionable operational data.
              </h3>
              <p className="text-[14px] text-[#A3A3A3] leading-relaxed">
                Coordinating shelter, drinking water, food packets, and medical referrals depends on preserving district, household size, and urgency cleanly.
              </p>
            </motion.div>

            <motion.div {...REVEAL_PROPS} className="p-7 sm:p-8 space-y-4">
              <div className="w-9 h-9 rounded-md bg-[#111315] border border-[#26282A] flex items-center justify-center">
                <Lock className="w-4 h-4 text-[#A8E6CF]" />
              </div>
              <h3 className="text-[18px] font-semibold tracking-tight text-[#F5F5F5]">
                Clyro helps minimize unnecessary disclosure locally.
              </h3>
              <div className="p-3 rounded-lg bg-[#050505] border border-[#1B1D1F] font-mono text-[11px] space-y-1">
                <div className="text-[#737373]">DEMO-001 • Pune • Family: 5 • Food &amp; shelter</div>
                {showProtectedProblemPeek ? (
                  <div className="text-[#A8E6CF]">
                    NGO_A7F2_EMAIL_001 • NGO_A7F2_PHONE_001 • [ID columns stripped]
                  </div>
                ) : (
                  <div className="text-[#E87D85]">
                    ravi@example.com • +91 98765 43210 • 2345 6789 0123
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — Interactive Product Demonstration */}
      {interactiveDemo}

      <div className="h-10 border-t border-b border-[#1B1D1F] bg-diagonal-hatch" aria-hidden="true" />

      {/* SECTION 6 — Scroll-Interactive Technology Pipeline + Live Validator Probe */}
      <section id="technology" ref={techSectionRef} className="py-20 sm:py-28">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 space-y-12">
          <motion.div {...REVEAL_PROPS} className="max-w-3xl space-y-4">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#A8E6CF]">
              Scroll-Synced Local Pipeline
            </div>
            <h2 className="text-[32px] sm:text-[44px] lg:text-[52px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#F5F5F5]">
              Privacy engineered into every step.
            </h2>
            <p className="text-[15px] text-[#A3A3A3] leading-relaxed">
              Luhn checksums eliminate false-positive credit card triggers on tracking numbers, while format matching on PAN and Aadhaar explicitly avoids false claims of government identity verification. Click any stage below to inspect it live.
            </p>
          </motion.div>

          {/* Scroll-driven progress track */}
          <div className="space-y-4">
            <div className="h-[2px] w-full bg-[#1B1D1F] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#A8E6CF]"
                style={{ width: techLineWidth }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-px bg-[#1B1D1F] border border-[#1B1D1F]">
              {PIPELINE_STEPS.map((step, idx) => {
                const selected = activePipelineIdx === idx;
                return (
                  <button
                    key={step.code}
                    type="button"
                    onClick={() => setActivePipelineIdx(idx)}
                    className={`text-left p-5 flex flex-col justify-between gap-4 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#111315] ring-1 ring-inset ring-[#A8E6CF]/50'
                        : 'bg-[#0C0D0E] hover:bg-[#111315]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`font-mono text-[11px] ${
                          selected ? 'text-[#A8E6CF]' : 'text-[#737373]'
                        }`}
                      >
                        {step.code}
                      </span>
                      <ArrowRight
                        className={`w-3.5 h-3.5 hidden lg:block ${
                          selected ? 'text-[#A8E6CF]' : 'text-[#26282A]'
                        }`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-[15px] font-semibold text-[#F5F5F5]">{step.title}</h3>
                      <p className="text-[12.5px] text-[#A3A3A3] leading-relaxed">{step.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Stage Inspector */}
          <div className="p-6 rounded-xl bg-[#0C0D0E] border border-[#26282A] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1B1D1F]">
              <div className="font-mono text-[12px] text-[#A8E6CF]">
                STAGE {PIPELINE_STEPS[activePipelineIdx]?.code} INSPECTOR —{' '}
                {PIPELINE_STEPS[activePipelineIdx]?.title.toUpperCase()}
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                {(
                  [
                    ['Valid Card', '4111 1111 1111 1111'],
                    ['Invalid Luhn', '4111 1111 1111 1112'],
                    ['Invalid IP', '999.1.2.3'],
                    ['IPv6 + Phone', '2001:db8::1 / +91 98765 43210'],
                  ] as const
                ).map(([label, val]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setValidatorProbe(val)}
                    className="px-2.5 py-1 rounded bg-[#111315] border border-[#26282A] text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-6 space-y-2">
                <label
                  htmlFor="pipeline-probe-input"
                  className="block text-[11px] font-mono uppercase tracking-wider text-[#737373]"
                >
                  Live Local Validator Input
                </label>
                <input
                  id="pipeline-probe-input"
                  type="text"
                  value={validatorProbe}
                  onChange={(e) => setValidatorProbe(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#050505] border border-[#26282A] font-mono text-[13px] text-[#F5F5F5] focus:border-[#A8E6CF] focus:outline-none"
                />
              </div>

              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px] font-mono">
                <div className="p-3 rounded-lg bg-[#111315] border border-[#1B1D1F] space-y-1">
                  <div className="text-[#737373] text-[10px] uppercase">Accepted Entities</div>
                  {probeEval.entities.length > 0 ? (
                    probeEval.entities.map((ent) => (
                      <div key={ent.id} className="flex items-center gap-1.5 text-[#6DD6A4]">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {ent.type}: {ent.canonical}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[#A3A3A3]">0 accepted entities</div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-[#111315] border border-[#1B1D1F] space-y-1">
                  <div className="text-[#737373] text-[10px] uppercase">Validation / Rejections</div>
                  {probeEval.flagged.length > 0 ? (
                    probeEval.flagged.map((f) => (
                      <div key={f.id} className="flex items-start gap-1.5 text-[#E6BA70]">
                        <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="text-[11px] font-sans">{f.reason}</span>
                      </div>
                    ))
                  ) : probeEval.entities.length > 0 ? (
                    <div className="text-[#A8E6CF]">Passed active format/checksum checks</div>
                  ) : (
                    <div className="text-[#737373]">Type a card, IP, email, PAN, or Aadhaar</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — Interactive Core Capabilities Bento Grid */}
      <section className="py-20 sm:py-28 border-t border-[#1B1D1F] bg-[#0C0D0E]/50">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 space-y-12">
          <div className="space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#737373]">
              Core Capabilities
            </div>
            <h2 className="text-[32px] sm:text-[42px] font-semibold tracking-[-0.03em] text-[#F5F5F5]">
              Share what matters. Protect everything else.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* 1. Intelligent PII Detection */}
            <div className="md:col-span-7 p-6 rounded-xl bg-[#0C0D0E] border border-[#26282A] hover:border-[#3A3D40] transition-colors flex flex-col justify-between gap-6">
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-[#A8E6CF]">01 • BOUNDED DETECTORS</div>
                <h3 className="text-[20px] font-semibold text-[#F5F5F5]">Intelligent PII Detection</h3>
                <p className="text-[13.5px] text-[#A3A3A3]">
                  Select any category below to inspect its exact normalization &amp; validation rule.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                {(
                  [
                    ['EMAIL', 'Bounded domain', 'Domain lowercased'],
                    ['PHONE', '+91 / 0 / 10-digit', 'Normalized +91XXXXXXXXXX'],
                    ['IP', 'IPv4 / IPv6', 'RFC 5952 + 0–255 octets'],
                    ['PAN', '5L+4D+1L', 'Uppercase canonical'],
                    ['AADHAAR', '12 digits (2–9)', 'Verhoeff labeled locally'],
                    ['CARD', '13–19 digits', 'Luhn + repeat heuristic'],
                  ] as const
                ).map(([type, title, rule]) => {
                  const meta = ENTITY_META[type];
                  const active = bentoCategory === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBentoCategory(type)}
                      className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#191B1D] border-[#A8E6CF]/50'
                          : 'bg-[#111315] border-[#1B1D1F] hover:border-[#26282A]'
                      }`}
                    >
                      <div className="text-[#A8E6CF]">
                        {meta.shortCode} • {meta.label}
                      </div>
                      <div className="text-[#737373] text-[10px] mt-0.5">
                        {active ? rule : title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Interactive Three Redaction Modes */}
            <div className="md:col-span-5 p-6 rounded-xl bg-[#0C0D0E] border border-[#26282A] hover:border-[#3A3D40] transition-colors flex flex-col justify-between gap-6">
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-[#A8E6CF]">02 • TRANSFORMATION</div>
                <h3 className="text-[20px] font-semibold text-[#F5F5F5]">Three Redaction Modes</h3>
                <p className="text-[13.5px] text-[#A3A3A3]">
                  Click a mode to preview live transformation on a synthetic Aadhaar &amp; Email record.
                </p>
              </div>
              <div className="space-y-2 font-mono text-[11.5px]">
                {(
                  [
                    ['full', 'Full Mask', '[REDACTED]'],
                    ['partial', 'Partial Mask', 'XXXX-XXXX-0123 / r***@***'],
                    ['pseudonym', 'Pseudonym', 'AADHAAR_001 / EMAIL_001'],
                  ] as const
                ).map(([id, label, preview]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBentoMode(id)}
                    className={`w-full flex justify-between p-2.5 rounded border cursor-pointer ${
                      bentoMode === id
                        ? 'bg-[#191B1D] border-[#A8E6CF]/50 text-[#A8E6CF]'
                        : 'bg-[#111315] border-[#1B1D1F] text-[#737373] hover:text-[#F5F5F5]'
                    }`}
                  >
                    <span>{label}</span>
                    <span className={bentoMode === id ? 'text-[#F5F5F5]' : ''}>{preview}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3, 4, 5 */}
            <div className="md:col-span-4 p-6 rounded-xl bg-[#0C0D0E] border border-[#26282A] hover:border-[#3A3D40] transition-colors space-y-4">
              <HardDrive className="w-5 h-5 text-[#A8E6CF]" />
              <div className="space-y-1.5">
                <h3 className="text-[18px] font-semibold text-[#F5F5F5]">Local Processing</h3>
                <p className="text-[13px] text-[#A3A3A3]">
                  Operates strictly in browser RAM and local Web Workers. Never invokes remote AI APIs or persists records to browser storage.
                </p>
              </div>
            </div>

            <div className="md:col-span-4 p-6 rounded-xl bg-[#0C0D0E] border border-[#26282A] hover:border-[#3A3D40] transition-colors space-y-4">
              <EyeOff className="w-5 h-5 text-[#F5F5F5]" />
              <div className="space-y-1.5">
                <h3 className="text-[18px] font-semibold text-[#F5F5F5]">Live Comparison</h3>
                <p className="text-[13px] text-[#A3A3A3]">
                  Synchronized split-screen TXT and structured CSV cell comparison rendered exclusively via inert text nodes.
                </p>
              </div>
            </div>

            <div className="md:col-span-4 p-6 rounded-xl bg-[#0C0D0E] border border-[#26282A] hover:border-[#3A3D40] transition-colors space-y-4">
              <Fingerprint className="w-5 h-5 text-[#A8E6CF]" />
              <div className="space-y-1.5">
                <h3 className="text-[18px] font-semibold text-[#F5F5F5]">Organization Handover</h3>
                <p className="text-[13px] text-[#A3A3A3]">
                  Separate Web Crypto scope tokens (<code className="text-[#A8E6CF]">NGO_A7F2_...</code>) and editable column minimization allowlists.
                </p>
              </div>
            </div>

            {/* 6. Privacy Audit */}
            <div className="md:col-span-12 p-6 rounded-xl bg-[#0C0D0E] border border-[#26282A] hover:border-[#3A3D40] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="text-[11px] font-mono text-[#A8E6CF]">06 • VERIFIABLE COUNTS</div>
                <h3 className="text-[20px] font-semibold text-[#F5F5F5]">Count-Based Privacy Audit</h3>
                <p className="text-[13.5px] text-[#A3A3A3]">
                  Reconciles occurrences, unique canonical counts, Luhn rejections, and retained/removed column policies without leaking any sensitive values or lookup maps.
                </p>
              </div>
              <div className="flex items-center gap-3 font-mono text-[12px] shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/app/audit')}
                  className="px-3.5 py-2 rounded-lg bg-[#111315] border border-[#26282A] text-[#F5F5F5] hover:border-[#A8E6CF]/50 cursor-pointer"
                >
                  Open Privacy Audit →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8 — Interactive Humanitarian Use Cases */}
      <section id="use-cases" className="py-20 sm:py-28 border-t border-[#1B1D1F]">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 space-y-10">
          <motion.div {...REVEAL_PROPS} className="max-w-2xl space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#737373]">
              Operational Coordination • Click Any Role To Preview Policy
            </div>
            <h2 className="text-[32px] sm:text-[44px] font-semibold tracking-[-0.03em] text-[#F5F5F5]">
              Built for information that matters.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {USE_CASES.map((uc) => {
              const Icon = uc.icon;
              const active = selectedUseCase === uc.scope;
              return (
                <button
                  key={uc.title}
                  type="button"
                  onClick={() => setSelectedUseCase(uc.scope)}
                  className={`text-left p-6 sm:p-7 rounded-xl border transition-colors space-y-4 cursor-pointer ${
                    active
                      ? 'bg-[#111315] border-[#A8E6CF]/60'
                      : 'bg-[#0C0D0E] border-[#1B1D1F] hover:border-[#26282A]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-[#111315] border border-[#26282A] flex items-center justify-center">
                        <Icon className="w-4 h-4 text-[#A8E6CF]" />
                      </div>
                      <h3 className="text-[18px] font-semibold text-[#F5F5F5]">{uc.title}</h3>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                        active ? 'bg-[#A8E6CF]/15 text-[#A8E6CF]' : 'text-[#737373]'
                      }`}
                    >
                      {active ? 'Active Preview' : 'Inspect Policy'}
                    </span>
                  </div>
                  <div className="space-y-2 text-[13.5px]">
                    <p className="text-[#D4D4D4]">
                      <span className="text-[#737373] font-mono text-[11px] uppercase mr-2">Need:</span>
                      {uc.need}
                    </p>
                    <p className="text-[#A3A3A3]">
                      <span className="text-[#A8E6CF] font-mono text-[11px] uppercase mr-2">Control:</span>
                      {uc.protection}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live policy minimization preview driven by real engine */}
          <div className="p-5 rounded-xl bg-[#0C0D0E] border border-[#26282A] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="font-mono text-[11px] text-[#A8E6CF] uppercase">
                Live Policy Result — {RECIPIENT_PRESETS[selectedUseCase].label}
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                {useCaseHandover.columnPolicies.map((col) => (
                  <span
                    key={col.colIndex}
                    className={`px-2 py-0.5 rounded border ${
                      col.retained
                        ? 'bg-[#6DD6A4]/10 border-[#6DD6A4]/35 text-[#6DD6A4]'
                        : 'bg-[#050505] border-[#1B1D1F] text-[#737373] line-through'
                    }`}
                  >
                    {col.name}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/handover')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium border border-[#26282A] bg-[#111315] text-[#F5F5F5] hover:border-[#A8E6CF]/50 shrink-0 cursor-pointer self-start lg:self-auto"
            >
              <span>Configure in Safe Handover</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#A8E6CF]" />
            </button>
          </div>
        </div>
      </section>

      <div className="h-10 border-t border-b border-[#1B1D1F] bg-diagonal-hatch" aria-hidden="true" />

      {/* SECTION 9 — Interactive Privacy Architecture */}
      <section id="privacy" className="py-20 sm:py-28">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 space-y-12">
          <div className="max-w-3xl space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#A8E6CF]">
              Browser Trust Boundary
            </div>
            <h2 className="text-[32px] sm:text-[44px] font-semibold tracking-[-0.03em] text-[#F5F5F5]">
              Your data stays where it belongs.
            </h2>
            <p className="text-[15px] text-[#A3A3A3] leading-relaxed">
              Static application code is fetched once on page load. User records never cross the browser boundary. Click any stage inside the browser perimeter to inspect its guarantee.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Browser Boundary Diagram */}
            <div className="lg:col-span-8 p-6 rounded-xl bg-[#0C0D0E] border border-[#26282A] space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1B1D1F]">
                <span className="font-mono text-[12px] text-[#A8E6CF]">
                  INSIDE USER&apos;S BROWSER (VOLATILE RAM ONLY)
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#111315] border border-[#26282A] text-[#A3A3A3]">
                  connect-src &apos;none&apos; in production CSP
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[12px]">
                {TRUST_NODES.map((box) => {
                  const Icon = box.icon;
                  const active = activeTrustNode === box.id;
                  return (
                    <button
                      key={box.id}
                      type="button"
                      onClick={() => setActiveTrustNode(box.id)}
                      className={`text-left p-3.5 rounded-lg border space-y-1.5 transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#191B1D] border-[#A8E6CF]/60'
                          : 'bg-[#111315] border-[#1B1D1F] hover:border-[#26282A]'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-[#A8E6CF]" />
                      <div className="font-semibold text-[#F5F5F5]">{box.title}</div>
                      <div className="text-[#737373] font-mono text-[11px]">{box.sub}</div>
                    </button>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-lg bg-[#111315] border border-[#1B1D1F] text-[12.5px] text-[#D4D4D4]">
                <span className="font-mono text-[11px] text-[#A8E6CF] mr-2">
                  [{activeNodeMeta.title.toUpperCase()}]
                </span>
                {activeNodeMeta.detail}
              </div>

              <div className="p-3.5 rounded-lg bg-[#050505] border border-dashed border-[#E87D85]/35 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <span className="font-mono text-[#E87D85]">
                  HARD BOUNDARY — ZERO TRANSMISSION TO EXTERNAL SERVERS
                </span>
                <span className="text-[#737373]">
                  No remote LLM • No telemetry • No persistent storage
                </span>
              </div>
            </div>

            {/* Honest Limitations Card */}
            <div className="lg:col-span-4 p-6 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <h3 className="text-[16px] font-semibold text-[#F5F5F5]">
                  Honest Security Boundaries
                </h3>
                <p className="text-[12.5px] text-[#A3A3A3] leading-relaxed">
                  Clyro does not promise complete anonymity, secure physical memory deletion, or legal certification.
                </p>
                <ul className="space-y-1.5 text-[12px] text-[#A3A3A3] list-disc pl-4">
                  <li>Browser extensions can inspect page DOM.</li>
                  <li>Shared devices &amp; exported files pose local risks.</li>
                  <li>Names, addresses &amp; free-text medical notes may escape regex detection.</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => navigate('/app/privacy')}
                className="text-left text-[12px] font-medium text-[#A8E6CF] hover:underline cursor-pointer"
              >
                Read full Privacy Guide →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10 — FAQ */}
      <section className="py-20 sm:py-28 border-t border-[#1B1D1F] bg-[#0C0D0E]/40">
        <div className="max-w-[920px] mx-auto px-5 sm:px-8 space-y-10">
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#737373]">
              Questions & Verification
            </div>
            <h2 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.03em] text-[#F5F5F5]">
              Frequently asked questions.
            </h2>
          </div>

          <div className="divide-y divide-[#1B1D1F] border-t border-b border-[#1B1D1F]">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="py-4">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left py-1 cursor-pointer"
                  >
                    <span className="text-[15px] font-medium text-[#F5F5F5]">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#737373] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-[#A8E6CF]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-2.5 text-[13.5px] text-[#A3A3A3] leading-relaxed pr-6">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 11 — Final Call To Action */}
      <section className="relative py-24 sm:py-32 border-t border-[#1B1D1F] overflow-hidden">
        <div className="absolute inset-0 opacity-45 pointer-events-none">
          <WireframeFunnelCanvas subtle />
        </div>
        <div className="relative z-10 max-w-[900px] mx-auto px-5 sm:px-8 text-center space-y-6">
          <h2 className="text-[36px] sm:text-[52px] font-semibold leading-[1.06] tracking-[-0.035em] text-[#F5F5F5]">
            Share help.
            <br />
            <span className="text-[#A8E6CF]">Not identities.</span>
          </h2>
          <p className="text-[15px] sm:text-[17px] text-[#A3A3A3] max-w-xl mx-auto">
            Prepare safer data handovers, directly from your browser.
          </p>
          <div>
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold bg-[#F5F5F5] text-[#050505] hover:bg-[#A8E6CF] transition-colors cursor-pointer"
            >
              <span>Launch Clyro</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 12 — Footer */}
      <footer className="border-t border-[#1B1D1F] bg-[#050505] py-12">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="space-y-2.5 max-w-sm">
              <ClyroLogo />
              <p className="text-[13px] text-[#A3A3A3]">
                Save Lives. Share Help. Protect Identities.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-[13px]">
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                  Application
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="block text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Data Sanitizer
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/app/handover')}
                  className="block text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Safe Handover
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/app/audit')}
                  className="block text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Privacy Audit
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                  Documentation
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/app/how-it-works')}
                  className="block text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
                >
                  How It Works
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/app/privacy')}
                  className="block text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Privacy Guide
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/app/settings')}
                  className="block text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Settings
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#1B1D1F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px] text-[#737373]">
            <span>
              Disclaimer: Clyro is a browser-based sanitization aid, not a guarantee of complete anonymity or legal compliance.
            </span>
            <span className="font-mono">Local Client-Side Build</span>
          </div>
        </div>
      </footer>
    </>
  );
}
