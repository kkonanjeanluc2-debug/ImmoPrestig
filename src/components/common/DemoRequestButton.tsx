import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { usePlatformSetting } from "@/hooks/usePlatformSettings";

interface DemoRequestButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
}

export function DemoRequestButton({ 
  className, 
  variant = "default",
  size = "default" 
}: DemoRequestButtonProps) {
  const { data: setting } = usePlatformSetting("whatsapp_demo_number");
  
  const phone = setting?.value;
  
  // Don't render if no phone number is configured
  if (!phone) {
    return null;
  }

  const handleClick = () => {
    // Format phone number for WhatsApp
    let formattedPhone = phone.replace(/[^\d+]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "225" + formattedPhone.substring(1);
    }
    if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    const message = encodeURIComponent(
      "Bonjour ! Je souhaite demander une démo gratuite de votre plateforme de gestion immobilière."
    );
    
    const url = `https://wa.me/${formattedPhone}?text=${message}`;
    window.open(url, "_blank");
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={className}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      Demandez votre démo gratuite
    </Button>
  );
}
