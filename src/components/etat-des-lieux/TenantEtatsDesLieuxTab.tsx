import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEtatsDesLieux } from "@/hooks/useEtatsDesLieux";
import { TenantWithDetails } from "@/hooks/useTenants";
import { AddEtatDesLieuxDialog } from "./AddEtatDesLieuxDialog";
import { EtatsDesLieuxList } from "./EtatsDesLieuxList";
import { ClipboardCheck } from "lucide-react";
import { useCurrentUserRole } from "@/hooks/useUserRoles";

interface TenantEtatsDesLieuxTabProps {
  tenant: TenantWithDetails;
}

export function TenantEtatsDesLieuxTab({ tenant }: TenantEtatsDesLieuxTabProps) {
  const { data: etats = [], isLoading } = useEtatsDesLieux(tenant.id);
  const { data: userRole } = useCurrentUserRole();

  const hasEntryEtat = etats.some(e => e.type === "entree");
  const isLocataire = userRole?.role === "locataire";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          États des lieux
        </CardTitle>
        {!isLocataire && (
          <AddEtatDesLieuxDialog tenant={tenant} existingEntryEtat={hasEntryEtat} />
        )}
      </CardHeader>
      <CardContent>
        <EtatsDesLieuxList etats={etats} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}
