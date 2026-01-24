import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck } from "lucide-react";
import { TeamMembersSettings } from "./TeamMembersSettings";
import { AssignmentsSettings } from "./AssignmentsSettings";

export function TeamSettings() {
  const [activeSubTab, setActiveSubTab] = useState("members");

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger
            value="members"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Users className="h-4 w-4" />
            <span>Membres</span>
          </TabsTrigger>
          <TabsTrigger
            value="assignments"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <UserCheck className="h-4 w-4" />
            <span>Affectations</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <TeamMembersSettings />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
