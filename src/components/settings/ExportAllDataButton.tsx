import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Download, Loader2, Database, ShieldCheck } from "lucide-react";
import JSZip from "jszip";
import ExcelJS from "exceljs";

// ─── File download helpers ───

interface FileRecord { name: string; url: string }

interface FileSource {
  table: string;
  folder: string;
  bucket: string | null;
  urlColumn: string;
  nameColumn: string;
}

const FILE_SOURCES: FileSource[] = [
  { table: "documents", folder: "Documents", bucket: "documents", urlColumn: "file_url", nameColumn: "name" },
  { table: "documents_achats", folder: "Documents Achats", bucket: "documents-achats", urlColumn: "file_url", nameColumn: "name" },
  { table: "lotissement_documents", folder: "Documents Lotissements", bucket: "documents", urlColumn: "file_url", nameColumn: "name" },
  { table: "tenants", folder: "CNI Locataires", bucket: "documents-achats", urlColumn: "cni_document_url", nameColumn: "name" },
  { table: "tenants", folder: "Avatars Locataires", bucket: "property-images", urlColumn: "avatar_url", nameColumn: "name" },
  { table: "expenses", folder: "Justificatifs Dépenses", bucket: "documents", urlColumn: "receipt_url", nameColumn: "description" },
  { table: "property_images", folder: "Photos Biens Locatifs", bucket: "property-images", urlColumn: "image_url", nameColumn: "image_url" },
  { table: "biens_vente_images", folder: "Photos Biens Vente", bucket: "property-images", urlColumn: "image_url", nameColumn: "image_url" },
  { table: "unpaid_case_actions", folder: "Documents Impayés", bucket: "documents", urlColumn: "document_url", nameColumn: "document_url" },
  { table: "properties", folder: "Images Biens Locatifs", bucket: "property-images", urlColumn: "image_url", nameColumn: "title" },
  { table: "biens_vente", folder: "Images Biens Vente", bucket: "property-images", urlColumn: "image_url", nameColumn: "title" },
  { table: "biens_achat", folder: "Images Biens Achat", bucket: "property-images", urlColumn: "image_url", nameColumn: "title" },
  { table: "agencies", folder: "Logo Agence", bucket: "agency-logos", urlColumn: "logo_url", nameColumn: "name" },
  { table: "lotissements", folder: "Images Lotissements", bucket: "property-images", urlColumn: "image_url", nameColumn: "name" },
  { table: "lotissements", folder: "Signatures Chef Lotissements", bucket: "property-images", urlColumn: "chef_signature_url", nameColumn: "name" },
  { table: "lotissements", folder: "Cachets Chef Lotissements", bucket: "property-images", urlColumn: "chef_stamp_url", nameColumn: "name" },
  { table: "profiles", folder: "Avatars Profils", bucket: "property-images", urlColumn: "avatar_url", nameColumn: "email" },
  { table: "receipt_templates", folder: "Cachets Modèles Reçus", bucket: "property-images", urlColumn: "stamp_image_url", nameColumn: "name" },
  { table: "receipt_templates", folder: "Filigranes Modèles Reçus", bucket: "property-images", urlColumn: "watermark_image_url", nameColumn: "name" },
  { table: "attestation_templates", folder: "Logos Villages Attestations", bucket: "property-images", urlColumn: "village_logo_url", nameColumn: "name" },
  { table: "attestation_templates", folder: "Filigranes Attestations", bucket: "property-images", urlColumn: "watermark_image_url", nameColumn: "name" },
];

// Special array-based file sources (photos stored as string arrays)
interface ArrayFileSource {
  table: string;
  folder: string;
  bucket: string;
  arrayColumn: string;
}

const ARRAY_FILE_SOURCES: ArrayFileSource[] = [
  { table: "etats_des_lieux", folder: "Photos États des Lieux", bucket: "documents-achats", arrayColumn: "photos" },
];

async function fetchFileRecords(source: FileSource, userId: string): Promise<FileRecord[]> {
  const PAGE_SIZE = 1000;
  let allRows: FileRecord[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const selectCols = source.urlColumn === source.nameColumn
      ? source.urlColumn
      : `${source.nameColumn}, ${source.urlColumn}`;

    const { data, error } = await (supabase as any)
      .from(source.table)
      .select(selectCols)
      .eq("user_id", userId)
      .not(source.urlColumn, "is", null)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const records = (data || []).map((row: any) => ({
      name: row[source.nameColumn] || "fichier",
      url: row[source.urlColumn],
    })).filter((r: FileRecord) => r.url);

    allRows = allRows.concat(records);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }
  return allRows;
}

