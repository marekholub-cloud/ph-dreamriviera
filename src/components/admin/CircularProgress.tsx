import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'green' | 'blue' | 'orange' | 'teal' | 'purple' | 'default';
  showPercentage?: boolean;
  className?: string;
}

const variantColors = {
  green: {
    track: 'stroke-crm-primary-dark/30',
    progress: 'stroke-crm-primary-light',
    gradient: ['hsl(152, 69%, 45%)', 'hsl(145, 65%, 39%)'],
  },
  blue: {
    track: 'stroke-crm-accent-blue/20',
    progress: 'stroke-crm-accent-blue',
    gradient: ['hsl(207, 90%, 54%)', 'hsl(207, 75%, 45%)'],
  },
  orange: {
    track: 'stroke-crm-accent-orange/20',
    progress: 'stroke-crm-accent-orange',
    gradient: ['hsl(27, 98%, 54%)', 'hsl(27, 80%, 45%)'],
  },
  teal: {
    track: 'stroke-crm-accent-teal/20',
    progress: 'stroke-crm-accent-teal',
    gradient: ['hsl(174, 72%, 45%)', 'hsl(174, 60%, 35%)'],
  },
  purple: {
    track: 'stroke-crm-accent-purple/20',
    progress: 'stroke-crm-accent-purple',
    gradient: ['hsl(263, 70%, 55%)', 'hsl(263, 60%, 45%)'],
  },
  default: {
    track: 'stroke-primary/15',
    progress: 'stroke-primary',
    gradient: ['hsl(239, 96%, 70%)', 'hsl(239, 96%, 55%)'],
  },
};

export function CircularProgress({
  value,
  maxValue = 100,
  size = 48,
  strokeWidth = 4,
  variant = 'default',
  showPercentage = false,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100);
  const offset = circumference - (percentage / 100) * circumference;
  
  const colors = variantColors[variant];
  const gradientId = `progress-gradient-${variant}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.gradient[0]} />
            <stop offset="100%" stopColor={colors.gradient[1]} />
          </linearGradient>
        </defs>
        
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={colors.track}
        />
        
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {showPercentage && (
        <span className="absolute text-xs font-semibold text-foreground">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}