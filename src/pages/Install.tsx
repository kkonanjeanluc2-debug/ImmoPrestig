import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Share, MoreVertical, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy/10 to-emerald/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald" />
            </div>
            <CardTitle className="text-2xl">Application installée !</CardTitle>
            <CardDescription>
              PropertyGrace est maintenant installé sur votre appareil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => navigate("/")}>
              Ouvrir l'application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy/10 to-emerald/10 p-4">
      <div className="max-w-md mx-auto pt-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img src="/pwa-192x192.png" alt="PropertyGrace" className="h-20 w-20 rounded-2xl shadow-lg" />
            </div>
            <CardTitle className="text-2xl">Installer PropertyGrace</CardTitle>
            <CardDescription>
              Installez l'application sur votre téléphone pour un accès rapide et une expérience optimale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Benefits */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-emerald/10 flex items-center justify-center shrink-0">
                  <Smartphone className="h-4 w-4 text-emerald" />
                </div>
                <span>Accès rapide depuis l'écran d'accueil</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-emerald/10 flex items-center justify-center shrink-0">
                  <Download className="h-4 w-4 text-emerald" />
                </div>
                <span>Fonctionne hors ligne</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-emerald/10 flex items-center justify-center shrink-0">
                  <Check className="h-4 w-4 text-emerald" />
                </div>
                <span>Notifications en temps réel</span>
              </div>
            </div>

            {/* Install Instructions */}
            {isIOS ? (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="font-medium text-sm">Pour installer sur iPhone/iPad :</p>
                <ol className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">1</span>
                    <span className="flex items-center gap-1">
                      Appuyez sur <Share className="h-4 w-4" /> en bas de Safari
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">2</span>
                    <span>Faites défiler et appuyez sur "Sur l'écran d'accueil"</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">3</span>
                    <span>Appuyez sur "Ajouter"</span>
                  </li>
                </ol>
              </div>
            ) : deferredPrompt ? (
              <Button className="w-full" size="lg" onClick={handleInstall}>
                <Download className="h-4 w-4 mr-2" />
                Installer l'application
              </Button>
            ) : (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="font-medium text-sm">Pour installer sur Android :</p>
                <ol className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">1</span>
                    <span className="flex items-center gap-1">
                      Appuyez sur <MoreVertical className="h-4 w-4" /> en haut de Chrome
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">2</span>
                    <span>Appuyez sur "Installer l'application"</span>
                  </li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Install;
