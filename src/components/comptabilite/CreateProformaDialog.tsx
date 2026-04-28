import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText, User, Home, Building2, Wrench, UserCheck } from "lucide-react";
import { useCreateProforma, useUpdateProforma, InvoiceItem, ProformaInvoice } from "@/hooks/useProformaInvoices";
import { useTenants } from "@/hooks/useTenants";
import { useProperties } from "@/hooks/useProperties";
import { useBiensVente } from "@/hooks/useBiensVente";
import { useOwners } from "@/hooks/useOwners";

interface Props {
  preselectedTenantId?: string;
  trigger?: React.ReactNode;
  editInvoice?: ProformaInvoice;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type ClientType = "locataire" | "client" | "proprietaire";
type InvoiceCategory = "bien" | "prestation";
type DocType = "proforma" | "definitive";

export function CreateProformaDialog({ preselectedTenantId, trigger, editInvoice, open: controlledOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const { data: tenants } = useTenants();
  const { data: properties } = useProperties();
  const { data: biensVente } = useBiensVente();
  const { data: owners } = useOwners();
  const createProforma = useCreateProforma();
  const updateProforma = useUpdateProforma();

  const isEditing = !!editInvoice;

  const [docType, setDocType] = useState<DocType>("proforma");
  const [invoiceCategory, setInvoiceCategory] = useState<InvoiceCategory>("bien");
  const [clientType, setClientType] = useState<ClientType>(preselectedTenantId ? "locataire" : "locataire");
  const [selectedTenantId, setSelectedTenantId] = useState(preselectedTenantId || "");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [propertyArea, setPropertyArea] = useState("");
  const [prestationType, setPrestationType] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unit_price: 0, total: 0 },
  ]);

  // Populate form when editing
  useEffect(() => {
    if (editInvoice && open) {
      setTenantName(editInvoice.tenant_name || "");
      setTenantPhone(editInvoice.tenant_phone || "");
      setTenantEmail(editInvoice.tenant_email || "");
      setPropertyName(editInvoice.property_name || "");
      setUnitNumber(editInvoice.unit_number || "");
      setDescription(editInvoice.description || "");
      setNotes(editInvoice.notes || "");
      setDueDate(editInvoice.due_date || "");
      setTaxRate(editInvoice.tax_rate || 0);
      setItems(editInvoice.items.length > 0 ? editInvoice.items : [{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
      setSelectedTenantId(editInvoice.tenant_id || "");
      if (editInvoice.tenant_id) {
        setClientType("locataire");
      }
    }
  }, [editInvoice, open]);

  const activeTenants = (tenants || []).filter((t: any) => !t.deleted_at);
  const activeProperties = (properties || []).filter((p: any) => !p.deleted_at);
  const activeBiensVente = (biensVente || []).filter((b: any) => !b.deleted_at && b.status !== "vendu");
  const activeOwners = (owners || []).filter((o: any) => !o.deleted_at);

  // Merge properties and biens_vente for selection
  const allBiens = [
    ...activeProperties.map((p: any) => ({ id: p.id, title: p.title, type: "location", property_type: p.property_type, address: p.address, area: p.area })),
    ...activeBiensVente.map((b: any) => ({ id: b.id, title: `${b.title} (Vente)`, type: "vente", property_type: b.property_type, address: b.address, area: b.area })),
  ];

  const handleCategoryChange = (cat: InvoiceCategory) => {
    setInvoiceCategory(cat);
    setItems([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
    setPrestationType("");
    setSelectedPropertyId("");
    setPropertyType("");
    setPropertyAddress("");
    setPropertyArea("");
  };

  const handleClientTypeChange = (type: ClientType) => {
    setClientType(type);
    setSelectedTenantId("");
    setTenantName("");
    setTenantPhone("");
    setTenantEmail("");
    setClientAddress("");
    setClientCompany("");
    setPropertyName("");
    setUnitNumber("");
  };

  const handleOwnerSelect = (ownerId: string) => {
    setSelectedTenantId(ownerId);
    const owner = activeOwners.find((o: any) => o.id === ownerId);
    if (owner) {
      setTenantName(owner.name);
      setTenantPhone(owner.phone || "");
      setTenantEmail(owner.email || "");
    }
  };

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

  const handlePropertySelect = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    const prop = allBiens.find((p: any) => p.id === propertyId);
    if (prop) {
      setPropertyName(prop.title.replace(" (Vente)", ""));
      setPropertyType(prop.property_type || "");
      setPropertyAddress(prop.address || "");
      setPropertyArea(prop.area ? String(prop.area) : "");
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

    const categoryNotes: string[] = [];
    if (invoiceCategory === "bien") {
      if (propertyType) categoryNotes.push(`Type de bien: ${propertyType}`);
      if (propertyAddress) categoryNotes.push(`Adresse: ${propertyAddress}`);
      if (propertyArea) categoryNotes.push(`Superficie: ${propertyArea} m²`);
    } else {
      if (prestationType) categoryNotes.push(`Type de prestation: ${prestationType}`);
    }
    if (clientType === "client") {
      if (clientCompany) categoryNotes.push(`Société: ${clientCompany}`);
      if (clientAddress) categoryNotes.push(`Adresse client: ${clientAddress}`);
    }
    if (notes) categoryNotes.push(notes);

    const payload = {
      tenant_id: clientType === "locataire" ? (selectedTenantId || null) : null,
      tenant_name: tenantName,
      tenant_phone: tenantPhone,
      tenant_email: tenantEmail,
      property_name: propertyName,
      unit_number: unitNumber,
      description: description || (invoiceCategory === "bien" ? "Facture bien immobilier" : "Facture prestation"),
      items,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      notes: categoryNotes.join("\n"),
      due_date: dueDate || undefined,
    };

    if (isEditing && editInvoice) {
      updateProforma.mutate(
        { id: editInvoice.id, data: payload },
        {
          onSuccess: () => {
            setOpen(false);
            resetForm();
          },
        }
      );
    } else {
      createProforma.mutate(
        { ...payload, invoice_type: docType },
        {
          onSuccess: () => {
            setOpen(false);
            resetForm();
          },
        }
      );
    }
  };

  const resetForm = () => {
    setInvoiceCategory("bien");
    setClientType(preselectedTenantId ? "locataire" : "locataire");
    setSelectedTenantId(preselectedTenantId || "");
    setTenantName("");
    setTenantPhone("");
    setTenantEmail("");
    setClientAddress("");
    setClientCompany("");
    setPropertyName("");
    setUnitNumber("");
    setSelectedPropertyId("");
    setPropertyType("");
    setPropertyAddress("");
    setPropertyArea("");
    setPrestationType("");
    setDescription("");
    setNotes("");
    setDueDate("");
    setTaxRate(0);
    setItems([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const prestationTypes = [
    "Gestion locative",
    "Commission de vente",
    "Frais de dossier",
    "Conseil immobilier",
    "Expertise / Évaluation",
    "Médiation immobilière",
    "Travaux / Rénovation",
    "État des lieux",
    "Accompagnement juridique",
    "Autre",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEditing && (
        <DialogTrigger asChild>
          {trigger || (
            <Button size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Nouvelle proforma
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isEditing ? "Modifier la facture proforma" : "Créer une facture proforma"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invoice category selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Catégorie de facture</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={invoiceCategory === "bien" ? "default" : "outline"}
                size="sm"
                className="gap-2 h-10"
                onClick={() => handleCategoryChange("bien")}
              >
                <Building2 className="h-4 w-4" />
                Bien immobilier
              </Button>
              <Button
                type="button"
                variant={invoiceCategory === "prestation" ? "default" : "outline"}
                size="sm"
                className="gap-2 h-10"
                onClick={() => handleCategoryChange("prestation")}
              >
                <Wrench className="h-4 w-4" />
                Prestation
              </Button>
            </div>
          </div>

          {/* Client type selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Type de destinataire</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={clientType === "locataire" ? "default" : "outline"}
                size="sm"
                className="gap-1.5 h-10 text-xs"
                onClick={() => handleClientTypeChange("locataire")}
              >
                <Home className="h-4 w-4" />
                Locataire
              </Button>
              <Button
                type="button"
                variant={clientType === "proprietaire" ? "default" : "outline"}
                size="sm"
                className="gap-1.5 h-10 text-xs"
                onClick={() => handleClientTypeChange("proprietaire")}
              >
                <UserCheck className="h-4 w-4" />
                Propriétaire
              </Button>
              <Button
                type="button"
                variant={clientType === "client" ? "default" : "outline"}
                size="sm"
                className="gap-1.5 h-10 text-xs"
                onClick={() => handleClientTypeChange("client")}
              >
                <User className="h-4 w-4" />
                Client externe
              </Button>
            </div>
          </div>

          {/* Client info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {clientType === "locataire" ? "Informations locataire" : clientType === "proprietaire" ? "Informations propriétaire" : "Informations client"}
            </h3>

            {clientType === "locataire" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Locataire</Label>
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
              </div>
            ) : clientType === "proprietaire" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Propriétaire</Label>
                  <Select value={selectedTenantId} onValueChange={handleOwnerSelect}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {activeOwners.map((o: any) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
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
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nom / Raison sociale *</Label>
                  <Input className="h-9" value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Nom du client ou de la société" />
                </div>
                <div>
                  <Label className="text-xs">Société / Entreprise</Label>
                  <Input className="h-9" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="Nom de l'entreprise" />
                </div>
                <div>
                  <Label className="text-xs">Téléphone</Label>
                  <Input className="h-9" value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input className="h-9" value={tenantEmail} onChange={(e) => setTenantEmail(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Adresse</Label>
                  <Input className="h-9" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Adresse du client" />
                </div>
              </div>
            )}
          </div>

          {/* Category-specific fields */}
          {invoiceCategory === "bien" ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Informations du bien</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {clientType === "locataire" && (
                  <>
                    <div>
                      <Label className="text-xs">Bien</Label>
                      <Input className="h-9" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">N° porte/unité</Label>
                      <Input className="h-9" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} />
                    </div>
                  </>
                )}
                {(clientType === "client" || clientType === "proprietaire") && (
                  <>
                    <div>
                      <Label className="text-xs">Bien existant</Label>
                      <Select value={selectedPropertyId} onValueChange={handlePropertySelect}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Sélectionner un bien..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {allBiens.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Nom du bien *</Label>
                      <Input className="h-9" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} placeholder="Ex: Villa Cocody, Terrain Riviera..." />
                    </div>
                    <div>
                      <Label className="text-xs">Type de bien</Label>
                      <Select value={propertyType} onValueChange={setPropertyType}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Type..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {["Appartement", "Maison", "Villa", "Terrain", "Bureau", "Commerce", "Immeuble", "Studio", "Meublé"].map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Adresse du bien</Label>
                      <Input className="h-9" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} placeholder="Localisation du bien" />
                    </div>
                    <div>
                      <Label className="text-xs">Superficie (m²)</Label>
                      <Input className="h-9" type="number" value={propertyArea} onChange={(e) => setPropertyArea(e.target.value)} placeholder="Ex: 500" />
                    </div>
                    <div>
                      <Label className="text-xs">Référence / N° lot</Label>
                      <Input className="h-9" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} placeholder="N° lot, réf..." />
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Informations de la prestation</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type de prestation *</Label>
                  <Select value={prestationType} onValueChange={setPrestationType}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {prestationTypes.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Bien concerné (optionnel)</Label>
                  {clientType === "proprietaire" && selectedTenantId ? (
                    <Select value={selectedPropertyId} onValueChange={(val) => {
                      setSelectedPropertyId(val);
                      const ownerBiens = activeProperties.filter((p: any) => p.owner_id === selectedTenantId);
                      const found = ownerBiens.find((p: any) => p.id === val);
                      if (found) {
                        setPropertyName(found.title);
                        setPropertyAddress(found.address || "");
                      }
                    }}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Sélectionner un bien..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {activeProperties
                          .filter((p: any) => p.owner_id === selectedTenantId)
                          .map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input className="h-9" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} placeholder="Ex: Villa Cocody, Lot 12..." />
                  )}
                </div>
              </div>
            </div>
          )}

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
                    placeholder={
                      invoiceCategory === "bien"
                        ? "Ex: Loyer, Commission, Frais de dossier..."
                        : "Ex: Honoraires, Consultation, Visite technique..."
                    }
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



          <p className="text-[10px] text-muted-foreground italic">
            Proforma – ne vaut pas facture. Ce document est une proposition commerciale.
          </p>

          <Button
            onClick={handleSubmit}
            disabled={!tenantName.trim() || totalAmount <= 0 || createProforma.isPending || updateProforma.isPending}
            className="w-full"
          >
            {isEditing
              ? (updateProforma.isPending ? "Modification..." : "Modifier la facture proforma")
              : (createProforma.isPending ? "Création..." : "Créer la facture proforma")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
