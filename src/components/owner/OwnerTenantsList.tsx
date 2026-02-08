import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Mail, Phone, Home, Building2, ArrowRight } from "lucide-react";
import { TenantWithDetails } from "@/hooks/useTenants";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OwnerTenantsListProps {
  tenants: TenantWithDetails[];
  properties: Tables<"properties">[];
}

export function OwnerTenantsList({ tenants, properties }: OwnerTenantsListProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");

  // Check if user is a gestionnaire
  const { data: membership } = useQuery({
    queryKey: ["user-membership", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("agency_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const isGestionnaire = membership?.role === "gestionnaire";

  // Filter properties for gestionnaire (only assigned ones)
  const filteredProperties = isGestionnaire
    ? properties.filter(p => p.assigned_to === user?.id)
    : properties;

  // Filter tenants based on property filter and gestionnaire access
  const baseTenants = isGestionnaire
    ? tenants.filter(t => filteredProperties.some(p => p.id === t.property_id))
    : tenants;

  const filteredTenants = selectedPropertyId === "all"
    ? baseTenants
    : baseTenants.filter(t => t.property_id === selectedPropertyId);

  const getPaymentStatus = (tenant: TenantWithDetails) => {
    if (!tenant.payments || tenant.payments.length === 0) {
      return { label: "Aucun paiement", variant: "secondary" as const };
    }
    
    const latestPayment = tenant.payments.sort((a, b) => 
      new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
    )[0];
    
    if (latestPayment.status === "paid") {
      return { label: "À jour", variant: "default" as const, className: "bg-emerald text-primary-foreground" };
    } else if (new Date(latestPayment.due_date) < new Date()) {
      return { label: "En retard", variant: "destructive" as const };
    }
    return { label: "En attente", variant: "secondary" as const };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Locataires ({filteredTenants.length})
          </CardTitle>
          
          {filteredProperties.length > 1 && (
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filtrer par bien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les biens</SelectItem>
                {filteredProperties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filteredTenants.length > 0 ? (
          <div className="space-y-3">
            {filteredTenants.map((tenant) => {
              const property = filteredProperties.find(p => p.id === tenant.property_id);
              const paymentStatus = getPaymentStatus(tenant);
              const activeContract = tenant.contracts?.find(c => c.status === "active");
              
              return (
                <div 
                  key={tenant.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold text-sm">
                        {tenant.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{tenant.name}</p>
                        <Badge 
                          variant={paymentStatus.variant}
                          className={paymentStatus.className}
                        >
                          {paymentStatus.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        {tenant.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {tenant.email}
                          </span>
                        )}
                        {tenant.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {tenant.phone}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        {property && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {property.title}
                          </span>
                        )}
                        {tenant.unit && (
                          <span className="flex items-center gap-1">
                            <Home className="h-3 w-3" />
                            {tenant.unit.unit_number}
                          </span>
                        )}
                        {activeContract && (
                          <span>
                            {activeContract.rent_amount.toLocaleString("fr-FR")} FCFA/mois
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/tenants/${tenant.id}`)}
                    className="shrink-0"
                  >
                    Voir
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            {selectedPropertyId === "all" 
              ? "Aucun locataire associé aux biens de ce propriétaire" 
              : "Aucun locataire pour ce bien"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
