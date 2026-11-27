import { AlertTriangle, Check, EyeOff, HardDrive, ShieldAlert } from 'lucide-react';

export function PrivacyGuidePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.025em] text-[#F5F5F5]">
          Privacy Architecture & Limitations
        </h1>
        <p className="text-[14px] text-[#A3A3A3] mt-1">
          Transparent engineering disclosures for humanitarian teams preparing local data handovers.
        </p>
      </div>

      <section className="rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[#A8E6CF]" />
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">
            Static Delivery vs. Zero-Upload Processing
          </h2>
        </div>
        <p className="text-[13px] text-[#A3A3A3] leading-relaxed">
          When you open Clyro, your browser loads static HTML, JavaScript, CSS, and locally bundled font files once from the static web host. From that point forward, every file read, paste action, detection pass, pseudonym assignment, audit calculation, and file export happens exclusively inside browser volatile memory.
        </p>
        <ul className="space-y-2 text-[12.5px] text-[#D4D4D4]">
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-[#6DD6A4] shrink-0" />
            <span>Zero backend APIs, external AI inference calls, analytics, or telemetry.</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-[#6DD6A4] shrink-0" />
            <span>Zero persistence of records, mappings, or sanitized output in localStorage, sessionStorage, IndexedDB, or Service Worker caches.</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-[#6DD6A4] shrink-0" />
            <span>All user text is rendered strictly as inert DOM text nodes (never innerHTML).</span>
          </li>
        </ul>
      </section>

      <section className="rounded-xl bg-[#0C0D0E] border border-[#1B1D1F] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#E6BA70]" />
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">
            Honest Operational Risks & Limitations
          </h2>
        </div>
        <div className="space-y-3 text-[13px] text-[#A3A3A3] leading-relaxed">
          <p>
            <strong className="text-[#F5F5F5]">1. Pattern-based detection is not exhaustive:</strong> Personal names, village/street addresses, free-text medical histories, regional IDs, and obfuscated numbers are not automatically detected by the six core categories. Use manual select-and-redact and human review before sharing.
          </p>
          <p>
            <strong className="text-[#F5F5F5]">2. Pseudonymization is not anonymization:</strong> Consistent session tokens (<code className="text-[#A8E6CF]">EMAIL_001</code>) and even recipient-scoped tokens (<code className="text-[#A8E6CF]">NGO_A7F2_PHONE_001</code>) do not make records anonymous. Unique combinations of district, family size, and assistance notes can still correlate records across agencies.
          </p>
          <p>
            <strong className="text-[#F5F5F5]">3. Endpoint and environment risks remain:</strong> Malicious browser extensions, shared computers, OS swap files, screenshots, clipboard history, and unencrypted downstream transfers outside Clyro are outside browser application control.
          </p>
          <p>
            <strong className="text-[#F5F5F5]">4. JavaScript memory semantics:</strong> Clicking <em>Reset Session</em> clears React state, pseudonym maps, undo history, and terminates Web Workers, though JavaScript runtimes cannot guarantee immediate physical RAM overwriting.
          </p>
        </div>
      </section>

      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-[#E6BA70]/10 border border-[#E6BA70]/30 text-[12.5px] text-[#F4D8A8]">
        <AlertTriangle className="w-4 h-4 text-[#E6BA70] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Not Legal Compliance or Certification:</span> Clyro is a technical handover preparation aid, not a substitute for organizational data governance, lawful basis review, or encrypted transport channels.
        </div>
      </div>

      <div className="flex items-center gap-2 text-[12px] text-[#737373]">
        <EyeOff className="w-4 h-4" />
        <span>Verify zero network egress yourself anytime using Browser DevTools → Network.</span>
      </div>
    </div>
  );
}
