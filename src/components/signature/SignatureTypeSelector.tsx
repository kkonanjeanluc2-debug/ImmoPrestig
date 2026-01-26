import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "./SignaturePad";
import { Pencil, Type } from "lucide-react";

interface SignatureTypeSelectorProps {
  signerName: string;
  onSignatureComplete: (data: {
    type: "drawn" | "typed";
    signatureData?: string;
    signatureText?: string;
  }) => void;
}

const SIGNATURE_FONTS = [
  { name: "Cursive élégante", family: "'Dancing Script', cursive" },
  { name: "Manuscrite", family: "'Caveat', cursive" },
  { name: "Classique", family: "'Great Vibes', cursive" },
];

export function SignatureTypeSelector({
  signerName,
  onSignatureComplete,
}: SignatureTypeSelectorProps) {
  const [activeTab, setActiveTab] = useState<"draw" | "type">("draw");
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [typedSignature, setTypedSignature] = useState(signerName);
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].family);

  const handleDrawnSignature = (dataUrl: string | null) => {
    setDrawnSignature(dataUrl);
    if (dataUrl) {
      onSignatureComplete({
        type: "drawn",
        signatureData: dataUrl,
      });
    }
  };

  const handleTypedSignature = (text: string) => {
    setTypedSignature(text);
    if (text.trim()) {
      onSignatureComplete({
        type: "typed",
        signatureText: text,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Ajout des polices Google */}
      <link
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Great+Vibes&display=swap"
        rel="stylesheet"
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "draw" | "type")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw" className="gap-2">
            <Pencil className="h-4 w-4" />
            Dessiner
          </TabsTrigger>
          <TabsTrigger value="type" className="gap-2">
            <Type className="h-4 w-4" />
            Taper
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="mt-4">
          <div className="space-y-2">
            <Label>Dessinez votre signature</Label>
            <SignaturePad onSignatureChange={handleDrawnSignature} />
          </div>
        </TabsContent>

        <TabsContent value="type" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signature-text">Tapez votre signature</Label>
            <Input
              id="signature-text"
              value={typedSignature}
              onChange={(e) => handleTypedSignature(e.target.value)}
              placeholder="Votre nom complet"
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label>Style de signature</Label>
            <div className="grid grid-cols-1 gap-2">
              {SIGNATURE_FONTS.map((font) => (
                <button
                  key={font.family}
                  type="button"
                  onClick={() => {
                    setSelectedFont(font.family);
                    if (typedSignature.trim()) {
                      onSignatureComplete({
                        type: "typed",
                        signatureText: typedSignature,
                      });
                    }
                  }}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    selectedFont === font.family
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-xs text-muted-foreground mb-1 block">
                    {font.name}
                  </span>
                  <span
                    style={{ fontFamily: font.family }}
                    className="text-2xl text-foreground"
                  >
                    {typedSignature || signerName || "Votre signature"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Aperçu de la signature */}
          {typedSignature && (
            <div className="mt-4 p-6 bg-white border rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">
                Aperçu de votre signature :
              </p>
              <div
                style={{ fontFamily: selectedFont }}
                className="text-3xl text-primary"
              >
                {typedSignature}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
