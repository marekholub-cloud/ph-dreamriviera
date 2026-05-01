import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { CircularProgress } from "./CircularProgress";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  Icon?: LucideIcon;
  progress?: number;
  maxProgress?: number;
  variant?: 'green' | 'blue' | 'orange' | 'dark' | 'teal' | 'purple';
  className?: string;
}

const variantStyles = {
  green: {
    bg: "bg-gradient-to-br from-[hsl(152,69%,25%)] to-[hsl(152,50%,15%)]",
    border: "border-crm-primary/30",
    text: "text-white",
    subtext: "text-white/70",
    progressVariant: 'green' as const,
  },
  blue: {
    bg: "bg-gradient-to-br from-[hsl(207,75%,30%)] to-[hsl(207,60%,18%)]",
    border: "border-crm-accent-blue/30",
    text: "text-white",
    subtext: "text-white/70",
    progressVariant: 'blue' as const,
  },
  orange: {
    bg: "bg-gradient-to-br from-[hsl(27,80%,35%)] to-[hsl(27,60%,20%)]",
    border: "border-crm-accent-orange/30",
    text: "text-white",
    subtext: "text-white/70",
    progressVariant: 'orange' as const,
  },
  teal: {
    bg: "bg-gradient-to-br from-[hsl(174,72%,30%)] to-[hsl(174,50%,18%)]",
    border: "border-crm-accent-teal/30",
    text: "text-white",
    subtext: "text-white/70",
    progressVariant: 'teal' as const,
  },
  purple: {
    bg: "bg-gradient-to-br from-[hsl(263,70%,35%)] to-[hsl(263,50%,22%)]",
    border: "border-crm-accent-purple/30",
    text: "text-white",
    subtext: "text-white/70",
    progressVariant: 'purple' as const,
  },
  dark: {
    bg: "bg-gradient-to-br from-[hsl(220,15%,18%)] to-[hsl(220,15%,12%)]",
    border: "border-border/50",
    text: "text-foreground",
    subtext: "text-muted-foreground",
    progressVariant: 'default' as const,
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  Icon,
  progress,
  maxProgress = 100,
  variant = 'dark',
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/20 hover:scale-[1.02]",
        styles.bg,
        styles.border,
        "border",
        className
      )}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn("text-2xl font-semibold", styles.text)}>
                {value}
              </p>
              <p className={cn("text-xs font-medium mt-1", styles.subtext)}>
                {title}
              </p>
              {subtitle && (
                <p className={cn("text-xs mt-0.5", styles.subtext)}>
                  {subtitle}
                </p>
              )}
            </div>

            {/* Progress Circle or Icon */}
            <div className="flex-shrink-0">
              {progress !== undefined ? (
                <CircularProgress
                  value={progress}
                  maxValue={maxProgress}
                  size={56}
                  strokeWidth={5}
                  variant={styles.progressVariant}
                />
              ) : Icon ? (
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center",
                  variant === 'dark' ? "bg-muted/50" : "bg-white/10"
                )}>
                  <Icon className={cn("h-7 w-7", styles.text)} />
                </div>
              ) : icon ? (
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center",
                  variant === 'dark' ? "bg-muted/50" : "bg-white/10"
                )}>
                  {icon}
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}