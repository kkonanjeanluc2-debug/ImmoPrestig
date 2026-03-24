import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText } from "lucide-react";
import { useCreateProforma, InvoiceItem } from "@/hooks/useProformaInvoices";
import { useTenants } from "@/hooks/useTenants";

interface Props {
  preselectedTenantId?: string;
  trigger?: React.ReactNode;
}

export function CreateProformaDialog({ preselectedTenantId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const { data: tenants } = useTenants();
  const createProforma = useCreateProforma();

  const [selectedTenantId, setSelectedTenantId] = useState(preselectedTenantId || "");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unit_price: 0, total: 0 },
  ]);

  const activeTenants = (tenants || []).filter((t: any) => !t.deleted_at);

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const tenant = activeTenants.find((t: any) => t.id === tenantId);
    if (tenant) {
      setTenantName(tenant.name);
      setTenantPhone(tenant.phone || "");
      setTenantEmail(tenant.email || "");
      setPropertyName(tenant.property?.title || "");
      setUnitNumber(tenant.unit?.unit_number || "");
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    if (field === "quantity" || field === "unit_price") {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = Math.round(subtotal * taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = () => {
    if (!tenantName.trim()) return;
    if (items.some(i => !i.description.trim() || i.total <= 0)) return;

    createProforma.mutate(
      {
        tenant_id: selectedTenantId || null,
        tenant_name: tenantName,
        tenant_phone: tenantPhone,
        tenant_email: tenantEmail,
        property_name: propertyName,
        unit_number: unitNumber,
        description,
        items,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes,
        due_date: dueDate || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setSelectedTenantId(preselectedTenantId || "");
    setTenantName("");
    setTenantPhone("");
    setTenantEmail("");
    setPropertyName("");
    setUnitNumber("");
    setDescription("");
    setNotes("");
    setDueDate("");
    setTaxRate(0);
    setItems([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Nouvelle proforma
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Créer une facture proforma
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Informations client</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Locataire existant</Label>
                <Select value={selectedTenantId} onValueChange={handleTenantSelect}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {activeTenants.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nom *</Label>
                <Input className="h-9" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Téléphone</Label>
                <Input className="h-9" value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input className="h-9" value={tenantEmail} onChange={(e) => setTenantEmail(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Bien</Label>
                <Input className="h-9" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">N° porte/unité</Label>
                <Input className="h-9" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Lignes de facturation</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1 h-7 text-xs">
                <Plus className="h-3 w-3" /> Ajouter
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {index === 0 && <Label className="text-xs">Description</Label>}
                  <Input
                    className="h-9"
                    placeholder="Ex: Loyer mensuel"
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  {index === 0 && <Label className="text-xs">Quantité</Label>}
                  <Input
                    className="h-9"
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="col-span-2">
                  {index === 0 && <Label className="text-xs">P.U.</Label>}
                  <Input
                    className="h-9"
                    type="number"
                    min={0}
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, "unit_price", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-2">
                  {index === 0 && <Label className="text-xs">Total</Label>}
                  <Input className="h-9 bg-muted" readOnly value={item.total.toLocaleString("fr-FR")} />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total</span>
              <span className="font-medium">{subtotal.toLocaleString("fr-FR")} F CFA</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-3">
              <span className="text-muted-foreground">TVA (%)</span>
              <Input
                className="h-8 w-20 text-right"
                type="number"
                min={0}
                max={100}
                value={taxRate}
                onChange={(e) => setTaxRate(parseInt(e.target.value) || 0)}
              />
              <span className="font-medium min-w-[100px] text-right">{taxAmount.toLocaleString("fr-FR")} F CFA</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span>Total TTC</span>
              <span className="text-primary">{totalAmount.toLocaleString("fr-FR")} F CFA</span>
            </div>
          </div>

          {/* Additional fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date d'échéance</Label>
              <Input className="h-9" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input className="h-9" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Objet de la facture" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes additionnelles..." rows={2} />
          </div>

          <p className="text-[10px] text-muted-foreground italic">
            Proforma – ne vaut pas facture. Ce document est une proposition commerciale.
          </p>

          <Button
            onClick={handleSubmit}
            disabled={!tenantName.trim() || totalAmount <= 0 || createProforma.isPending}
            className="w-full"
          >
            {createProforma.isPending ? "Création..." : "Créer la facture proforma"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
