import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import { EmailHistory } from "./EmailHistory";

interface EmailHistoryDialogProps {
  tenantId: string;
  tenantName: string;
}

export function EmailHistoryDialog({ tenantId, tenantName }: EmailHistoryDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <Mail className="h-3 w-3 mr-1" />
          Emails
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Historique des emails - {tenantName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">
          <EmailHistory tenantId={tenantId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
