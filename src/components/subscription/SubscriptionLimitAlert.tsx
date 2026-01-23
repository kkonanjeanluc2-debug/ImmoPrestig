import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SubscriptionLimitAlertProps {
  type: "property" | "tenant";
  planName: string;
  current: number;
  max: number;
}

export function SubscriptionLimitAlert({ type, planName, current, max }: SubscriptionLimitAlertProps) {
  const navigate = useNavigate();
  
  const typeLabel = type === "property" ? "biens" : "locataires";
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Limite du forfait atteinte</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          Votre forfait <strong>{planName}</strong> est limité à <strong>{max} {typeLabel}</strong>.
          Vous avez actuellement <strong>{current} {typeLabel}</strong>.
        </p>
        <Button 
          size="sm" 
          onClick={() => navigate("/settings?tab=subscription")}
          className="gap-2"
        >
          <Crown className="h-4 w-4" />
          Passer à un forfait supérieur
        </Button>
      </AlertDescription>
    </Alert>
  );
}
