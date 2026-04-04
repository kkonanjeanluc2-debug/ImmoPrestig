import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { usePlatformSetting } from "@/hooks/usePlatformSettings";
import { openWhatsApp } from "@/lib/whatsapp";

interface DemoRequestButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  onClick?: () => void;
}

export function DemoRequestButton({ 
  className, 
  variant = "default",
  size = "default",
  onClick
}: DemoRequestButtonProps) {
  const { data: setting } = usePlatformSetting("whatsapp_demo_number");
  
  const phone = setting?.value;
  
  if (!phone) {
    return null;
  }

  const handleClick = () => {
    openWhatsApp(
      phone,
      "Bonjour ! Je souhaite demander une démo gratuite de votre plateforme de gestion immobilière."
    );

    onClick?.();
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
