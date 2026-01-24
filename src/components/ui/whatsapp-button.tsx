import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface WhatsAppButtonProps {
  phone?: string | null | undefined;
  message: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

export function WhatsAppButton({
  phone,
  message,
  variant = "outline",
  size = "sm",
  className,
  showLabel = true,
  disabled = false,
  children,
  onClick,
}: WhatsAppButtonProps) {
  const hasPhone = !!phone;
  
  const handleClick = (e: React.MouseEvent) => {
    // Call custom onClick if provided
    onClick?.(e);
    
    // Build WhatsApp URL
    let url: string;
    
    if (phone) {
      // Format phone number for direct messaging
      let formattedPhone = phone.replace(/[^\d+]/g, "");
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "221" + formattedPhone.substring(1);
      }
      if (formattedPhone.startsWith("+")) {
        formattedPhone = formattedPhone.substring(1);
      }
      url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    } else {
      // Share without specific phone number (opens WhatsApp with message to share)
      url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    }
    
    window.open(url, "_blank");
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled}
      title={hasPhone ? "Envoyer via WhatsApp" : "Partager via WhatsApp"}
      className={cn(
        "gap-1.5",
        !disabled && "text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20",
        className
      )}
    >
      {children ? (
        children
      ) : (
        <>
          <MessageCircle className="h-4 w-4" />
          {showLabel && <span>WhatsApp</span>}
        </>
      )}
    </Button>
  );
}
