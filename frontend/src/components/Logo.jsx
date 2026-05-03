export default function Logo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="8" r="5" fill="#34d399" />
      <path
        d="M24 15c-3 0-5 2-5 5v10h3v10h4V30h3V20c0-3-2-5-5-5z"
        fill="#34d399"
      />
      <path
        d="M15 22l4 6M33 22l-4 6"
        stroke="#34d399"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M21 40l-3 6M27 40l3 6"
        stroke="#34d399"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="37" cy="11" r="8" fill="#059669" />
      <path
        d="M33 11l2.5 2.5L39 9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
