interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
  className?: string;
  tone?: "monochrome" | "dynamic";
}

export function CircularProgress({
  value,
  size = 54,
  strokeWidth = 4.5,
  showText = true,
  className = "",
}: CircularProgressProps) {
  const normalizedValue = Math.min(100, Math.max(0, Math.round(value)));
  const radius = (size - strokeWidth - 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  // Pure black for active progress with intense contrast
  const strokeColor = normalizedValue > 0 ? "#000000" : "transparent";

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      role="progressbar"
      aria-valuenow={normalizedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${normalizedValue}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90 transform">
        {/* 1. Increased intensity grey back fill / space */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#cbd5e1"
          strokeWidth={strokeWidth}
          className="fill-transparent"
        />

        {/* 2. Pure black progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="fill-transparent transition-all duration-700 ease-out"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25))" }}
        />
      </svg>

      {showText && (
        <span
          className="absolute font-display font-extrabold leading-none tabular-nums text-black"
          style={{
            fontSize:
              size <= 30
                ? "7.5px"
                : size <= 44
                  ? "11.5px"
                  : size <= 54
                    ? "13px"
                    : size <= 64
                      ? "15px"
                      : "18px",
          }}
        >
          {normalizedValue}%
        </span>
      )}
    </div>
  );
}
