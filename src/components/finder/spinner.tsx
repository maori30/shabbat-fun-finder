export const Spinner = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-90"
      fill="currentColor"
      d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2z"
    />
  </svg>
);
