import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  ClipboardList,
  Loader2,
  FileDown,
  Eye,
  Package,
  PenTool,
} from "lucide-react";
import { toast } from "sonner";
import {
  usePropertyInventories,
  useInventoryItems,
  useCreatePropertyInventory,
  useDeletePropertyInventory,
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useUpdateInventoryItem,
  useBulkCreateInventoryItems,
  type PropertyInventory,
  type InventoryItem,
} from "@/hooks/usePropertyInventory";
import { generateInventoryPDF } from "@/lib/generateInventoryPDF";
import { SignInventoryDialog } from "./SignInventoryDialog";

const ROOMS = [
  "Salon",
  "Chambre 1",
  "Chambre 2",
  "Chambre 3",
  "Cuisine",
  "Salle de bain",
  "Toilettes",
  "Balcon / Terrasse",
  "Couloir / Entrée",
  "Buanderie",
  "Divers",
];

const CONDITION_LABELS: Record<string, string> = {
  neuf: "Neuf",
  bon: "Bon état",
  use: "Usé",
  a_reparer: "À réparer",
  hors_service: "Hors service",
};

const CONDITION_COLORS: Record<string, string> = {
  neuf: "bg-emerald/10 text-emerald border-emerald/20",
  bon: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  use: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  a_reparer: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  hors_service: "bg-destructive/10 text-destructive border-destructive/20",
};

const TYPE_LABELS: Record<string, string> = {
  entree: "Entrée",
  sortie: "Sortie",
};

const ROOM_SUGGESTIONS: Record<string, string[]> = {
  "Salon": ["Canapé", "Table basse", "Télévision", "Meuble TV", "Luminaire", "Rideau", "Tapis", "Climatiseur", "Ventilateur"],
  "Chambre 1": ["Lit", "Matelas", "Armoire", "Table de chevet", "Lampe de chevet", "Rideau", "Climatiseur", "Ventilateur"],
  "Chambre 2": ["Lit", "Matelas", "Armoire", "Table de chevet", "Lampe de chevet", "Rideau", "Climatiseur", "Ventilateur"],
  "Chambre 3": ["Lit", "Matelas", "Armoire", "Table de chevet", "Lampe de chevet", "Rideau", "Climatiseur", "Ventilateur"],
  "Cuisine": ["Réfrigérateur", "Gazinière", "Micro-ondes", "Assiettes", "Verres", "Couverts", "Casseroles", "Poêle", "Bouilloire"],
  "Salle de bain": ["Machine à laver", "Chauffe-eau", "Miroir", "Porte-serviettes", "Rideau de douche"],
  "Toilettes": ["Porte-papier", "Brosse WC"],
  "Balcon / Terrasse": ["Chaise", "Table"],
  "Couloir / Entrée": ["Porte-manteau", "Miroir", "Luminaire"],
  "Buanderie": ["Étagère", "Fer à repasser", "Table à repasser"],
  "Divers": ["Décoration", "Plante artificielle"],
};

interface DraftItem {
  id: string;
  room: string;
  item_name: string;
  quantity: number;
  brand: string;
  model: string;
  condition: string;
  observations: string;
}

interface PropertyInventoryManagerProps {
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  canEdit: boolean;
  tenantName?: string;
}

