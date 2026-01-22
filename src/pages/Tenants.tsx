import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Users, 
  FileText, 
  Wallet, 
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Euro,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "late";
}

interface Contract {
  id: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  deposit: number;
  status: "active" | "expired" | "ending_soon";
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  property: string;
  propertyAddress: string;
  contract: Contract;
  payments: Payment[];
}

const tenants: Tenant[] = [
  {
    id: "1",
    name: "Marie Dupont",
    email: "marie.dupont@email.com",
    phone: "+225 07 12 34 56 78",
    property: "Appartement Haussmannien",
    propertyAddress: "15 Rue du Commerce, Abidjan Plateau",
    contract: {
      id: "c1",
      startDate: "2024-01-01",
      endDate: "2026-12-31",
      rentAmount: 450000,
      deposit: 900000,
      status: "active"
    },
    payments: [
      { id: "p1", date: "2026-01-05", amount: 450000, status: "paid" },
      { id: "p2", date: "2025-12-03", amount: 450000, status: "paid" },
      { id: "p3", date: "2025-11-05", amount: 450000, status: "paid" },
    ]
  },
  {
    id: "2",
    name: "Pierre Martin",
    email: "pierre.martin@email.com",
    phone: "+225 05 98 76 54 32",
    property: "Studio Moderne",
    propertyAddress: "8 Boulevard de la République, Abidjan Cocody",
    contract: {
      id: "c2",
      startDate: "2023-06-01",
      endDate: "2026-05-31",
      rentAmount: 320000,
      deposit: 640000,
      status: "ending_soon"
    },
    payments: [
      { id: "p4", date: "2026-01-10", amount: 320000, status: "pending" },
      { id: "p5", date: "2025-12-05", amount: 320000, status: "paid" },
      { id: "p6", date: "2025-11-08", amount: 320000, status: "late" },
    ]
  },
  {
    id: "3",
    name: "Sophie Bernard",
    email: "sophie.bernard@email.com",
    phone: "+225 01 45 67 89 01",
    property: "Maison de Ville",
    propertyAddress: "25 Rue du Jardin, Yamoussoukro",
    contract: {
      id: "c3",
      startDate: "2022-09-01",
      endDate: "2025-08-31",
      rentAmount: 680000,
      deposit: 1360000,
      status: "expired"
    },
    payments: [
      { id: "p7", date: "2025-08-02", amount: 680000, status: "paid" },
      { id: "p8", date: "2025-07-03", amount: 680000, status: "paid" },
      { id: "p9", date: "2025-06-05", amount: 680000, status: "paid" },
    ]
  },
  {
    id: "4",
    name: "Lucas Petit",
    email: "lucas.petit@email.com",
    phone: "+225 07 23 45 67 89",
    property: "Loft Industriel",
    propertyAddress: "12 Quai du Port, Abidjan Marcory",
    contract: {
      id: "c4",
      startDate: "2025-03-01",
      endDate: "2028-02-28",
      rentAmount: 550000,
      deposit: 1100000,
      status: "active"
    },
    payments: [
      { id: "p10", date: "2026-01-03", amount: 550000, status: "paid" },
      { id: "p11", date: "2025-12-02", amount: 550000, status: "paid" },
      { id: "p12", date: "2025-11-04", amount: 550000, status: "paid" },
    ]
  },
];

const stats = [
  { 
    title: "Total Locataires", 
    value: "24", 
    icon: Users, 
    color: "text-emerald" 
  },
  { 
    title: "Contrats Actifs", 
    value: "21", 
    icon: FileText, 
    color: "text-blue-500" 
  },
  { 
    title: "Paiements en attente", 
    value: "3", 
    icon: Clock, 
    color: "text-amber-500" 
  },
  { 
    title: "Retards de paiement", 
    value: "2", 
    icon: AlertTriangle, 
    color: "text-red-500" 
  },
];

const contractStatusConfig = {
  active: { label: "Actif", className: "bg-emerald/10 text-emerald border-emerald/20" },
  ending_soon: { label: "Fin proche", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  expired: { label: "Expiré", className: "bg-red-500/10 text-red-500 border-red-500/20" },
};

const paymentStatusConfig = {
  paid: { label: "Payé", icon: CheckCircle, className: "text-emerald" },
  pending: { label: "En attente", icon: Clock, className: "text-amber-500" },
  late: { label: "En retard", icon: XCircle, className: "text-red-500" },
};

function TenantCard({ tenant }: { tenant: Tenant }) {
  const [expanded, setExpanded] = useState(false);
  const contractStatus = contractStatusConfig[tenant.contract.status];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Avatar */}
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-lg sm:text-xl font-semibold text-muted-foreground">
                {tenant.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                <h3 className="font-semibold text-foreground truncate">{tenant.name}</h3>
                <Badge variant="outline" className={cn("w-fit", contractStatus.className)}>
                  {contractStatus.label}
                </Badge>
              </div>

              {/* Contact */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground mb-3">
                <a href={`mailto:${tenant.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors truncate">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{tenant.email}</span>
                </a>
                <a href={`tel:${tenant.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{tenant.phone}</span>
                </a>
              </div>

              {/* Property */}
              <div className="flex items-start gap-1.5 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">{tenant.property}</p>
                  <p className="text-muted-foreground text-xs">{tenant.propertyAddress}</p>
                </div>
              </div>
            </div>

            {/* Rent Amount */}
            <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
              <span className="text-xl sm:text-2xl font-bold text-foreground">
                {tenant.contract.rentAmount.toLocaleString('fr-FR')} <span className="text-sm font-normal">F CFA</span>
              </span>
              <span className="text-xs text-muted-foreground">/mois</span>
            </div>
          </div>
        </div>

        {/* Contract Summary */}
        <div className="px-4 sm:px-6 pb-4">
          <div className="flex flex-wrap gap-3 sm:gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Début:</span>
              <span className="font-medium">{new Date(tenant.contract.startDate).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Fin:</span>
              <span className="font-medium">{new Date(tenant.contract.endDate).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Euro className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Dépôt:</span>
              <span className="font-medium">{tenant.contract.deposit.toLocaleString('fr-FR')} F CFA</span>
            </div>
          </div>
        </div>

        {/* Expand Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 sm:px-6 py-3 border-t border-border flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Wallet className="h-4 w-4" />
          <span>Historique des paiements</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Payment History */}
        {expanded && (
          <div className="border-t border-border bg-muted/30">
            <div className="p-4 sm:p-6">
              <h4 className="text-sm font-medium text-foreground mb-3">Derniers paiements</h4>
              <div className="space-y-2">
                {tenant.payments.map((payment) => {
                  const status = paymentStatusConfig[payment.status];
                  const StatusIcon = status.icon;
                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon className={cn("h-4 w-4", status.className)} />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(payment.date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                          <p className={cn("text-xs", status.className)}>{status.label}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-foreground">
                        {payment.amount.toLocaleString('fr-FR')} F CFA
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Tenants() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="pt-8 sm:pt-0">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Locataires
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gérez vos locataires, contrats et paiements
            </p>
          </div>
          <Button className="bg-emerald hover:bg-emerald/90 w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un locataire
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un locataire..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-muted", stat.color)}>
                    <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-lg sm:text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tenant List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Liste des locataires ({filteredTenants.length})
          </h2>
          <div className="grid gap-4">
            {filteredTenants.map((tenant) => (
              <TenantCard key={tenant.id} tenant={tenant} />
            ))}
          </div>
          {filteredTenants.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun locataire trouvé</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
