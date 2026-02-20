import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Users, 
  Handshake, 
  Wallet, 
  Download, 
  Plus, 
  Trash2,
  Loader2 
} from "lucide-react";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";
import {
  generatePVFamille,
  generateConvention,
  generateContratPrefinancement,
  getDefaultPVFamilleData,
  getDefaultConventionData,
  getDefaultContratPrefinancementData,
  type PVFamilleData,
  type ConventionData,
  type ContratPrefinancementData,
} from "@/lib/generateLotissementLegalDocuments";

interface GenerateLotissementDocumentDialogProps {
  lotissementId: string;
  lotissementName: string;
  lotissement: {
    name: string;
    location: string;
    city?: string | null;
    total_area?: number | null;
    total_plots?: number | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DocumentType = "pv_famille" | "convention" | "contrat_prefinancement";

const documentTypes: { value: DocumentType; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { 
    value: "pv_famille", 
    label: "PV de Famille", 
    icon: Users,
    description: "Procès-verbal de réunion de famille pour autoriser la cession du terrain familial"
  },
  { 
    value: "convention", 
    label: "Convention", 
    icon: Handshake,
    description: "Convention de lotissement entre le propriétaire foncier et le lotisseur/aménageur"
  },
  { 
    value: "contrat_prefinancement", 
    label: "Contrat de Préfinancement", 
    icon: Wallet,
    description: "Contrat définissant les conditions de préfinancement du projet"
  },
];

export function GenerateLotissementDocumentDialog({
  lotissementId,
  lotissementName,
  lotissement,
  open,
  onOpenChange,
}: GenerateLotissementDocumentDialogProps) {
  const { data: agency } = useAgency();
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form states for each document type
  const [pvFamilleData, setPvFamilleData] = useState<PVFamilleData>(() => 
    getDefaultPVFamilleData(lotissement)
  );
  const [conventionData, setConventionData] = useState<ConventionData>(() => 
    getDefaultConventionData(lotissement)
  );
  const [prefinancementData, setPrefinancementData] = useState<ContratPrefinancementData>(() => 
    getDefaultContratPrefinancementData(lotissement)
  );

  const handleGenerate = async () => {
    if (!selectedType) return;

    setIsGenerating(true);
    try {
      let doc;

      switch (selectedType) {
        case "pv_famille":
          if (!pvFamilleData.familyName || !pvFamilleData.representativeName) {
            toast.error("Veuillez remplir le nom de famille et le représentant");
            return;
          }
          doc = await generatePVFamille(pvFamilleData, lotissement, agency || null);
          doc.save(`PV_Famille_${lotissementName.replace(/\s+/g, "_")}.pdf`);
          break;

        case "convention":
          if (!conventionData.proprietaireName || !conventionData.lotisseurName) {
            toast.error("Veuillez remplir les informations du propriétaire et du lotisseur");
            return;
          }
          doc = await generateConvention(conventionData, lotissement, agency || null);
          doc.save(`Convention_${lotissementName.replace(/\s+/g, "_")}.pdf`);
          break;

        case "contrat_prefinancement":
          if (!prefinancementData.investorName || !prefinancementData.investmentAmount) {
            toast.error("Veuillez remplir les informations de l'investisseur");
            return;
          }
          doc = await generateContratPrefinancement(prefinancementData, lotissement, agency || null);
          doc.save(`Contrat_Prefinancement_${lotissementName.replace(/\s+/g, "_")}.pdf`);
          break;
      }

      toast.success("Document généré avec succès");
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error("Erreur lors de la génération du document");
    } finally {
      setIsGenerating(false);
    }
  };

  const addFamilyMember = () => {
    setPvFamilleData(prev => ({
      ...prev,
      members: [...prev.members, { name: "", role: "Membre" }]
    }));
  };

  const removeFamilyMember = (index: number) => {
    setPvFamilleData(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }));
  };

  const addWitness = () => {
    setPvFamilleData(prev => ({
      ...prev,
      witnesses: [...prev.witnesses, { name: "", cniNumber: "" }]
    }));
  };

  const removeWitness = (index: number) => {
    setPvFamilleData(prev => ({
      ...prev,
      witnesses: prev.witnesses.filter((_, i) => i !== index)
    }));
  };

  const addDecision = () => {
    setPvFamilleData(prev => ({
      ...prev,
      decisions: [...prev.decisions, ""]
    }));
  };

  const removeDecision = (index: number) => {
    setPvFamilleData(prev => ({
      ...prev,
      decisions: prev.decisions.filter((_, i) => i !== index)
    }));
  };

