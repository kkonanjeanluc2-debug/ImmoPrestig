import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Key } from "lucide-react";
import { KeyItem } from "@/hooks/useEtatsDesLieux";

interface KeysFormProps {
  keys: KeyItem[];
  onChange: (keys: KeyItem[]) => void;
  readOnly?: boolean;
}

export function KeysForm({ keys, onChange, readOnly }: KeysFormProps) {
  const [newKeyType, setNewKeyType] = useState("");

  const updateKey = (index: number, updates: Partial<KeyItem>) => {
    if (readOnly) return;
    const newKeys = [...keys];
    newKeys[index] = { ...newKeys[index], ...updates };
    onChange(newKeys);
  };

  const addKey = () => {
    if (!newKeyType.trim() || readOnly) return;
    onChange([
      ...keys,
      {
        type: newKeyType.trim(),
        quantity: 1,
        description: "",
      },
    ]);
    setNewKeyType("");
  };

  const removeKey = (index: number) => {
    if (readOnly) return;
    onChange(keys.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <Key className="h-5 w-5" />
        <span className="text-sm">Listez toutes les clés remises au locataire</span>
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          <Input
            placeholder="Type de clé (ex: Porte d'entrée, Boîte aux lettres)..."
            value={newKeyType}
            onChange={(e) => setNewKeyType(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKey())}
          />
          <Button type="button" onClick={addKey} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {keys.map((key, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Key className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <Input
                  value={key.type}
                  onChange={(e) => updateKey(index, { type: e.target.value })}
                  disabled={readOnly}
                  className="h-8"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Quantité</label>
                <Input
                  type="number"
                  min="1"
                  value={key.quantity}
                  onChange={(e) => updateKey(index, { quantity: parseInt(e.target.value) || 1 })}
                  disabled={readOnly}
                  className="h-8"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Input
                  placeholder="Notes..."
                  value={key.description}
                  onChange={(e) => updateKey(index, { description: e.target.value })}
                  disabled={readOnly}
                  className="h-8"
                />
              </div>
            </div>
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeKey(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {keys.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Aucune clé ajoutée.
        </p>
      )}
    </div>
  );
}
