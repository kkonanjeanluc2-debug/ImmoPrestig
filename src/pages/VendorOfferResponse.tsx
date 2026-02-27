import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, ArrowLeftRight, Home, MapPin, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface OffreData {
  id: string;
  offer_amount: number;
  offer_date: string;
  status: string;
  conditions: string | null;
  counter_amount: number | null;
  vendor_response_notes: string | null;
  vendor_responded_at: string | null;
  vendor_token_expires_at: string | null;
  biens_achat?: {
    title: string;
    address: string;
    price: number;
    property_type: string;
    area: number | null;
    city: string | null;
    vendeurs?: { name: string } | null;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente de votre réponse",
  acceptee: "Acceptée",
  refusee: "Refusée",
  contre_offre: "Contre-offre envoyée",
  expiree: "Expirée",
};

export default function VendorOfferResponse() {
  const { token } = useParams<{ token: string }>();
  const [offre, setOffre] = useState<OffreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [counterAmount, setCounterAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (token) fetchOffer();
  }, [token]);

  const fetchOffer = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("vendor-offer-response", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: undefined,
      });

      // Use direct fetch since invoke doesn't support GET with query params well
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/vendor-offer-response?token=${token}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const result = await resp.json();

      if (!resp.ok) {
        setError(result.error || "Erreur lors du chargement");
        return;
      }

      setOffre(result.offre);
    } catch (err) {
      setError("Impossible de charger l'offre");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (action: "acceptee" | "refusee" | "contre_offre") => {
    if (!token) return;
    setSubmitting(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/vendor-offer-response`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            action,
            counter_amount: action === "contre_offre" ? Number(counterAmount) : undefined,
            notes: notes || undefined,
          }),
        }
      );

      const result = await resp.json();

      if (!resp.ok) {
        setError(result.error);
        return;
      }

      setSubmitted(true);
      setSuccessMessage(result.message);
    } catch {
      setError("Erreur lors de l'envoi de votre réponse");
    } finally {
      setSubmitting(false);
    }
  };

  const canRespond = offre && ["en_attente", "contre_offre"].includes(offre.status) && !submitted;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-[#1a365d]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-14 w-14 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Lien invalide</h2>
            <p className="text-gray-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <CheckCircle className="h-14 w-14 mx-auto text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Réponse envoyée</h2>
            <p className="text-gray-500">{successMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1a365d]">Offre d'achat</h1>
          <p className="text-gray-500 mt-1">Consultez et répondez à cette offre</p>
        </div>

        {/* Bien info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Home className="h-5 w-5 text-[#1a365d] mt-0.5 shrink-0" />
              <div>
                <h2 className="font-bold text-lg">{offre?.biens_achat?.title}</h2>
                <div className="flex items-center gap-1 text-gray-500 text-sm">
                  <MapPin className="h-3.5 w-3.5" />
                  {offre?.biens_achat?.address}
                  {offre?.biens_achat?.city && `, ${offre.biens_achat.city}`}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500">Type</p>
                <p className="font-semibold">{offre?.biens_achat?.property_type}</p>
              </div>
              {offre?.biens_achat?.area && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500">Surface</p>
                  <p className="font-semibold">{offre.biens_achat.area} m²</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500">Prix affiché</p>
                <p className="font-semibold">{Number(offre?.biens_achat?.price).toLocaleString("fr-FR")} FCFA</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500">Vendeur</p>
                <p className="font-semibold">{offre?.biens_achat?.vendeurs?.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Offer details */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4">Détails de l'offre</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Montant proposé</span>
                <span className="text-xl font-bold text-[#1a365d]">
                  {Number(offre?.offer_amount).toLocaleString("fr-FR")} FCFA
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Date de l'offre</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {offre?.offer_date && format(new Date(offre.offer_date), "dd MMMM yyyy", { locale: fr })}
                </span>
              </div>
              {offre?.conditions && (
                <div>
                  <span className="text-gray-500 block mb-1">Conditions</span>
                  <p className="bg-gray-50 rounded-lg p-3 text-sm">{offre.conditions}</p>
                </div>
              )}
              {offre?.counter_amount && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Contre-offre précédente</span>
                  <span className="font-bold text-purple-700">
                    {Number(offre.counter_amount).toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Statut</span>
                <Badge variant="secondary">{STATUS_LABELS[offre?.status || ""] || offre?.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response section */}
        {canRespond && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-lg">Votre réponse</h3>

              <div className="space-y-2">
                <Label>Contre-offre (FCFA)</Label>
                <Input
                  type="number"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  placeholder="Montant de votre contre-proposition"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes / Commentaires</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Message optionnel à transmettre à l'agence..."
                />
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleResponse("acceptee")}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Accepter l'offre
                </Button>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => handleResponse("contre_offre")}
                  disabled={submitting || !counterAmount}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowLeftRight className="h-4 w-4 mr-2" />}
                  Faire une contre-offre
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => handleResponse("refusee")}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Refuser l'offre
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!canRespond && offre?.vendor_responded_at && (
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
              <p className="font-semibold">Vous avez déjà répondu à cette offre</p>
              {offre.vendor_response_notes && (
                <p className="text-gray-500 text-sm mt-2">"{offre.vendor_response_notes}"</p>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-gray-400 text-xs">
          Ce lien est confidentiel. Ne le partagez pas.
        </p>
      </div>
    </div>
  );
}
