import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Download, Loader2, Database, ShieldCheck } from "lucide-react";
import JSZip from "jszip";
import ExcelJS from "exceljs";

async function fetchAllRows(table: string, userId: string) {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const query = (supabase as any).from(table).select("*").eq("user_id", userId).range(from, from + PAGE_SIZE - 1);

    const { data, error } = await query;
    if (error) throw error;
    
    allRows = allRows.concat(data || []);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allRows;
}

async function createExcelBuffer(sheetName: string, data: any[], columns: { key: string; label: string }[]) {
  if (data.length === 0) return null;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.addRow(columns.map(c => c.label));
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
  });

  data.forEach(row => {
    worksheet.addRow(columns.map(c => {
      const val = row[c.key];
      return val === null || val === undefined ? "" : String(val);
    }));
  });

  columns.forEach((_, i) => {
    const maxLen = Math.max(
      columns[i].label.length,
      ...data.slice(0, 100).map(row => String(row[columns[i].key] ?? "").length)
    );
    worksheet.getColumn(i + 1).width = Math.min(maxLen + 2, 50);
  });

  return await workbook.xlsx.writeBuffer();
}

const TABLE_CONFIGS: {
  table: string;
  fileName: string;
  sheetName: string;
  columns: { key: string; label: string }[];
}[] = [
  {
    table: "properties",
    fileName: "biens_locatifs.xlsx",
    sheetName: "Biens locatifs",
    columns: [
      { key: "id", label: "ID" },
      { key: "title", label: "Titre" },
      { key: "address", label: "Adresse" },
      { key: "city", label: "Ville" },
      { key: "property_type", label: "Type" },
      { key: "price", label: "Loyer" },
      { key: "area", label: "Superficie" },
      { key: "bedrooms", label: "Chambres" },
      { key: "bathrooms", label: "Salles de bain" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "tenants",
    fileName: "locataires.xlsx",
    sheetName: "Locataires",
    columns: [
      { key: "id", label: "ID" },
      { key: "first_name", label: "Prénom" },
      { key: "last_name", label: "Nom" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Téléphone" },
      { key: "profession", label: "Profession" },
      { key: "cni_number", label: "N° CNI" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "contracts",
    fileName: "contrats.xlsx",
    sheetName: "Contrats",
    columns: [
      { key: "id", label: "ID" },
      { key: "property_id", label: "Bien ID" },
      { key: "tenant_id", label: "Locataire ID" },
      { key: "rent_amount", label: "Loyer" },
      { key: "deposit", label: "Caution" },
      { key: "start_date", label: "Début" },
      { key: "end_date", label: "Fin" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "payments",
    fileName: "paiements.xlsx",
    sheetName: "Paiements",
    columns: [
      { key: "id", label: "ID" },
      { key: "tenant_id", label: "Locataire ID" },
      { key: "amount", label: "Montant" },
      { key: "payment_date", label: "Date paiement" },
      { key: "payment_method", label: "Mode" },
      { key: "status", label: "Statut" },
      { key: "payment_months", label: "Mois payés" },
      { key: "receipt_number", label: "N° Reçu" },
      { key: "notes", label: "Notes" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "expenses",
    fileName: "depenses.xlsx",
    sheetName: "Dépenses",
    columns: [
      { key: "id", label: "ID" },
      { key: "property_id", label: "Bien ID" },
      { key: "category", label: "Catégorie" },
      { key: "amount", label: "Montant" },
      { key: "description", label: "Description" },
      { key: "expense_date", label: "Date" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "owners",
    fileName: "proprietaires.xlsx",
    sheetName: "Propriétaires",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nom" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Téléphone" },
      { key: "address", label: "Adresse" },
      { key: "management_type", label: "Type gestion" },
      { key: "commission_rate", label: "Commission %" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "biens_vente",
    fileName: "biens_vente.xlsx",
    sheetName: "Biens en vente",
    columns: [
      { key: "id", label: "ID" },
      { key: "title", label: "Titre" },
      { key: "address", label: "Adresse" },
      { key: "city", label: "Ville" },
      { key: "property_type", label: "Type" },
      { key: "price", label: "Prix" },
      { key: "area", label: "Superficie" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "ventes_immobilieres",
    fileName: "ventes_immobilieres.xlsx",
    sheetName: "Ventes immobilières",
    columns: [
      { key: "id", label: "ID" },
      { key: "bien_id", label: "Bien ID" },
      { key: "acquereur_name", label: "Acquéreur" },
      { key: "acquereur_phone", label: "Tél acquéreur" },
      { key: "sale_price", label: "Prix vente" },
      { key: "commission_amount", label: "Commission" },
      { key: "sale_date", label: "Date vente" },
      { key: "payment_type", label: "Type paiement" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "biens_achat",
    fileName: "biens_achat.xlsx",
    sheetName: "Biens achat",
    columns: [
      { key: "id", label: "ID" },
      { key: "title", label: "Titre" },
      { key: "address", label: "Adresse" },
      { key: "city", label: "Ville" },
      { key: "property_type", label: "Type" },
      { key: "price", label: "Prix" },
      { key: "area", label: "Superficie" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "achats_immobiliers",
    fileName: "achats_immobiliers.xlsx",
    sheetName: "Achats immobiliers",
    columns: [
      { key: "id", label: "ID" },
      { key: "bien_id", label: "Bien ID" },
      { key: "sale_price", label: "Prix" },
      { key: "payment_type", label: "Type paiement" },
      { key: "sale_date", label: "Date" },
      { key: "commission_amount", label: "Commission" },
      { key: "notary_fees", label: "Frais notaire" },
      { key: "notes", label: "Notes" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "lotissements",
    fileName: "lotissements.xlsx",
    sheetName: "Lotissements",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nom" },
      { key: "location", label: "Localisation" },
      { key: "total_area", label: "Superficie totale" },
      { key: "total_lots", label: "Nombre lots" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "parcelles",
    fileName: "parcelles.xlsx",
    sheetName: "Parcelles",
    columns: [
      { key: "id", label: "ID" },
      { key: "lot_number", label: "N° Lot" },
      { key: "ilot_id", label: "Îlot ID" },
      { key: "area", label: "Superficie" },
      { key: "price", label: "Prix" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "ventes_parcelles",
    fileName: "ventes_parcelles.xlsx",
    sheetName: "Ventes parcelles",
    columns: [
      { key: "id", label: "ID" },
      { key: "parcelle_id", label: "Parcelle ID" },
      { key: "buyer_name", label: "Acheteur" },
      { key: "buyer_phone", label: "Tél acheteur" },
      { key: "sale_price", label: "Prix vente" },
      { key: "payment_type", label: "Type paiement" },
      { key: "sale_date", label: "Date vente" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "apporteurs_affaires",
    fileName: "apporteurs_affaires.xlsx",
    sheetName: "Apporteurs d'affaires",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nom" },
      { key: "phone", label: "Téléphone" },
      { key: "email", label: "Email" },
      { key: "commission_percentage", label: "Commission %" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "apports",
    fileName: "apports.xlsx",
    sheetName: "Apports",
    columns: [
      { key: "id", label: "ID" },
      { key: "apporteur_id", label: "Apporteur ID" },
      { key: "property_id", label: "Bien ID" },
      { key: "tenant_id", label: "Locataire ID" },
      { key: "commission_percentage", label: "Commission %" },
      { key: "commission_amount", label: "Montant commission" },
      { key: "status", label: "Statut" },
      { key: "apport_date", label: "Date" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "documents",
    fileName: "documents.xlsx",
    sheetName: "Documents",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nom" },
      { key: "type", label: "Type" },
      { key: "property_id", label: "Bien ID" },
      { key: "tenant_id", label: "Locataire ID" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "interventions",
    fileName: "interventions.xlsx",
    sheetName: "Interventions",
    columns: [
      { key: "id", label: "ID" },
      { key: "property_id", label: "Bien ID" },
      { key: "tenant_id", label: "Locataire ID" },
      { key: "title", label: "Titre" },
      { key: "description", label: "Description" },
      { key: "cost", label: "Coût" },
      { key: "status", label: "Statut" },
      { key: "intervention_date", label: "Date" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "owner_payouts",
    fileName: "reversements_proprietaires.xlsx",
    sheetName: "Reversements",
    columns: [
      { key: "id", label: "ID" },
      { key: "owner_id", label: "Propriétaire ID" },
      { key: "amount", label: "Montant" },
      { key: "payment_method", label: "Mode" },
      { key: "period_from", label: "Période début" },
      { key: "period_to", label: "Période fin" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date création" },
    ],
  },
];

export function ExportAllDataButton() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState("");

  const handleExport = async () => {
    if (!user) return;

    setIsExporting(true);
    const zip = new JSZip();
    let fileCount = 0;

    try {
      for (let i = 0; i < TABLE_CONFIGS.length; i++) {
        const config = TABLE_CONFIGS[i];
        setProgress(`${i + 1}/${TABLE_CONFIGS.length} — ${config.sheetName}...`);

        try {
          const data = await fetchAllRows(config.table, user.id);
          if (data.length > 0) {
            const buffer = await createExcelBuffer(config.sheetName, data, config.columns);
            if (buffer) {
              zip.file(config.fileName, buffer);
              fileCount++;
            }
          }
        } catch (err) {
          console.warn(`Erreur pour ${config.table}:`, err);
        }
      }

      if (fileCount === 0) {
        toast.info("Aucune donnée à exporter");
        return;
      }

      setProgress("Compression en cours...");
      const blob = await zip.generateAsync({ type: "blob" });
      
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `export_donnees_${dateStr}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Export terminé — ${fileCount} fichier(s) exporté(s)`);
    } catch (error) {
      console.error("Erreur export:", error);
      toast.error("Erreur lors de l'export des données");
    } finally {
      setIsExporting(false);
      setProgress("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Export de données
        </CardTitle>
        <CardDescription>
          Téléchargez l'ensemble de vos données sous forme de fichiers Excel compressés (ZIP)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>L'export inclut :</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>📊 Comptabilité (paiements, dépenses, reversements)</li>
            <li>🏡 Gestion locative (biens, locataires, contrats)</li>
            <li>🏠 Ventes et achats immobiliers</li>
            <li>📍 Lotissements (parcelles, ventes)</li>
            <li>🤝 Apporteurs d'affaires et commissions</li>
            <li>📑 Documents et interventions</li>
          </ul>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          <span>Seules les données de votre agence sont exportées</span>
        </div>

        <Button onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {progress || "Export en cours..."}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exporter toutes mes données
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
