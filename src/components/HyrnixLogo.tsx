export default function HyrnixLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
    >
      <rect x="4" y="4" width="56" height="56" rx="16" fill="var(--primary)" />
      <path
        d="M32 14 C33 22 34 30 42 32 C34 34 33 42 32 50 C31 42 30 34 22 32 C30 30 31 22 32 14 Z"
        fill="var(--primary-foreground)"
      />
    </svg>
  );
}
