import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { createPDFDocument } from "@/lib/pdfFont";
import { addPDFHeader, addPDFFooter, PDFAgencyInfo } from "@/lib/pdfHeader";
import { formatAmountForPDF, formatAmountWithCurrency } from "@/lib/pdfFormat";
import { supabase } from "@/integrations/supabase/client";
import { AssignableUser } from "@/hooks/useAssignableUsers";

interface Props {
  managers: AssignableUser[];
  periodFrom: Date;
  periodTo: Date;
  periodLabel: string;
  agency?: PDFAgencyInfo | null;
}

interface ManagerRevenue {
  name: string;
  role: string;
  loyers: number;
  ventesImmo: number;
  achatsImmo: number;
  lotissements: number;
  total: number;
}

const primaryColor: [number, number, number] = [26, 54, 93];
const textColor: [number, number, number] = [51, 51, 51];
const lightGray: [number, number, number] = [245, 245, 245];
const successColor: [number, number, number] = [34, 197, 94];

export function ExportManagerPerformance({ managers, periodFrom, periodTo, periodLabel, agency }: Props) {

  const exportPDF = async () => {
    try {
      const fromStr = periodFrom.toISOString().split("T")[0];
      const toStr = periodTo.toISOString().split("T")[0];

      // 1. Fetch tenants with assigned_to
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, assigned_to")
        .is("deleted_at", null);

      // 2. Fetch paid payments in period
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, status, due_date, tenant_id, paid_amount")
        .gte("due_date", fromStr)
        .lte("due_date", toStr)
        .eq("status", "paid");

      // 3. Fetch ventes immobilières with sold_by
      const { data: ventesImmo } = await supabase
        .from("ventes_immobilieres")
        .select("id, sold_by, down_payment, total_price, payment_type, sale_date");

      // 4. Fetch paid echeances_ventes in period
      const { data: echeancesVentes } = await supabase
        .from("echeances_ventes")
        .select("amount, status, due_date, vente_id")
        .gte("due_date", fromStr)
        .lte("due_date", toStr)
        .eq("status", "paid");

      // 5. Fetch ventes parcelles with sold_by
      const { data: ventesParcelles } = await supabase
        .from("ventes_parcelles")
        .select("id, sold_by, down_payment, total_price, payment_type, sale_date");

      // 6. Fetch paid echeances_parcelles in period
      const { data: echeancesParcelles } = await supabase
        .from("echeances_parcelles")
        .select("amount, status, due_date, vente_id")
        .gte("due_date", fromStr)
        .lte("due_date", toStr)
        .eq("status", "paid");

      // 7. Fetch biens_achat with assigned_to
      const { data: biensAchat } = await supabase
        .from("biens_achat")
        .select("id, assigned_to")
        .is("deleted_at", null);

      // 8. Fetch achats_immobiliers
      const { data: achatsImmo } = await supabase
        .from("achats_immobiliers")
        .select("id, bien_id, down_payment, sale_price, payment_type, sale_date");

      // 9. Fetch paid echeances_achats in period
      const { data: echeancesAchats } = await supabase
        .from("echeances_achats")
        .select("amount, status, due_date, achat_id")
        .gte("due_date", fromStr)
        .lte("due_date", toStr)
        .eq("status", "paid");

      // Build maps
      const tenantsByAssigned = new Map<string, string[]>();
      (tenants || []).forEach(t => {
        if (t.assigned_to) {
          const list = tenantsByAssigned.get(t.assigned_to) || [];
          list.push(t.id);
          tenantsByAssigned.set(t.assigned_to, list);
        }
      });

      // Ventes immo: map vente_id -> sold_by
      const venteImmoSoldBy = new Map<string, string>();
      (ventesImmo || []).forEach(v => {
        if (v.sold_by) venteImmoSoldBy.set(v.id, v.sold_by);
      });

      // Ventes parcelles: map vente_id -> sold_by
      const venteParcelleSoldBy = new Map<string, string>();
      (ventesParcelles || []).forEach(v => {
        if (v.sold_by) venteParcelleSoldBy.set(v.id, v.sold_by);
      });

      // Biens achat: map bien_id -> assigned_to
      const bienAchatAssigned = new Map<string, string>();
      (biensAchat || []).forEach(b => {
        if (b.assigned_to) bienAchatAssigned.set(b.id, b.assigned_to);
      });

      // Achats immo: map achat_id -> assigned_to (via bien)
      const achatImmoAssigned = new Map<string, string>();
      (achatsImmo || []).forEach(a => {
        const assigned = bienAchatAssigned.get(a.bien_id);
        if (assigned) achatImmoAssigned.set(a.id, assigned);
      });

      // Calculate per manager
      const managerData: ManagerRevenue[] = managers.map(manager => {
        const uid = manager.user_id;
        const name = manager.full_name || manager.email || "Utilisateur";

        // Loyers: sum of paid payments for assigned tenants
        const tenantIds = new Set(tenantsByAssigned.get(uid) || []);
        const loyersTotal = (payments || [])
          .filter(p => tenantIds.has(p.tenant_id))
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        // Ventes Immo: down_payments (within period) + paid echeances for ventes sold_by this manager
        let ventesImmoTotal = 0;
        (ventesImmo || []).forEach(v => {
          if (v.sold_by === uid && v.sale_date >= fromStr && v.sale_date <= toStr && v.down_payment) {
            ventesImmoTotal += Number(v.down_payment);
          }
        });
        (echeancesVentes || []).forEach(e => {
          if (venteImmoSoldBy.get(e.vente_id) === uid) {
            ventesImmoTotal += Number(e.amount);
          }
        });

        // Lotissements: down_payments + paid echeances for parcelles sold_by this manager
        let lotissementsTotal = 0;
        (ventesParcelles || []).forEach(v => {
          if (v.sold_by === uid && v.sale_date >= fromStr && v.sale_date <= toStr && v.down_payment) {
            lotissementsTotal += Number(v.down_payment);
          }
        });
        (echeancesParcelles || []).forEach(e => {
          if (venteParcelleSoldBy.get(e.vente_id) === uid) {
            lotissementsTotal += Number(e.amount);
          }
        });

        // Achats Immo: down_payments + paid echeances for achats assigned to this manager
        let achatsImmoTotal = 0;
        (achatsImmo || []).forEach(a => {
          const assigned = bienAchatAssigned.get(a.bien_id);
          if (assigned === uid && a.sale_date >= fromStr && a.sale_date <= toStr && a.down_payment) {
            achatsImmoTotal += Number(a.down_payment);
          }
        });
        (echeancesAchats || []).forEach(e => {
          if (achatImmoAssigned.get(e.achat_id) === uid) {
            achatsImmoTotal += Number(e.amount);
          }
        });

        return {
          name,
          role: manager.role,
          loyers: loyersTotal,
          ventesImmo: ventesImmoTotal,
          achatsImmo: achatsImmoTotal,
          lotissements: lotissementsTotal,
          total: loyersTotal + ventesImmoTotal + achatsImmoTotal + lotissementsTotal,
        };
      });

      // Sort by total descending
      managerData.sort((a, b) => b.total - a.total);

      // Generate PDF
      const doc = await createPDFDocument();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = await addPDFHeader(doc, agency, "RENDEMENT PAR GESTIONNAIRE", `Période : ${periodLabel}`);

      // Summary totals
      const grandTotal = managerData.reduce((s, m) => s + m.total, 0);
      const grandLoyers = managerData.reduce((s, m) => s + m.loyers, 0);
      const grandVentes = managerData.reduce((s, m) => s + m.ventesImmo, 0);
      const grandAchats = managerData.reduce((s, m) => s + m.achatsImmo, 0);
      const grandLotissements = managerData.reduce((s, m) => s + m.lotissements, 0);

      // Summary box
      doc.setFillColor(...lightGray);
      doc.roundedRect(15, y, pageWidth - 30, 20, 3, 3, "F");
      doc.setTextColor(...primaryColor);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL GLOBAL", 20, y + 8);
      doc.setTextColor(...successColor);
      doc.setFontSize(14);
      doc.text(formatAmountWithCurrency(grandTotal), pageWidth - 25, y + 14, { align: "right" });
      y += 28;

      // Detail per manager
      managerData.forEach((manager, mIdx) => {
        // Check page break
        if (y + 65 > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }

        // Manager header
        doc.setFillColor(...primaryColor);
        doc.roundedRect(15, y, pageWidth - 30, 10, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${manager.name} (${manager.role})`, 20, y + 7);
        doc.text(formatAmountWithCurrency(manager.total), pageWidth - 20, y + 7, { align: "right" });
        y += 14;

        // Detail table
        const cols = [
          { label: "Loyers", value: manager.loyers },
          { label: "Ventes Immobilières", value: manager.ventesImmo },
          { label: "Achats Immobiliers", value: manager.achatsImmo },
          { label: "Lotissements", value: manager.lotissements },
        ];

        cols.forEach((col, i) => {
          if (i % 2 === 0) {
            doc.setFillColor(...lightGray);
            doc.rect(15, y, pageWidth - 30, 9, "F");
          }
          doc.setTextColor(...textColor);
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(col.label, 22, y + 6);
          doc.setFont("helvetica", "bold");
          doc.text(formatAmountWithCurrency(col.value), pageWidth - 20, y + 6, { align: "right" });
          y += 9;
        });

        y += 8;
      });

      // Recap table
      if (y + 60 > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(...primaryColor);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RÉCAPITULATIF", 15, y);
      y += 8;

      // Table header
      const recapCols = { name: 18, loyers: 75, ventes: 100, achats: 130, lots: 155, total: pageWidth - 20 };
      doc.setFillColor(...primaryColor);
      doc.rect(15, y, pageWidth - 30, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("Gestionnaire", recapCols.name, y + 5.5);
      doc.text("Loyers", recapCols.loyers, y + 5.5);
      doc.text("Ventes", recapCols.ventes, y + 5.5);
      doc.text("Achats", recapCols.achats, y + 5.5);
      doc.text("Lotissem.", recapCols.lots, y + 5.5);
      doc.text("Total", recapCols.total, y + 5.5, { align: "right" });
      y += 8;

      doc.setFontSize(7);
      managerData.forEach((m, i) => {
        if (y + 9 > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }
        if (i % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(15, y, pageWidth - 30, 9, "F");
        }
        doc.setTextColor(...textColor);
        doc.setFont("helvetica", "normal");
        const displayName = m.name.length > 25 ? m.name.substring(0, 23) + "..." : m.name;
        doc.text(displayName, recapCols.name, y + 6);
        doc.text(formatAmountForPDF(m.loyers), recapCols.loyers, y + 6);
        doc.text(formatAmountForPDF(m.ventesImmo), recapCols.ventes, y + 6);
        doc.text(formatAmountForPDF(m.achatsImmo), recapCols.achats, y + 6);
        doc.text(formatAmountForPDF(m.lotissements), recapCols.lots, y + 6);
        doc.setFont("helvetica", "bold");
        doc.text(formatAmountForPDF(m.total), recapCols.total, y + 6, { align: "right" });
        y += 9;
      });

      // Grand total row
      doc.setFillColor(...primaryColor);
      doc.rect(15, y, pageWidth - 30, 9, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL", recapCols.name, y + 6);
      doc.text(formatAmountForPDF(grandLoyers), recapCols.loyers, y + 6);
      doc.text(formatAmountForPDF(grandVentes), recapCols.ventes, y + 6);
      doc.text(formatAmountForPDF(grandAchats), recapCols.achats, y + 6);
      doc.text(formatAmountForPDF(grandLotissements), recapCols.lots, y + 6);
      doc.text(formatAmountForPDF(grandTotal), recapCols.total, y + 6, { align: "right" });

      addPDFFooter(doc, agency, "Rendement par gestionnaire");
      doc.save(`rendement-gestionnaires-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Rapport de rendement PDF téléchargé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={exportPDF} title="Exporter le rendement en PDF">
      <Download className="h-4 w-4" />
    </Button>
  );
}
