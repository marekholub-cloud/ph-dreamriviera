import { Award } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const SuperhostBadge = ({ size = "sm", showLabel = true, className }: Props) => {
  const iconSize = size === "lg" ? "h-4 w-4" : size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  const textSize = size === "lg" ? "text-sm" : size === "md" ? "text-xs" : "text-[10px]";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 text-primary px-2 py-0.5 font-semibold",
              textSize,
              className
            )}
          >
            <Award className={cn(iconSize, "fill-primary/20")} />
            {showLabel && "Superhost"}
          </span>
        </TooltipTrigger>
        <TooltipContent>This host meets the highest quality standards.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
