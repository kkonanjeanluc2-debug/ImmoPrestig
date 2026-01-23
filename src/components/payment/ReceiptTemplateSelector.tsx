import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Star } from "lucide-react";
import { useReceiptTemplates, type ReceiptTemplate } from "@/hooks/useReceiptTemplates";

interface ReceiptTemplateSelectorProps {
  value: string | null;
  onChange: (templateId: string | null, template: ReceiptTemplate | null) => void;
  disabled?: boolean;
}

export function ReceiptTemplateSelector({ value, onChange, disabled }: ReceiptTemplateSelectorProps) {
  const { data: templates = [], isLoading } = useReceiptTemplates();

  // Auto-select default template when templates load
  useEffect(() => {
    if (templates.length > 0 && !value) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      if (defaultTemplate) {
        onChange(defaultTemplate.id, defaultTemplate);
      }
    }
  }, [templates, value, onChange]);

  if (isLoading || templates.length === 0) {
    return null;
  }

  const handleValueChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId) || null;
    onChange(templateId, template);
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        Modèle de quittance
      </Label>
      <Select
        value={value || undefined}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner un modèle" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex items-center gap-2">
                <span>{template.name}</span>
                {template.is_default && (
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
