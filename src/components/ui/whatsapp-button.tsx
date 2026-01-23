import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  phone: string | null | undefined;
  message: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
  disabled?: boolean;
}

export function WhatsAppButton({
  phone,
  message,
  variant = "outline",
  size = "sm",
  className,
  showLabel = true,
  disabled = false,
}: WhatsAppButtonProps) {
  const hasPhone = !!phone;
  
  const handleClick = () => {
    if (!phone) return;
    
    // Format phone number
    let formattedPhone = phone.replace(/[^\d+]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "221" + formattedPhone.substring(1);
    }
    if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || !hasPhone}
      title={!hasPhone ? "Aucun numéro de téléphone" : "Envoyer via WhatsApp"}
      className={cn(
        "gap-1.5",
        hasPhone && "text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20",
        className
      )}
    >
      <MessageCircle className="h-4 w-4" />
      {showLabel && <span>WhatsApp</span>}
    </Button>
  );
}