  const addEngagementLotisseur = () => {
    setConventionData(prev => ({
      ...prev,
      engagementsLotisseur: [...prev.engagementsLotisseur, ""]
    }));
  };

  const removeEngagementLotisseur = (index: number) => {
    setConventionData(prev => ({
      ...prev,
      engagementsLotisseur: prev.engagementsLotisseur.filter((_, i) => i !== index)
    }));
  };

  const addEngagementProprietaire = () => {
    setConventionData(prev => ({
      ...prev,
      engagementsProprietaire: [...prev.engagementsProprietaire, ""]
    }));
  };

  const removeEngagementProprietaire = (index: number) => {
    setConventionData(prev => ({
      ...prev,
      engagementsProprietaire: prev.engagementsProprietaire.filter((_, i) => i !== index)
    }));
  };

  const addGuarantee = () => {
    setPrefinancementData(prev => ({
      ...prev,
      guarantees: [...prev.guarantees, ""]
    }));
  };

  const removeGuarantee = (index: number) => {
    setPrefinancementData(prev => ({
      ...prev,
      guarantees: prev.guarantees.filter((_, i) => i !== index)
    }));
  };

  const renderDocumentForm = () => {
    switch (selectedType) {
      case "pv_famille":
        return (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Informations de la famille */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Informations de la famille</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom de la famille *</Label>
                    <Input
                      value={pvFamilleData.familyName}
                      onChange={(e) => setPvFamilleData(prev => ({ ...prev, familyName: e.target.value }))}
                      placeholder="ex: KOUASSI"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Représentant *</Label>
                    <Input
                      value={pvFamilleData.representativeName}
                      onChange={(e) => setPvFamilleData(prev => ({ ...prev, representativeName: e.target.value }))}
                      placeholder="ex: M. KOUASSI Yao"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rôle du représentant</Label>
                    <Input
                      value={pvFamilleData.representativeRole}
                      onChange={(e) => setPvFamilleData(prev => ({ ...prev, representativeRole: e.target.value }))}
                      placeholder="ex: Chef de famille"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lieu de la réunion</Label>
                    <Input
                      value={pvFamilleData.meetingPlace}
                      onChange={(e) => setPvFamilleData(prev => ({ ...prev, meetingPlace: e.target.value }))}
                      placeholder="ex: Abidjan"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date de la réunion</Label>
                  <Input
                    type="date"
                    value={pvFamilleData.meetingDate}
                    onChange={(e) => setPvFamilleData(prev => ({ ...prev, meetingDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Membres de la famille */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground">Membres présents</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addFamilyMember}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                {pvFamilleData.members.map((member, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Nom complet"
                        value={member.name}
                        onChange={(e) => {
                          const newMembers = [...pvFamilleData.members];
                          newMembers[index].name = e.target.value;
                          setPvFamilleData(prev => ({ ...prev, members: newMembers }));
                        }}
                      />
                      <Input
                        placeholder="Rôle"
                        value={member.role}
                        onChange={(e) => {
                          const newMembers = [...pvFamilleData.members];
                          newMembers[index].role = e.target.value;
                          setPvFamilleData(prev => ({ ...prev, members: newMembers }));
                        }}
                      />
                      <Input
                        placeholder="N° CNI (optionnel)"
                        value={member.cniNumber || ""}
                        onChange={(e) => {
                          const newMembers = [...pvFamilleData.members];
                          newMembers[index].cniNumber = e.target.value;
                          setPvFamilleData(prev => ({ ...prev, members: newMembers }));
                        }}
                      />
                    </div>
                    {pvFamilleData.members.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFamilyMember(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Description du terrain */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Description du terrain</h4>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={pvFamilleData.landDescription}
                    onChange={(e) => setPvFamilleData(prev => ({ ...prev, landDescription: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Superficie (m²)</Label>
                    <Input
                      type="number"
                      value={pvFamilleData.landArea}
                      onChange={(e) => setPvFamilleData(prev => ({ ...prev, landArea: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Localisation</Label>
                    <Input
                      value={pvFamilleData.landLocation}
                      onChange={(e) => setPvFamilleData(prev => ({ ...prev, landLocation: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Décisions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground">Décisions prises</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addDecision}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                {pvFamilleData.decisions.map((decision, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Textarea
                      value={decision}
                      onChange={(e) => {
                        const newDecisions = [...pvFamilleData.decisions];
                        newDecisions[index] = e.target.value;
                        setPvFamilleData(prev => ({ ...prev, decisions: newDecisions }));
                      }}
                      rows={2}
                      className="flex-1"
                    />
                    {pvFamilleData.decisions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDecision(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Témoins */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground">Témoins</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addWitness}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                {pvFamilleData.witnesses.map((witness, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Nom complet"
                        value={witness.name}
                        onChange={(e) => {
                          const newWitnesses = [...pvFamilleData.witnesses];
                          newWitnesses[index].name = e.target.value;
                          setPvFamilleData(prev => ({ ...prev, witnesses: newWitnesses }));
                        }}
                      />
                      <Input
                        placeholder="N° CNI"
                        value={witness.cniNumber || ""}
                        onChange={(e) => {
                          const newWitnesses = [...pvFamilleData.witnesses];
                          newWitnesses[index].cniNumber = e.target.value;
                          setPvFamilleData(prev => ({ ...prev, witnesses: newWitnesses }));
                        }}
                      />
                    </div>
                    {pvFamilleData.witnesses.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeWitness(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        );

      case "convention":
        return (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Propriétaire */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Le Propriétaire foncier</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom complet *</Label>
                    <Input
                      value={conventionData.proprietaireName}
                      onChange={(e) => setConventionData(prev => ({ ...prev, proprietaireName: e.target.value }))}
                      placeholder="ex: M. KOUASSI Yao"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>N° CNI</Label>
                    <Input
                      value={conventionData.proprietaireCni}
                      onChange={(e) => setConventionData(prev => ({ ...prev, proprietaireCni: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input
                    value={conventionData.proprietaireAddress}
                    onChange={(e) => setConventionData(prev => ({ ...prev, proprietaireAddress: e.target.value }))}
                    placeholder="ex: Abidjan, Cocody"
                  />
                </div>
              </div>

              {/* Lotisseur */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Le Lotisseur / Aménageur</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom ou raison sociale *</Label>
                    <Input
                      value={conventionData.lotisseurName}
                      onChange={(e) => setConventionData(prev => ({ ...prev, lotisseurName: e.target.value }))}
                      placeholder="ex: SCI IMMO PRESTIGE"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RCCM</Label>
                    <Input
                      value={conventionData.lotisseurRccm}
                      onChange={(e) => setConventionData(prev => ({ ...prev, lotisseurRccm: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input
                    value={conventionData.lotisseurAddress}
                    onChange={(e) => setConventionData(prev => ({ ...prev, lotisseurAddress: e.target.value }))}
                  />
                </div>
              </div>

              {/* Terrain */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Terrain</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Localisation</Label>
                    <Input
                      value={conventionData.terrainLocalisation}
                      onChange={(e) => setConventionData(prev => ({ ...prev, terrainLocalisation: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Superficie (hectares)</Label>
                    <Input
                      value={conventionData.terrainSuperficie}
                      onChange={(e) => setConventionData(prev => ({ ...prev, terrainSuperficie: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>N° Arrêté d'approbation</Label>
                    <Input
                      value={conventionData.arreteReference}
                      onChange={(e) => setConventionData(prev => ({ ...prev, arreteReference: e.target.value }))}
                      placeholder="ex: 2024-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de l'arrêté</Label>
                    <Input
                      type="date"
                      value={conventionData.arreteDate}
                      onChange={(e) => setConventionData(prev => ({ ...prev, arreteDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Engagements du Lotisseur */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground">Engagements du Lotisseur (Art. 3)</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addEngagementLotisseur}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                {conventionData.engagementsLotisseur.map((eng, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Textarea
                      value={eng}
                      onChange={(e) => {
                        const newEngs = [...conventionData.engagementsLotisseur];
                        newEngs[index] = e.target.value;
                        setConventionData(prev => ({ ...prev, engagementsLotisseur: newEngs }));
                      }}
                      rows={2}
                      className="flex-1"
                    />
                    {conventionData.engagementsLotisseur.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeEngagementLotisseur(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Engagements du Propriétaire */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground">Engagements du Propriétaire (Art. 4)</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addEngagementProprietaire}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                {conventionData.engagementsProprietaire.map((eng, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Textarea
                      value={eng}
                      onChange={(e) => {
                        const newEngs = [...conventionData.engagementsProprietaire];
                        newEngs[index] = e.target.value;
                        setConventionData(prev => ({ ...prev, engagementsProprietaire: newEngs }));
                      }}
                      rows={2}
                      className="flex-1"
                    />
                    {conventionData.engagementsProprietaire.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeEngagementProprietaire(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Répartition des lots */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Répartition des lots (Art. 5)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>% Propriétaire</Label>
                    <Input
                      type="number"
                      value={conventionData.repartitionProprietaire}
                      onChange={(e) => setConventionData(prev => ({ ...prev, repartitionProprietaire: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>% Lotisseur</Label>
                    <Input
                      type="number"
                      value={conventionData.repartitionLotisseur}
                      onChange={(e) => setConventionData(prev => ({ ...prev, repartitionLotisseur: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              {/* Durée et signature */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Durée et signature</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Durée de la convention</Label>
                    <Input
                      value={conventionData.duree}
                      onChange={(e) => setConventionData(prev => ({ ...prev, duree: e.target.value }))}
                      placeholder="ex: 24 mois"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre d'exemplaires</Label>
                    <Input
                      type="number"
                      value={conventionData.nombreExemplaires}
                      onChange={(e) => setConventionData(prev => ({ ...prev, nombreExemplaires: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lieu de signature</Label>
                    <Input
                      value={conventionData.lieuSignature}
                      onChange={(e) => setConventionData(prev => ({ ...prev, lieuSignature: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de signature</Label>
                    <Input
                      type="date"
                      value={conventionData.signatureDate}
                      onChange={(e) => setConventionData(prev => ({ ...prev, signatureDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        );

      case "contrat_prefinancement":
        return (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Investisseur */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Informations de l'investisseur</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom complet *</Label>
                    <Input
                      value={prefinancementData.investorName}
                      onChange={(e) => setPrefinancementData(prev => ({ ...prev, investorName: e.target.value }))}
                      placeholder="ex: M. KONAN Koffi"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>N° CNI</Label>
                    <Input
                      value={prefinancementData.investorCni}
                      onChange={(e) => setPrefinancementData(prev => ({ ...prev, investorCni: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <Input
                      value={prefinancementData.investorAddress}
                      onChange={(e) => setPrefinancementData(prev => ({ ...prev, investorAddress: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input
                      value={prefinancementData.investorPhone}
                      onChange={(e) => setPrefinancementData(prev => ({ ...prev, investorPhone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Investissement */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Détails de l'investissement</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Montant (F CFA) *</Label>
                    <Input
                      type="number"
                      value={prefinancementData.investmentAmount}
                      onChange={(e) => setPrefinancementData(prev => ({ ...prev, investmentAmount: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rendement (%)</Label>
                    <Input
                      type="number"
                      value={prefinancementData.returnPercentage}
                      onChange={(e) => setPrefinancementData(prev => ({ ...prev, returnPercentage: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Destination des fonds</Label>
                  <Textarea
                    value={prefinancementData.investmentPurpose}
                    onChange={(e) => setPrefinancementData(prev => ({ ...prev, investmentPurpose: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Durée</Label>
                    <Input
                      value={prefinancementData.duration}
                      onChange={(e) => setPrefinancementData(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="ex: 12 mois"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date du contrat</Label>
                    <Input
                      type="date"
                      value={prefinancementData.contractDate}
                      onChange={(e) => setPrefinancementData(prev => ({ ...prev, contractDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Calendrier de remboursement</Label>
                  <Textarea
                    value={prefinancementData.paymentSchedule}
                    onChange={(e) => setPrefinancementData(prev => ({ ...prev, paymentSchedule: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>

              {/* Garanties */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground">Garanties offertes</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addGuarantee}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                {prefinancementData.guarantees.map((guarantee, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Textarea
                      value={guarantee}
                      onChange={(e) => {
                        const newGuarantees = [...prefinancementData.guarantees];
                        newGuarantees[index] = e.target.value;
                        setPrefinancementData(prev => ({ ...prev, guarantees: newGuarantees }));
                      }}
                      rows={2}
                      className="flex-1"
                    />
                    {prefinancementData.guarantees.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeGuarantee(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents juridiques - {lotissementName}
          </DialogTitle>
        </DialogHeader>

        {!selectedType ? (
          <div className="grid gap-4 md:grid-cols-3">
            {documentTypes.map((docType) => {
              const Icon = docType.icon;
              return (
                <Card
                  key={docType.value}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedType(docType.value)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{docType.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs">
                      {docType.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {documentTypes.find(d => d.value === selectedType)?.icon && (
                  (() => {
                    const Icon = documentTypes.find(d => d.value === selectedType)!.icon;
                    return <Icon className="h-5 w-5 text-primary" />;
                  })()
                )}
                <h3 className="font-medium">
                  {documentTypes.find(d => d.value === selectedType)?.label}
                </h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedType(null)}>
                ← Retour
              </Button>
            </div>

            {renderDocumentForm()}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Générer le PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
