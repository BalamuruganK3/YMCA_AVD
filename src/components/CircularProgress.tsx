import { getCircularColor } from "@/lib/constants";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
  className?: string;
}

export function CircularProgress({
  value,
  size = 52,
  strokeWidth = 5,
  showText = true,
  className = "",
}: CircularProgressProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  const colorConfig = getCircularColor(normalizedValue);

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg width={size} height={size} className="-rotate-90 transform">
        {/* Track background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border/40 fill-transparent"
        />
        {/* Animated Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colorConfig.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="fill-transparent transition-all duration-500 ease-out"
        />
      </svg>
      {showText && (
        <span
          className={`absolute font-display font-bold leading-none ${colorConfig.text}`}
          style={{ fontSize: size <= 48 ? "12px" : "14px" }}
        >
          {normalizedValue}%
        </span>
      )}
    </div>
  );
}
