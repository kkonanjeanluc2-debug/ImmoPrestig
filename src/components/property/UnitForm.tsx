 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Loader2 } from "lucide-react";
 
 interface UnitFormData {
   unit_number: string;
   rooms_count: number;
   rent_amount: number;
   area: number | null;
   status: string;
 }
 
 interface UnitFormProps {
   formData: UnitFormData;
   setFormData: (data: UnitFormData) => void;
   onSubmit: (e: React.FormEvent) => Promise<void>;
   onCancel: () => void;
   isEdit?: boolean;
   isLoading?: boolean;
 }
 
 export const UnitForm = ({ 
   formData, 
   setFormData, 
   onSubmit, 
   onCancel, 
   isEdit = false, 
   isLoading = false 
 }: UnitFormProps) => {
   return (
     <form onSubmit={onSubmit} className="space-y-4">
       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <Label htmlFor="unit_number">Numéro de porte *</Label>
           <Input
             id="unit_number"
             value={formData.unit_number}
             onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
             placeholder="ex: Porte A, Appartement 1..."
           />
         </div>
         <div className="space-y-2">
           <Label htmlFor="rooms_count">Nombre de pièces *</Label>
           <Input
             id="rooms_count"
             type="number"
             min={1}
             value={formData.rooms_count}
             onChange={(e) => setFormData({ ...formData, rooms_count: parseInt(e.target.value) || 1 })}
           />
         </div>
       </div>
 
       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <Label htmlFor="rent_amount">Loyer mensuel (F CFA) *</Label>
           <Input
             id="rent_amount"
             type="number"
             min={0}
             value={formData.rent_amount}
             onChange={(e) => setFormData({ ...formData, rent_amount: parseFloat(e.target.value) || 0 })}
           />
         </div>
         <div className="space-y-2">
           <Label htmlFor="area">Surface (m²)</Label>
           <Input
             id="area"
             type="number"
             min={0}
             value={formData.area || ""}
             onChange={(e) => setFormData({ ...formData, area: e.target.value ? parseFloat(e.target.value) : null })}
           />
         </div>
       </div>
 
       <div className="space-y-2">
         <Label htmlFor="status">Statut</Label>
         <Select
           value={formData.status}
           onValueChange={(value) => setFormData({ ...formData, status: value })}
         >
           <SelectTrigger>
             <SelectValue />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="disponible">Disponible</SelectItem>
             <SelectItem value="occupé">Occupé</SelectItem>
             <SelectItem value="en attente">En attente</SelectItem>
           </SelectContent>
         </Select>
       </div>
 
       <div className="flex justify-end gap-2 pt-4">
         <Button type="button" variant="outline" onClick={onCancel}>
           Annuler
         </Button>
         <Button type="submit" disabled={isLoading}>
           {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
           {isEdit ? "Modifier" : "Ajouter"}
         </Button>
       </div>
     </form>
   );
 };
 
 export type { UnitFormData };