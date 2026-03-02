import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AcquisitionsList } from "@/components/acquisition/AcquisitionsList";

export default function Acquisitions() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display">Acquisitions de biens</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gérez vos acquisitions par donation, héritage, apport en société ou échange
          </p>
        </div>
        <AcquisitionsList />
      </div>
    </DashboardLayout>
  );
}
