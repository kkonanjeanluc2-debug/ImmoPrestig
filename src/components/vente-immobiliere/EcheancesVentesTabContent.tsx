import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EcheancesVentesList } from "./EcheancesVentesList";
import { UpcomingEcheancesVentesList } from "./UpcomingEcheancesVentesList";
import { LateEcheancesVentesList } from "./LateEcheancesVentesList";
import { Bell, AlertTriangle, Calendar } from "lucide-react";

export function EcheancesVentesTabContent() {
  const [subTab, setSubTab] = useState("a-venir");

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="a-venir" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            À venir
          </TabsTrigger>
          <TabsTrigger value="en-retard" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            En retard
          </TabsTrigger>
          <TabsTrigger value="toutes" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Toutes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="a-venir" className="mt-4">
          <UpcomingEcheancesVentesList />
        </TabsContent>

        <TabsContent value="en-retard" className="mt-4">
          <LateEcheancesVentesList />
        </TabsContent>

        <TabsContent value="toutes" className="mt-4">
          <EcheancesVentesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
