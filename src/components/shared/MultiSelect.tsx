import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  renderLabel?: (option: string) => string;
}

export function MultiSelect({ options, value, onChange, placeholder = "Select...", disabled, renderLabel }: Props) {
  const [open, setOpen] = useState(false);
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter(v => v !== o) : [...value, o]);
  const label = (o: string) => renderLabel ? renderLabel(o) : o;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal h-auto min-h-10 py-1.5", !value.length && "text-muted-foreground")}>
          <div className="flex flex-wrap gap-1">
            {value.length === 0 && <span>{placeholder}</span>}
            {value.map(v => (
              <Badge key={v} variant="secondary" className="gap-1">
                {label(v)}
                {!disabled && (
                  <span onClick={(e) => { e.stopPropagation(); toggle(v); }} className="cursor-pointer hover:text-destructive"><X className="h-3 w-3" /></span>
                )}
              </Badge>
            ))}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
        <div className="max-h-64 overflow-auto">
          {options.map(o => {
            const selected = value.includes(o);
            return (
              <button key={o} type="button" onClick={() => toggle(o)} className="flex items-center w-full px-2 py-1.5 text-sm rounded hover:bg-muted text-left">
                <Check className={cn("h-4 w-4 mr-2", selected ? "opacity-100" : "opacity-0")} />
                {label(o)}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
