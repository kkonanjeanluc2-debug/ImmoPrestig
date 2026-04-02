import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMUNES_COTE_DIVOIRE } from "@/constants/communesCoteDIvoire";

interface CommuneSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CommuneSelector({ value, onChange }: CommuneSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || "Sélectionner une commune"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher une commune..." />
          <CommandList>
            <CommandEmpty>Aucune commune trouvée.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => { onChange(""); setOpen(false); }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                <span className="text-muted-foreground">Aucune</span>
              </CommandItem>
              {COMMUNES_COTE_DIVOIRE.map((commune) => (
                <CommandItem
                  key={commune}
                  value={commune}
                  onSelect={() => { onChange(commune); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === commune ? "opacity-100" : "opacity-0")} />
                  {commune}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
