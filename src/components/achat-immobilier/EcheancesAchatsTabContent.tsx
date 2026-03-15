import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EcheancesAchatsList } from "./EcheancesAchatsList";
import { UpcomingEcheancesAchatsList } from "./UpcomingEcheancesAchatsList";
import { LateEcheancesAchatsList } from "./LateEcheancesAchatsList";
import { Bell, AlertTriangle, Calendar } from "lucide-react";

export function EcheancesAchatsTabContent() {
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
          <UpcomingEcheancesAchatsList />
        </TabsContent>

        <TabsContent value="en-retard" className="mt-4">
          <LateEcheancesAchatsList />
        </TabsContent>

        <TabsContent value="toutes" className="mt-4">
          <EcheancesAchatsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
