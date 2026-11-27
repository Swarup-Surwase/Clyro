type ClyroLogoProps = {
  compact?: boolean;
  className?: string;
};

export function ClyroLogo({ compact = false, className = '' }: ClyroLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="6.5" fill="#0C0D0E" stroke="#26282A" strokeWidth="1.2" />
        {/* Abstract C boundary representing privacy perimeter */}
        <path
          d="M21 9.8C19.35 8.35 17.25 7.5 14.9 7.5C9.98 7.5 6 11.3 6 16C6 20.7 9.98 24.5 14.9 24.5C17.25 24.5 19.35 23.65 21 22.2"
          stroke="#F5F5F5"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        {/* Converging raw stream */}
        <path
          d="M12.2 12.6L16.1 16L12.2 19.4"
          stroke="#737373"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Protected mint output vector */}
        <path
          d="M17.2 16H26"
          stroke="#A8E6CF"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <circle cx="26" cy="16" r="1.6" fill="#A8E6CF" />
      </svg>
      {!compact && (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[16px] font-semibold tracking-[-0.025em] text-[#F5F5F5]">
            Clyro
          </span>
        </span>
      )}
    </span>
  );
}
