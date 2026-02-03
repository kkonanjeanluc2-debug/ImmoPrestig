import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Zap, Droplets, Flame } from "lucide-react";

interface MetersFormProps {
  form: UseFormReturn<any>;
  readOnly?: boolean;
}

export function MetersForm({ form, readOnly }: MetersFormProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Relevez les compteurs au moment de l'état des lieux. Ces valeurs seront utilisées
        pour calculer les consommations lors de la comparaison entrée/sortie.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-yellow-600">
            <Zap className="h-5 w-5" />
            <span className="font-medium">Électricité</span>
          </div>
          <FormField
            control={form.control}
            name="electricity_meter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relevé compteur (kWh)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex: 12345"
                    {...field}
                    disabled={readOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-blue-600">
            <Droplets className="h-5 w-5" />
            <span className="font-medium">Eau</span>
          </div>
          <FormField
            control={form.control}
            name="water_meter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relevé compteur (m³)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex: 234"
                    {...field}
                    disabled={readOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-orange-600">
            <Flame className="h-5 w-5" />
            <span className="font-medium">Gaz</span>
          </div>
          <FormField
            control={form.control}
            name="gas_meter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relevé compteur (m³)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex: 567"
                    {...field}
                    disabled={readOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
