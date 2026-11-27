import { ArrowRight, CheckCircle2, Layers, Lock, ShieldCheck } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';

const STAGES = [
  {
    step: '01',
    name: 'Local Input & Parse',
    summary:
      'Reads pasted text or local .txt/.csv files (up to 5 MB) via the Browser File API. Strips UTF-8 BOM, handles quoted commas, escaped quotes, multiline CSV fields, and rejects malformed quotes.',
  },
  {
    step: '02',
    name: 'Bounded Detection',
    summary:
      'Executes linear-time bounded regex scanners per cell or text buffer across Email, Indian Phone (+91/0/10-digit), IPv4/IPv6, PAN, Aadhaar, and 13–19 digit payment card candidates.',
  },
  {
    step: '03',
    name: 'Checksum & Structure Validation',
    summary:
      'Runs Luhn checksum + repeated-digit heuristics on card candidates, octet bounds (0–255) on IPv4, RFC 4291/5952 parsing on IPv6, and local Verhoeff labeling on Aadhaar candidates. Never contacts external registries.',
  },
  {
    step: '04',
    name: 'Overlap Resolution & Canonicalization',
    summary:
      'Sorts spans deterministically by priority (Email > Card > IP > Aadhaar > PAN > Phone), confidence, and length. Prevents phone/Aadhaar double-counting inside validated cards and normalizes canonical keys.',
  },
  {
    step: '05',
    name: 'Transformation & Audit',
    summary:
      'Applies Full Mask ([REDACTED]), conservative Partial Mask, or deterministic per-scope Pseudonymization (EMAIL_001 / NGO_A7F2_PHONE_001), reconciling counts and audit coverage locally.',
  },
  {
    step: '06',
    name: 'Neutral Export',
    summary:
      'Serializes sanitized TXT or CSV (with optional spreadsheet formula neutralization) via local Blob + URL.createObjectURL, revokes object URLs immediately, and uses neutral filenames.',
  },
];

export function HowItWorksPage() {
  const { navigate } = useRouter();

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.025em] text-[#F5F5F5]">
          How Clyro Works
        </h1>
        <p className="text-[14px] text-[#A3A3A3] mt-1">
          Deterministic local pipeline executed entirely in browser volatile memory.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STAGES.map((stage) => (
          <div
            key={stage.step}
            className="p-5 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-[#A8E6CF] px-2 py-0.5 rounded bg-[#A8E6CF]/10 border border-[#A8E6CF]/30">
                STAGE {stage.step}
              </span>
              <Layers className="w-4 h-4 text-[#737373]" />
            </div>
            <h2 className="text-[16px] font-semibold text-[#F5F5F5]">{stage.name}</h2>
            <p className="text-[13px] text-[#A3A3A3] leading-relaxed">{stage.summary}</p>
          </div>
        ))}
      </div>

      <section className="p-5 rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#A8E6CF]" />
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">
            Format Detection vs. Identity Verification
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px] text-[#A3A3A3]">
          <div className="p-3.5 rounded-lg bg-[#111315] border border-[#1B1D1F] space-y-1.5">
            <div className="font-medium text-[#F5F5F5] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6DD6A4]" />
              <span>Luhn Validation (Credit Cards)</span>
            </div>
            <p className="text-[12px]">
              Luhn filters out random 16-digit tracking IDs and typos so only valid-checksum card numbers are categorized as cards. A passing Luhn checksum does not prove an active bank account.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#111315] border border-[#1B1D1F] space-y-1.5">
            <div className="font-medium text-[#F5F5F5] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#E6BA70]" />
              <span>PAN & Aadhaar Format Detection</span>
            </div>
            <p className="text-[12px]">
              PAN and Aadhaar checks match structural shape and run local Verhoeff math on 12-digit Aadhaar candidates. Clyro never queries UIDAI or tax registries, and masks format-matched Aadhaar conservatively even if Verhoeff fails.
            </p>
          </div>
        </div>
      </section>

      <div>
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium bg-[#F5F5F5] text-[#050505] hover:bg-[#A8E6CF] cursor-pointer"
        >
          <span>Open Data Sanitizer</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
