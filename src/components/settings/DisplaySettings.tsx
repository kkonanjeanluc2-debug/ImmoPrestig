import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Sun, Moon, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";

type ThemeMode = "light" | "dark" | "system";

const CURRENCIES = [
  { value: "XOF", label: "Franc CFA (XOF)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "Dollar US (USD)" },
  { value: "GBP", label: "Livre Sterling (GBP)" },
];

const LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];

export function DisplaySettings() {
  const { toast } = useToast();
  const { theme, setTheme: setAppTheme } = useTheme();
  const [currency, setCurrency] = useState("XOF");
  const [language, setLanguage] = useState("fr");

  useEffect(() => {
    // Load preferences from localStorage
    const savedCurrency = localStorage.getItem("currency");
    const savedLanguage = localStorage.getItem("language");

    if (savedCurrency) setCurrency(savedCurrency);
    if (savedLanguage) setLanguage(savedLanguage);
  }, []);

  const handleThemeChange = (value: ThemeMode) => {
    setAppTheme(value);
    
    toast({
      title: "Thème modifié",
      description: `Le thème ${value === "light" ? "clair" : value === "dark" ? "sombre" : "système"} a été appliqué.`,
    });
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    localStorage.setItem("currency", value);
    
    toast({
      title: "Devise modifiée",
      description: `La devise par défaut est maintenant ${CURRENCIES.find((c) => c.value === value)?.label}.`,
    });
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    localStorage.setItem("language", value);
    
    toast({
      title: "Langue modifiée",
      description: "La langue sera appliquée après rechargement de la page.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Préférences d'affichage
        </CardTitle>
        <CardDescription>
          Personnalisez l'apparence de l'application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Theme Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Thème</Label>
          <RadioGroup
            value={theme}
            onValueChange={(value) => handleThemeChange(value as ThemeMode)}
            className="grid grid-cols-3 gap-4"
          >
            <Label
              htmlFor="theme-light"
              className="flex flex-col items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
            >
              <RadioGroupItem value="light" id="theme-light" className="sr-only" />
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Sun className="h-6 w-6 text-amber-600" />
              </div>
              <span className="text-sm font-medium">Clair</span>
            </Label>
            
            <Label
              htmlFor="theme-dark"
              className="flex flex-col items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
            >
              <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
              <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center">
                <Moon className="h-6 w-6 text-slate-200" />
              </div>
              <span className="text-sm font-medium">Sombre</span>
            </Label>
            
            <Label
              htmlFor="theme-system"
              className="flex flex-col items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
            >
              <RadioGroupItem value="system" id="theme-system" className="sr-only" />
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-100 to-slate-800 flex items-center justify-center">
                <Monitor className="h-6 w-6 text-slate-600" />
              </div>
              <span className="text-sm font-medium">Système</span>
            </Label>
          </RadioGroup>
        </div>

        {/* Currency Selection */}
        <div className="space-y-2">
          <Label htmlFor="currency" className="text-base font-medium">
            Devise par défaut
          </Label>
          <Select value={currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger id="currency" className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Utilisé pour l'affichage des montants dans les rapports
          </p>
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <Label htmlFor="language" className="text-base font-medium">
            Langue
          </Label>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger id="language" className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
