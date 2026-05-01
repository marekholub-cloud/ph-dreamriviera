import { Checkbox } from "@/components/ui/checkbox";
import { MessageCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WhatsAppCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const WhatsAppCheckbox = ({ checked, onCheckedChange }: WhatsAppCheckboxProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-3 py-2">
        <Checkbox
          id="whatsapp"
          checked={checked}
          onCheckedChange={(checked) => onCheckedChange(checked === true)}
          className="border-border data-[state=checked]:bg-accent data-[state=checked]:border-accent"
        />
        <label
          htmlFor="whatsapp"
          className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
        >
          <MessageCircle className="h-4 w-4 text-green-500" />
          Zaslat odkaz také přes WhatsApp
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-popover text-popover-foreground">
                <p>Pro první příjem WhatsApp zpráv je nutné aktivovat spojení. Pokud zprávu neobdržíte, odkaz vám zašleme na email.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </label>
      </div>
      
      {checked && (
        <div className="ml-7 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <MessageCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            <span>
              <strong className="text-foreground">Pro první příjem WhatsApp zpráv:</strong>{" "}
              Pošlete zprávu "join <span className="font-mono bg-secondary px-1 rounded">plenty-way</span>" na číslo{" "}
              <a 
                href="https://wa.me/14155238886?text=join%20plenty-way" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-500 hover:underline font-medium"
              >
                +1 415 523 8886
              </a>
              . Pokud to neuděláte, odkaz obdržíte pouze emailem.
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