async function downloadFile(fileUrl: string, bucket: string | null): Promise<Blob | null> {
  try {
    if (fileUrl.startsWith("http")) {
      const response = await fetch(fileUrl);
      if (!response.ok) return null;
      return await response.blob();
    }
    const storageBucket = bucket || "documents";
    const { data, error } = await supabase.storage.from(storageBucket).download(fileUrl);
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

// ─── Data fetch helpers ───

async function fetchAllRows(table: string, userId: string) {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await (supabase as any)
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .range(from, from + PAGE_SIZE - 1);

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

// Helper: auto-generate columns from first row keys
function autoColumns(data: any[]): { key: string; label: string }[] {
  if (data.length === 0) return [];
  return Object.keys(data[0]).map(key => ({ key, label: key }));
}

// ─── Table configs ───

const TABLE_CONFIGS: {
  table: string;
  fileName: string;
  sheetName: string;
  columns?: { key: string; label: string }[];
}[] = [
  {
    table: "properties", fileName: "biens_locatifs.xlsx", sheetName: "Biens locatifs",
    columns: [
      { key: "id", label: "ID" }, { key: "title", label: "Titre" }, { key: "address", label: "Adresse" },
      { key: "city", label: "Ville" }, { key: "property_type", label: "Type" }, { key: "price", label: "Loyer" },
      { key: "area", label: "Superficie" }, { key: "bedrooms", label: "Chambres" }, { key: "bathrooms", label: "SdB" },
      { key: "status", label: "Statut" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "tenants", fileName: "locataires.xlsx", sheetName: "Locataires",
    columns: [
      { key: "id", label: "ID" }, { key: "first_name", label: "Prénom" }, { key: "last_name", label: "Nom" },
      { key: "email", label: "Email" }, { key: "phone", label: "Téléphone" }, { key: "profession", label: "Profession" },
      { key: "cni_number", label: "N° CNI" }, { key: "status", label: "Statut" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "contracts", fileName: "contrats.xlsx", sheetName: "Contrats",
    columns: [
      { key: "id", label: "ID" }, { key: "property_id", label: "Bien ID" }, { key: "tenant_id", label: "Locataire ID" },
      { key: "rent_amount", label: "Loyer" }, { key: "deposit", label: "Caution" },
      { key: "start_date", label: "Début" }, { key: "end_date", label: "Fin" },
      { key: "status", label: "Statut" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "payments", fileName: "paiements.xlsx", sheetName: "Paiements",
    columns: [
      { key: "id", label: "ID" }, { key: "tenant_id", label: "Locataire ID" }, { key: "amount", label: "Montant" },
      { key: "payment_date", label: "Date" }, { key: "payment_method", label: "Mode" },
      { key: "status", label: "Statut" }, { key: "payment_months", label: "Mois payés" },
      { key: "receipt_number", label: "N° Reçu" }, { key: "notes", label: "Notes" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "expenses", fileName: "depenses.xlsx", sheetName: "Dépenses",
    columns: [
      { key: "id", label: "ID" }, { key: "property_id", label: "Bien ID" }, { key: "category", label: "Catégorie" },
      { key: "amount", label: "Montant" }, { key: "description", label: "Description" },
      { key: "expense_date", label: "Date" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "owners", fileName: "proprietaires.xlsx", sheetName: "Propriétaires",
    columns: [
      { key: "id", label: "ID" }, { key: "name", label: "Nom" }, { key: "email", label: "Email" },
      { key: "phone", label: "Tél" }, { key: "address", label: "Adresse" },
      { key: "management_type", label: "Type gestion" }, { key: "commission_rate", label: "Commission %" },
      { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "biens_vente", fileName: "biens_vente.xlsx", sheetName: "Biens en vente",
    columns: [
      { key: "id", label: "ID" }, { key: "title", label: "Titre" }, { key: "address", label: "Adresse" },
      { key: "city", label: "Ville" }, { key: "property_type", label: "Type" }, { key: "price", label: "Prix" },
      { key: "area", label: "Superficie" }, { key: "status", label: "Statut" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "ventes_immobilieres", fileName: "ventes_immobilieres.xlsx", sheetName: "Ventes immobilières",
    columns: [
      { key: "id", label: "ID" }, { key: "bien_id", label: "Bien ID" }, { key: "acquereur_name", label: "Acquéreur" },
      { key: "sale_price", label: "Prix vente" }, { key: "commission_amount", label: "Commission" },
      { key: "sale_date", label: "Date vente" }, { key: "payment_type", label: "Type paiement" },
      { key: "status", label: "Statut" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "biens_achat", fileName: "biens_achat.xlsx", sheetName: "Biens achat",
    columns: [
      { key: "id", label: "ID" }, { key: "title", label: "Titre" }, { key: "address", label: "Adresse" },
      { key: "city", label: "Ville" }, { key: "property_type", label: "Type" }, { key: "price", label: "Prix" },
      { key: "area", label: "Superficie" }, { key: "status", label: "Statut" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "achats_immobiliers", fileName: "achats_immobiliers.xlsx", sheetName: "Achats immobiliers",
    columns: [
      { key: "id", label: "ID" }, { key: "bien_id", label: "Bien ID" }, { key: "sale_price", label: "Prix" },
      { key: "payment_type", label: "Type paiement" }, { key: "sale_date", label: "Date" },
      { key: "commission_amount", label: "Commission" }, { key: "notary_fees", label: "Frais notaire" },
      { key: "notes", label: "Notes" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "lotissements", fileName: "lotissements.xlsx", sheetName: "Lotissements",
    columns: [
      { key: "id", label: "ID" }, { key: "name", label: "Nom" }, { key: "location", label: "Localisation" },
      { key: "total_area", label: "Superficie totale" }, { key: "total_lots", label: "Nombre lots" },
      { key: "status", label: "Statut" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "parcelles", fileName: "parcelles.xlsx", sheetName: "Parcelles",
    columns: [
      { key: "id", label: "ID" }, { key: "lot_number", label: "N° Lot" }, { key: "ilot_id", label: "Îlot ID" },
      { key: "area", label: "Superficie" }, { key: "price", label: "Prix" },
      { key: "status", label: "Statut" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "ventes_parcelles", fileName: "ventes_parcelles.xlsx", sheetName: "Ventes parcelles",
    columns: [
      { key: "id", label: "ID" }, { key: "parcelle_id", label: "Parcelle ID" }, { key: "buyer_name", label: "Acheteur" },
      { key: "buyer_phone", label: "Tél acheteur" }, { key: "sale_price", label: "Prix vente" },
      { key: "payment_type", label: "Type paiement" }, { key: "sale_date", label: "Date vente" },
      { key: "status", label: "Statut" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "apporteurs_affaires", fileName: "apporteurs_affaires.xlsx", sheetName: "Apporteurs d'affaires",
    columns: [
      { key: "id", label: "ID" }, { key: "name", label: "Nom" }, { key: "phone", label: "Tél" },
      { key: "email", label: "Email" }, { key: "commission_percentage", label: "Commission %" },
      { key: "status", label: "Statut" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "apports", fileName: "apports.xlsx", sheetName: "Apports",
    columns: [
      { key: "id", label: "ID" }, { key: "apporteur_id", label: "Apporteur ID" }, { key: "property_id", label: "Bien ID" },
      { key: "tenant_id", label: "Locataire ID" }, { key: "commission_percentage", label: "Commission %" },
      { key: "commission_amount", label: "Montant" }, { key: "status", label: "Statut" },
      { key: "apport_date", label: "Date" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "documents", fileName: "documents.xlsx", sheetName: "Documents",
    columns: [
      { key: "id", label: "ID" }, { key: "name", label: "Nom" }, { key: "type", label: "Type" },
      { key: "property_id", label: "Bien ID" }, { key: "tenant_id", label: "Locataire ID" },
      { key: "status", label: "Statut" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "property_interventions", fileName: "interventions.xlsx", sheetName: "Interventions",
    columns: [
      { key: "id", label: "ID" }, { key: "property_id", label: "Bien ID" }, { key: "tenant_id", label: "Locataire ID" },
      { key: "title", label: "Titre" }, { key: "description", label: "Description" }, { key: "cost", label: "Coût" },
      { key: "status", label: "Statut" }, { key: "intervention_date", label: "Date" }, { key: "created_at", label: "Date création" },
    ],
  },
  {
    table: "owner_payouts", fileName: "reversements_proprietaires.xlsx", sheetName: "Reversements",
    columns: [
      { key: "id", label: "ID" }, { key: "owner_id", label: "Propriétaire ID" }, { key: "amount", label: "Montant" },
      { key: "payment_method", label: "Mode" }, { key: "period_from", label: "Période début" },
      { key: "period_to", label: "Période fin" }, { key: "status", label: "Statut" }, { key: "created_at", label: "Date création" },
    ],
  },
  // ─── Tables ajoutées pour export complet ───
  { table: "acquereurs", fileName: "acquereurs.xlsx", sheetName: "Acquéreurs" },
  { table: "vendeurs", fileName: "vendeurs.xlsx", sheetName: "Vendeurs" },
  { table: "acquisitions", fileName: "acquisitions.xlsx", sheetName: "Acquisitions" },
  { table: "property_units", fileName: "unites_logement.xlsx", sheetName: "Unités" },
  { table: "ilots", fileName: "ilots.xlsx", sheetName: "Îlots" },
  { table: "beneficiaires_lots", fileName: "beneficiaires_lots.xlsx", sheetName: "Bénéficiaires lots" },
  { table: "echeances_ventes", fileName: "echeances_ventes.xlsx", sheetName: "Échéances ventes" },
  { table: "echeances_achats", fileName: "echeances_achats.xlsx", sheetName: "Échéances achats" },
  { table: "echeances_parcelles", fileName: "echeances_parcelles.xlsx", sheetName: "Échéances parcelles" },
  { table: "colocation_tenants", fileName: "colocation_tenants.xlsx", sheetName: "Colocataires" },
  { table: "etats_des_lieux", fileName: "etats_des_lieux.xlsx", sheetName: "États des lieux" },
  { table: "unpaid_cases", fileName: "cas_impayes.xlsx", sheetName: "Cas impayés" },
  { table: "unpaid_case_actions", fileName: "actions_impayes.xlsx", sheetName: "Actions impayés" },
  { table: "notifications", fileName: "notifications.xlsx", sheetName: "Notifications" },
  { table: "tenant_requests", fileName: "requetes_locataires.xlsx", sheetName: "Requêtes locataires" },
  { table: "online_rent_payments", fileName: "paiements_en_ligne.xlsx", sheetName: "Paiements en ligne" },
  { table: "documents_achats", fileName: "documents_achats.xlsx", sheetName: "Documents achats" },
  { table: "lotissement_documents", fileName: "documents_lotissements.xlsx", sheetName: "Documents lotissements" },
  { table: "demarches_administratives", fileName: "demarches_administratives.xlsx", sheetName: "Démarches admin" },
  { table: "offres_achat", fileName: "offres_achat.xlsx", sheetName: "Offres d'achat" },
  { table: "reservations_parcelles", fileName: "reservations_parcelles.xlsx", sheetName: "Réservations parcelles" },
  { table: "reservations_vente", fileName: "reservations_vente.xlsx", sheetName: "Réservations vente" },
  { table: "vente_prospects", fileName: "prospects_vente.xlsx", sheetName: "Prospects vente" },
  { table: "parcelle_prospects", fileName: "prospects_parcelles.xlsx", sheetName: "Prospects parcelles" },
  { table: "mutations_achats", fileName: "mutations_achats.xlsx", sheetName: "Mutations achats" },
  { table: "mutations_parcelles", fileName: "mutations_parcelles.xlsx", sheetName: "Mutations parcelles" },
  { table: "proforma_invoices", fileName: "factures_proforma.xlsx", sheetName: "Factures proforma" },
  { table: "property_inventories", fileName: "inventaires.xlsx", sheetName: "Inventaires" },
  { table: "inventory_items", fileName: "items_inventaire.xlsx", sheetName: "Items inventaire" },
  { table: "contract_signatures", fileName: "signatures_contrats.xlsx", sheetName: "Signatures contrats" },
  { table: "vente_signatures", fileName: "signatures_ventes.xlsx", sheetName: "Signatures ventes" },
  { table: "achat_signatures", fileName: "signatures_achats.xlsx", sheetName: "Signatures achats" },
  { table: "email_logs", fileName: "logs_emails.xlsx", sheetName: "Logs emails" },
  { table: "whatsapp_logs", fileName: "logs_whatsapp.xlsx", sheetName: "Logs WhatsApp" },
  { table: "activity_logs", fileName: "logs_activite.xlsx", sheetName: "Logs activité" },
  { table: "automation_logs", fileName: "logs_automatisation.xlsx", sheetName: "Logs automatisation" },
  { table: "contract_templates", fileName: "modeles_contrats.xlsx", sheetName: "Modèles contrats" },
  { table: "receipt_templates", fileName: "modeles_recus.xlsx", sheetName: "Modèles reçus" },
  { table: "sale_contract_templates", fileName: "modeles_contrats_vente.xlsx", sheetName: "Modèles contrats vente" },
  { table: "achat_contract_templates", fileName: "modeles_contrats_achat.xlsx", sheetName: "Modèles contrats achat" },
  { table: "colocation_contract_templates", fileName: "modeles_contrats_colocation.xlsx", sheetName: "Modèles colocation" },
  { table: "promesse_vente_templates", fileName: "modeles_promesse_vente.xlsx", sheetName: "Modèles promesse vente" },
  { table: "attestation_templates", fileName: "modeles_attestations.xlsx", sheetName: "Modèles attestations" },
  { table: "guide_templates", fileName: "modeles_guides.xlsx", sheetName: "Modèles guides" },
  { table: "management_contract_templates", fileName: "modeles_contrats_gestion.xlsx", sheetName: "Modèles gestion" },
  { table: "reservation_form_templates", fileName: "modeles_reservations.xlsx", sheetName: "Modèles réservations" },
  { table: "profiles", fileName: "profils.xlsx", sheetName: "Profils" },
  { table: "agencies", fileName: "agence.xlsx", sheetName: "Agence" },
  { table: "parcelle_admin_status", fileName: "statuts_admin_parcelles.xlsx", sheetName: "Statuts admin parcelles" },
  { table: "payouts", fileName: "payouts.xlsx", sheetName: "Payouts" },
  { table: "withdrawal_requests", fileName: "demandes_retrait.xlsx", sheetName: "Demandes retrait" },
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
      // 1. Export Excel files for all tables
      for (let i = 0; i < TABLE_CONFIGS.length; i++) {
        const config = TABLE_CONFIGS[i];
        setProgress(`Excel ${i + 1}/${TABLE_CONFIGS.length} — ${config.sheetName}...`);

        try {
          const data = await fetchAllRows(config.table, user.id);
          if (data.length > 0) {
            const cols = config.columns || autoColumns(data);
            const buffer = await createExcelBuffer(config.sheetName, data, cols);
            if (buffer) {
              zip.file(`Données Excel/${config.fileName}`, buffer);
              fileCount++;
            }
          }
        } catch (err) {
          console.warn(`Erreur pour ${config.table}:`, err);
        }
      }

      // 2. Export all files (PDF, images, documents) from storage
      let docCount = 0;
      for (const source of FILE_SOURCES) {
        setProgress(`Téléchargement ${source.folder}...`);
        try {
          const docs = await fetchFileRecords(source, user.id);
          for (let j = 0; j < docs.length; j++) {
            const doc = docs[j];
            setProgress(`${source.folder} — ${j + 1}/${docs.length}`);

            const blob = await downloadFile(doc.url, source.bucket);
            if (blob) {
              const ext = doc.url.split('.').pop()?.split('?')[0]?.toLowerCase() || 'pdf';
              const rawName = doc.url.startsWith("http")
                ? doc.url.split('/').pop()?.split('?')[0] || doc.name
                : doc.name;
              const safeName = rawName.replace(/[/\\?%*:|"<>]/g, '_');
              const fileName = safeName.match(/\.\w{2,5}$/) ? safeName : `${safeName}.${ext}`;
              zip.file(`${source.folder}/${fileName}`, blob);
              docCount++;
            }
          }
        } catch (err) {
          console.warn(`Erreur docs ${source.table}:`, err);
        }
      }

      fileCount += docCount;

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

      toast.success(`Export terminé — ${fileCount} élément(s) exporté(s) (dont ${docCount} document(s)/fichier(s))`);
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
          Export complet des données
        </CardTitle>
        <CardDescription>
          Téléchargez l'intégralité de vos données (Excel + tous les fichiers PDF, photos et documents) en ZIP
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>L'export inclut :</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>📊 Comptabilité (paiements, dépenses, reversements, échéances)</li>
            <li>🏡 Gestion locative (biens, locataires, contrats, unités)</li>
            <li>🏠 Ventes et achats immobiliers (acquéreurs, vendeurs, offres)</li>
            <li>📍 Lotissements (parcelles, îlots, ventes, réservations, démarches)</li>
            <li>🤝 Apporteurs d'affaires et commissions</li>
            <li>📑 Tous les documents, modèles et signatures</li>
            <li>📄 Fichiers PDF, photos et documents uploadés</li>
            <li>📋 États des lieux, inventaires, interventions</li>
            <li>📧 Logs emails, WhatsApp et activités</li>
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