export const PropertyInventoryManager = ({
  propertyId,
  propertyTitle,
  propertyAddress,
  canEdit,
  tenantName,
}: PropertyInventoryManagerProps) => {
  const { data: inventories = [], isLoading } = usePropertyInventories(propertyId);
  const createInventory = useCreatePropertyInventory();
  const deleteInventory = useDeletePropertyInventory();
  const bulkCreate = useBulkCreateInventoryItems();
  const [viewingInventory, setViewingInventory] = useState<PropertyInventory | null>(null);
  const [deletingInventory, setDeletingInventory] = useState<PropertyInventory | null>(null);
  const [signingInventory, setSigningInventory] = useState<PropertyInventory | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleDeleteInventory = async () => {
    if (!deletingInventory) return;
    try {
      await deleteInventory.mutateAsync({ id: deletingInventory.id, propertyId });
      toast.success("Inventaire supprimé");
      setDeletingInventory(null);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleExportPDF = async (inventory: PropertyInventory) => {
    try {
      const { data: items } = await (await import("@/integrations/supabase/client")).supabase
        .from("inventory_items")
        .select("*")
        .eq("inventory_id", inventory.id)
        .order("room", { ascending: true });

      const doc = await generateInventoryPDF({
        inventory,
        items: (items || []) as InventoryItem[],
        propertyTitle,
        propertyAddress,
      });
      doc.save(`inventaire_${propertyTitle.replace(/\s+/g, "_")}_${inventory.type}.pdf`);
      toast.success("PDF généré avec succès");
    } catch (error) {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {inventories.length} inventaire{inventories.length > 1 ? "s" : ""}
        </p>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="bg-emerald hover:bg-emerald-dark gap-2">
            <Plus className="h-4 w-4" />
            Nouvel inventaire
          </Button>
        )}
      </div>

      {inventories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Aucun inventaire pour ce bien.</p>
          {canEdit && <p className="text-sm mt-1">Créez un inventaire pour lister le mobilier.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {inventories.map((inv) => (
            <Card key={inv.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        Inventaire {TYPE_LABELS[inv.type] || inv.type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(inv.inventory_date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setViewingInventory(inv)} title="Voir">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setSigningInventory(inv)} title="Signer">
                      <PenTool className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleExportPDF(inv)} title="Exporter PDF">
                      <FileDown className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={() => setDeletingInventory(inv)} title="Supprimer">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog - Full inventory creation with items */}
      <CreateInventoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        propertyId={propertyId}
        createInventory={createInventory}
        bulkCreate={bulkCreate}
      />

      {/* View/Edit Inventory Dialog */}
      {viewingInventory && (
        <InventoryDetailDialog
          inventory={viewingInventory}
          open={!!viewingInventory}
          onOpenChange={(open) => !open && setViewingInventory(null)}
          canEdit={canEdit}
        />
      )}

      {/* Sign Inventory Dialog */}
      {signingInventory && (
        <SignInventoryDialog
          inventory={signingInventory}
          open={!!signingInventory}
          onOpenChange={(open) => !open && setSigningInventory(null)}
          propertyTitle={propertyTitle}
          tenantName={tenantName}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingInventory} onOpenChange={(open) => !open && setDeletingInventory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet inventaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les éléments de l'inventaire seront perdus. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInventory} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Create Inventory Dialog with draft items ───
const CreateInventoryDialog = ({
  open,
  onOpenChange,
  propertyId,
  createInventory,
  bulkCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  createInventory: ReturnType<typeof useCreatePropertyInventory>;
  bulkCreate: ReturnType<typeof useBulkCreateInventoryItems>;
}) => {
  const [newType, setNewType] = useState<string>("entree");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [addingRoom, setAddingRoom] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ item_name: "", quantity: "1", brand: "", model: "", condition: "bon", observations: "" });
  const [isSaving, setIsSaving] = useState(false);

  const groupedDraftItems = draftItems.reduce((acc, item) => {
    if (!acc[item.room]) acc[item.room] = [];
    acc[item.room].push(item);
    return acc;
  }, {} as Record<string, DraftItem[]>);

  const handleAddDraftItem = () => {
    if (!newItem.item_name || !addingRoom) return;
    setDraftItems(prev => [...prev, {
      id: crypto.randomUUID(),
      room: addingRoom,
      item_name: newItem.item_name,
      quantity: parseInt(newItem.quantity) || 1,
      brand: newItem.brand,
      model: newItem.model,
      condition: newItem.condition,
      observations: newItem.observations,
    }]);
    setNewItem({ item_name: "", quantity: "1", brand: "", model: "", condition: "bon", observations: "" });
  };

  const handleRemoveDraftItem = (id: string) => {
    setDraftItems(prev => prev.filter(i => i.id !== id));
  };

  const handleAddSuggestions = (room: string) => {
    const suggestions = ROOM_SUGGESTIONS[room] || [];
    const existingNames = draftItems.filter(i => i.room === room).map(i => i.item_name.toLowerCase());
    const newItems = suggestions
      .filter(s => !existingNames.includes(s.toLowerCase()))
      .map(name => ({
        id: crypto.randomUUID(),
        room,
        item_name: name,
        quantity: 1,
        brand: "",
        model: "",
        condition: "bon",
        observations: "",
      }));
    if (newItems.length === 0) {
      toast.info("Tous les éléments suggérés existent déjà");
      return;
    }
    setDraftItems(prev => [...prev, ...newItems]);
    toast.success(`${newItems.length} éléments ajoutés`);
  };

  const handleSave = async () => {
    if (draftItems.length === 0) {
      toast.error("Ajoutez au moins un élément à l'inventaire");
      return;
    }
    setIsSaving(true);
    try {
      const inventory = await createInventory.mutateAsync({
        property_id: propertyId,
        type: newType,
      });
      await bulkCreate.mutateAsync({
        inventoryId: inventory.id,
        items: draftItems.map(({ room, item_name, quantity, brand, model, condition, observations }) => ({
          room,
          item_name,
          quantity,
          brand: brand || null,
          model: model || null,
          condition,
          observations: observations || null,
        })),
      });
      toast.success("Inventaire créé avec succès");
      setDraftItems([]);
      setAddingRoom(null);
      setNewType("entree");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setDraftItems([]);
    setAddingRoom(null);
    setNewType("entree");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Nouvel inventaire</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Type d'inventaire</Label>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entree">Entrée (état des lieux d'entrée)</SelectItem>
                <SelectItem value="sortie">Sortie (état des lieux de sortie)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Room sections */}
          {ROOMS.map((room) => {
            const roomItems = groupedDraftItems[room] || [];
            const isAdding = addingRoom === room;

            return (
              <div key={room} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {room} ({roomItems.length})
                  </h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleAddSuggestions(room)}>
                      Suggestions
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setAddingRoom(isAdding ? null : room)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                </div>

                {roomItems.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">Élément</th>
                          <th className="text-center p-2 font-medium w-16">Qté</th>
                          <th className="text-center p-2 font-medium">État</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {roomItems.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-2">{item.item_name}</td>
                            <td className="p-2 text-center">{item.quantity}</td>
                            <td className="p-2 text-center">
                              <Badge variant="outline" className={`text-xs ${CONDITION_COLORS[item.condition] || ""}`}>
                                {CONDITION_LABELS[item.condition] || item.condition}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveDraftItem(item.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {isAdding && (
                  <Card className="border-dashed">
                    <CardContent className="p-3 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Input
                          placeholder="Nom de l'élément *"
                          value={newItem.item_name}
                          onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                          className="col-span-2"
                        />
                        <Input
                          type="number"
                          placeholder="Qté"
                          min={1}
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                        />
                        <Select value={newItem.condition} onValueChange={(v) => setNewItem({ ...newItem, condition: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Marque (optionnel)"
                          value={newItem.brand}
                          onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                        />
                        <Input
                          placeholder="Modèle (optionnel)"
                          value={newItem.model}
                          onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                        />
                      </div>
                      <Input
                        placeholder="Observations (optionnel)"
                        value={newItem.observations}
                        onChange={(e) => setNewItem({ ...newItem, observations: e.target.value })}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setAddingRoom(null)}>Fermer</Button>
                        <Button
                          size="sm"
                          onClick={handleAddDraftItem}
                          disabled={!newItem.item_name}
                          className="bg-emerald hover:bg-emerald-dark"
                        >
                          Ajouter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Separator />
              </div>
            );
          })}

          <p className="text-xs text-muted-foreground text-center">
            Total : {draftItems.length} élément{draftItems.length > 1 ? "s" : ""}
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || draftItems.length === 0}
              className="bg-emerald hover:bg-emerald-dark"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer l'inventaire ({draftItems.length} élément{draftItems.length > 1 ? "s" : ""})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── View/Edit existing inventory ───
const InventoryDetailDialog = ({
  inventory,
  open,
  onOpenChange,
  canEdit,
}: {
  inventory: PropertyInventory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
}) => {
  const { data: items = [], isLoading } = useInventoryItems(inventory.id);
  const createItem = useCreateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const bulkCreate = useBulkCreateInventoryItems();

  const [addingRoom, setAddingRoom] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ item_name: "", quantity: "1", brand: "", model: "", condition: "bon", observations: "" });

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.room]) acc[item.room] = [];
    acc[item.room].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  const handleAddItem = async () => {
    if (!newItem.item_name || !addingRoom) return;
    try {
      await createItem.mutateAsync({
        inventory_id: inventory.id,
        room: addingRoom,
        item_name: newItem.item_name,
        quantity: parseInt(newItem.quantity) || 1,
        brand: newItem.brand || null,
        model: newItem.model || null,
        condition: newItem.condition,
        observations: newItem.observations || null,
      });
      setNewItem({ item_name: "", quantity: "1", brand: "", model: "", condition: "bon", observations: "" });
      toast.success("Élément ajouté");
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    try {
      await deleteItem.mutateAsync({ id: item.id, inventoryId: inventory.id });
      toast.success("Élément supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleAddSuggestedItems = async (room: string) => {
    const suggestions = ROOM_SUGGESTIONS[room] || [];
    const existingNames = (groupedItems[room] || []).map(i => i.item_name.toLowerCase());
    const newItems = suggestions
      .filter(s => !existingNames.includes(s.toLowerCase()))
      .map(name => ({ room, item_name: name, quantity: 1, condition: "bon" }));
    if (newItems.length === 0) { toast.info("Tous les éléments suggérés existent déjà"); return; }
    try {
      await bulkCreate.mutateAsync({ inventoryId: inventory.id, items: newItems });
      toast.success(`${newItems.length} éléments ajoutés`);
    } catch { toast.error("Erreur lors de l'ajout"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Inventaire {TYPE_LABELS[inventory.type]} - {new Date(inventory.inventory_date).toLocaleDateString("fr-FR")}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-6 mt-4">
            {ROOMS.map((room) => {
              const roomItems = groupedItems[room] || [];
              const isAdding = addingRoom === room;
              return (
                <div key={room} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{room} ({roomItems.length})</h3>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleAddSuggestedItems(room)} disabled={bulkCreate.isPending}>Suggestions</Button>
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setAddingRoom(isAdding ? null : room)}>
                          <Plus className="h-3 w-3 mr-1" />Ajouter
                        </Button>
                      </div>
                    )}
                  </div>
                  {roomItems.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2 font-medium">Élément</th>
                            <th className="text-center p-2 font-medium w-16">Qté</th>
                            <th className="text-left p-2 font-medium hidden sm:table-cell">Marque</th>
                            <th className="text-center p-2 font-medium">État</th>
                            <th className="text-left p-2 font-medium hidden md:table-cell">Observations</th>
                            {canEdit && <th className="w-10"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {roomItems.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="p-2">{item.item_name}</td>
                              <td className="p-2 text-center">{item.quantity}</td>
                              <td className="p-2 hidden sm:table-cell text-muted-foreground">{[item.brand, item.model].filter(Boolean).join(" ") || "-"}</td>
                              <td className="p-2 text-center">
                                <Badge variant="outline" className={`text-xs ${CONDITION_COLORS[item.condition] || ""}`}>{CONDITION_LABELS[item.condition] || item.condition}</Badge>
                              </td>
                              <td className="p-2 hidden md:table-cell text-muted-foreground text-xs">{item.observations || "-"}</td>
                              {canEdit && (
                                <td className="p-2">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItem(item)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {isAdding && canEdit && (
                    <Card className="border-dashed">
                      <CardContent className="p-3 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <Input placeholder="Nom de l'élément *" value={newItem.item_name} onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })} className="col-span-2" />
                          <Input type="number" placeholder="Qté" min={1} value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
                          <Select value={newItem.condition} onValueChange={(v) => setNewItem({ ...newItem, condition: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(CONDITION_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Marque (optionnel)" value={newItem.brand} onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })} />
                          <Input placeholder="Modèle (optionnel)" value={newItem.model} onChange={(e) => setNewItem({ ...newItem, model: e.target.value })} />
                        </div>
                        <Input placeholder="Observations (optionnel)" value={newItem.observations} onChange={(e) => setNewItem({ ...newItem, observations: e.target.value })} />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setAddingRoom(null)}>Fermer</Button>
                          <Button size="sm" onClick={handleAddItem} disabled={!newItem.item_name || createItem.isPending} className="bg-emerald hover:bg-emerald-dark">
                            {createItem.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Ajouter
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Separator />
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground text-center">
              Total : {items.length} élément{items.length > 1 ? "s" : ""} dans {Object.keys(groupedItems).length} pièce{Object.keys(groupedItems).length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
