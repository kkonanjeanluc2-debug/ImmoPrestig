import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExportDropdown } from "@/components/export/ExportDropdown";
import { Download, Search, FileText } from "lucide-react";
import { useParcelles } from "@/hooks/useParcelles";
import { useVentesParcelles, VenteWithDetails } from "@/hooks/useVentesParcelles";
import { useIlotsWithStats } from "@/hooks/useIlots";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generateGuidePDF } from "@/lib/generateGuidePDF";
import { useAgency } from "@/hooks/useAgency";
import { useGuideTemplates } from "@/hooks/useGuideTemplates";
import { ExportColumn } from "@/lib/exportData";

interface GuideEntry {
  numero: number;
  ilot: string;
  lot: string;
  attributaire: string;
  attestation_numero: string;
  attestation_date: string;
  contact: string;
  equipement: string;
  nature_piece: string;
  numero_piece: string;
  date_piece: string;
  status: string;
}

interface GuideLotissementTabProps {
  lotissementId: string;
  lotissementName: string;
  guideTemplateId?: string | null;
}

export function GuideLotissementTab({ lotissementId, lotissementName, guideTemplateId }: GuideLotissementTabProps) {
  const { data: parcelles } = useParcelles(lotissementId);
  const { data: ventes } = useVentesParcelles(lotissementId);
  const { data: ilots } = useIlotsWithStats(lotissementId);
  const { data: agency } = useAgency();
  const { data: guideTemplates = [] } = useGuideTemplates();
  const [search, setSearch] = useState("");

  const guideEntries = useMemo(() => {
    if (!parcelles) return [];

    const ventesMap = new Map<string, VenteWithDetails>();
    ventes?.forEach(v => ventesMap.set(v.parcelle_id, v));

    const ilotsMap = new Map<string, string>();
    ilots?.forEach(i => ilotsMap.set(i.id, i.name));

    // Sort parcelles by ilot name then plot number
    const sorted = [...parcelles].sort((a, b) => {
      const ilotA = a.ilot_id ? (ilotsMap.get(a.ilot_id) || "") : "";
      const ilotB = b.ilot_id ? (ilotsMap.get(b.ilot_id) || "") : "";
      if (ilotA !== ilotB) return ilotA.localeCompare(ilotB, "fr", { numeric: true });
      return a.plot_number.localeCompare(b.plot_number, "fr", { numeric: true });
    });

    return sorted.map((parcelle, index): GuideEntry => {
      const vente = ventesMap.get(parcelle.id);
      const ilotName = parcelle.ilot_id ? (ilotsMap.get(parcelle.ilot_id) || "-") : "-";

      return {
        numero: index + 1,
        ilot: ilotName,
        lot: parcelle.plot_number,
        attributaire: vente?.acquereur?.name || "",
        attestation_numero: "",
        attestation_date: vente ? format(new Date(vente.sale_date), "dd/MM/yyyy") : "",
        contact: vente?.acquereur?.phone || "",
        equipement: "",
        nature_piece: "",
        numero_piece: "",
        date_piece: "",
        status: parcelle.status,
      };
    });
  }, [parcelles, ventes, ilots]);

  const filtered = useMemo(() => {
    if (!search.trim()) return guideEntries;
    const q = search.toLowerCase();
    return guideEntries.filter(e =>
      e.attributaire.toLowerCase().includes(q) ||
      e.lot.toLowerCase().includes(q) ||
      e.ilot.toLowerCase().includes(q) ||
      e.contact.toLowerCase().includes(q)
    );
  }, [guideEntries, search]);

  const exportColumns: ExportColumn<GuideEntry>[] = [
    { key: "numero", label: "N°" },
    { key: "ilot", label: "Îlot" },
    { key: "lot", label: "Lot" },
    { key: "attributaire", label: "Attributaires (Nom & Prénoms)" },
    { key: "attestation_numero", label: "Attestation N°" },
    { key: "attestation_date", label: "Date Attestation" },
    { key: "contact", label: "Contact" },
    { key: "equipement", label: "Équipement" },
    { key: "nature_piece", label: "Nature Pièce" },
    { key: "numero_piece", label: "N° Pièce" },
    { key: "date_piece", label: "Date Pièce" },
    { key: "status", label: "Statut", format: (v) => v === "vendu" ? "Vendu" : v === "reserve" ? "Réservé" : "Disponible" },
  ];

  const handleExportPDF = () => {
    const template = guideTemplateId
      ? guideTemplates.find(t => t.id === guideTemplateId)
      : guideTemplates.find(t => t.is_default);

    generateGuidePDF(guideEntries, lotissementName, {
      totalParcelles: parcelles?.length || 0,
      agency: agency || undefined,
      coverPage: template ? {
        district: template.district,
        commune: template.commune,
        title_color: template.title_color,
        subtitle_color: template.subtitle_color,
        border_color: template.border_color,
        bg_color: template.bg_color,
      } : undefined,
    });
  };

  const statusColor = (s: string) => {
    if (s === "vendu") return "default";
    if (s === "reserve") return "secondary";
    return "outline";
  };

  const statusLabel = (s: string) => {
    if (s === "vendu") return "Vendu";
    if (s === "reserve") return "Réservé";
    return "Disponible";
  };

  // Group stats by ilot
  const ilotStats = useMemo(() => {
    const map = new Map<string, { total: number; vendus: number; reserves: number; disponibles: number }>();
    guideEntries.forEach(e => {
      const stats = map.get(e.ilot) || { total: 0, vendus: 0, reserves: 0, disponibles: 0 };
      stats.total++;
      if (e.status === "vendu") stats.vendus++;
      else if (e.status === "reserve") stats.reserves++;
      else stats.disponibles++;
      map.set(e.ilot, stats);
    });
    return map;
  }, [guideEntries]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">
                Guide Lotissement {lotissementName}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {guideEntries.length} parcelle{guideEntries.length > 1 ? "s" : ""} 
                {" · "}
                {ilotStats.size} îlot{ilotStats.size > 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <ExportDropdown
                data={guideEntries}
                filename={`guide-${lotissementName}`}
                columns={exportColumns}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, lot, îlot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 text-center">N°</TableHead>
                  <TableHead>Îlot</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead>Attributaires (Nom & Prénoms)</TableHead>
                  <TableHead className="text-center">Attestation N°</TableHead>
                  <TableHead className="text-center">Date</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Équipement</TableHead>
                  <TableHead>Nature Pièce</TableHead>
                  <TableHead>N° Pièce</TableHead>
                  <TableHead className="text-center">Date Pièce</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      Aucune parcelle trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((entry) => (
                    <TableRow key={`${entry.ilot}-${entry.lot}`}>
                      <TableCell className="text-center font-medium">{entry.numero}</TableCell>
                      <TableCell className="font-medium">{entry.ilot}</TableCell>
                      <TableCell className="font-medium">{entry.lot}</TableCell>
                      <TableCell>{entry.attributaire || <span className="text-muted-foreground italic">—</span>}</TableCell>
                      <TableCell className="text-center">{entry.attestation_numero || "—"}</TableCell>
                      <TableCell className="text-center">{entry.attestation_date || "—"}</TableCell>
                      <TableCell>{entry.contact || "—"}</TableCell>
                      <TableCell>{entry.equipement || "—"}</TableCell>
                      <TableCell>{entry.nature_piece || "—"}</TableCell>
                      <TableCell>{entry.numero_piece || "—"}</TableCell>
                      <TableCell className="text-center">{entry.date_piece || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusColor(entry.status)}>
                          {statusLabel(entry.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
