import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComptabiliteData } from "@/hooks/useComptabilite";
import { EXPENSE_CATEGORIES, REVENUE_ACCOUNTS, getSyscohadaAccount } from "@/hooks/useExpenses";
import { BookOpen } from "lucide-react";

interface Props {
  data: ComptabiliteData;
  totalRevenue: number;
}

function formatCFA(amount: number) {
  return `${amount.toLocaleString("fr-FR")} F CFA`;
}

export function SyscohadaCompteResultat({ data, totalRevenue }: Props) {
  const beneficeNet = totalRevenue - data.totalExpenses;

  // Group expenses by SYSCOHADA classe
  const chargesByClasse = new Map<string, { total: number; details: { label: string; code: string; amount: number }[] }>();
  
  data.expensesByCategory.forEach((cat) => {
    const info = getSyscohadaAccount(cat.name);
    const classe = info?.classe || "Autres charges";
    const code = info?.syscohada || "658";
    const label = info?.label || cat.name;
    
    if (!chargesByClasse.has(classe)) {
      chargesByClasse.set(classe, { total: 0, details: [] });
    }
    const group = chargesByClasse.get(classe)!;
    group.total += cat.value;
    group.details.push({ label, code, amount: cat.value });
  });

  // Revenue lines following SYSCOHADA classe 7
  const produitsLines = [
    { code: REVENUE_ACCOUNTS.loyers.syscohada, label: REVENUE_ACCOUNTS.loyers.label, amount: data.loyersEncaisses },
    { code: REVENUE_ACCOUNTS.ventes.syscohada, label: REVENUE_ACCOUNTS.ventes.label, amount: data.ventesEncaissees },
    { code: REVENUE_ACCOUNTS.achats.syscohada, label: REVENUE_ACCOUNTS.achats.label, amount: data.achatsEncaisses },
    { code: REVENUE_ACCOUNTS.lotissements.syscohada, label: REVENUE_ACCOUNTS.lotissements.label, amount: data.lotissementsEncaisses },
  ].filter((l) => l.amount > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base font-semibold">
              Compte de résultat — SYSCOHADA
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Plan comptable OHADA révisé
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-primary/30">
                <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Compte</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Libellé</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Montant</th>
              </tr>
            </thead>
            <tbody>
              {/* SECTION PRODUITS - Classe 7 */}
              <tr className="bg-emerald/5">
                <td colSpan={2} className="py-2.5 px-3 font-bold text-emerald uppercase tracking-wide text-xs">
                  Classe 7 — Produits
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-emerald">
                  {formatCFA(totalRevenue)}
                </td>
              </tr>
              {produitsLines.map((line) => (
                <tr key={line.code + line.label} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="py-2 px-3">
                    <Badge variant="outline" className="text-xs font-mono">{line.code}</Badge>
                  </td>
                  <td className="py-2 px-3 text-foreground">{line.label}</td>
                  <td className="py-2 px-3 text-right font-medium text-emerald">{formatCFA(line.amount)}</td>
                </tr>
              ))}
              {produitsLines.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-2 px-3 text-center text-muted-foreground italic">Aucun produit</td>
                </tr>
              )}

              {/* Separator */}
              <tr><td colSpan={3} className="py-1" /></tr>

              {/* SECTION CHARGES - Classe 6 */}
              <tr className="bg-destructive/5">
                <td colSpan={2} className="py-2.5 px-3 font-bold text-destructive uppercase tracking-wide text-xs">
                  Classe 6 — Charges
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-destructive">
                  {formatCFA(data.totalExpenses)}
                </td>
              </tr>
              {Array.from(chargesByClasse.entries()).map(([classe, group]) => (
                <tbody key={classe}>
                  <tr className="bg-muted/30">
                    <td colSpan={2} className="py-2 px-3 font-semibold text-foreground text-xs uppercase tracking-wide">
                      {classe}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-foreground">
                      {formatCFA(group.total)}
                    </td>
                  </tr>
                  {group.details.map((d) => (
                    <tr key={d.code + d.label} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs font-mono">{d.code}</Badge>
                      </td>
                      <td className="py-2 px-3 text-foreground">{d.label}</td>
                      <td className="py-2 px-3 text-right font-medium text-destructive">
                        {formatCFA(d.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
              {chargesByClasse.size === 0 && (
                <tr>
                  <td colSpan={3} className="py-2 px-3 text-center text-muted-foreground italic">Aucune charge</td>
                </tr>
              )}

              {/* RÉSULTAT */}
              <tr><td colSpan={3} className="py-1" /></tr>
              <tr className={`${beneficeNet >= 0 ? "bg-emerald/10" : "bg-destructive/10"} border-t-2 border-primary/30`}>
                <td colSpan={2} className="py-3 px-3 font-bold text-foreground uppercase text-sm">
                  Résultat net {beneficeNet >= 0 ? "(Bénéfice)" : "(Perte)"}
                </td>
                <td className={`py-3 px-3 text-right font-bold text-lg ${beneficeNet >= 0 ? "text-emerald" : "text-destructive"}`}>
                  {formatCFA(beneficeNet)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
