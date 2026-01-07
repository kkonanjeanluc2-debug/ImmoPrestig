import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Building2, 
  MapPin,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const owners = [
  {
    id: "1",
    name: "Marie Dubois",
    email: "marie.dubois@email.com",
    phone: "+33 6 12 34 56 78",
    address: "15 Rue de la Paix, Paris 75002",
    properties: 5,
    totalRevenue: 12500,
    status: "actif",
  },
  {
    id: "2",
    name: "Pierre Martin",
    email: "pierre.martin@email.com",
    phone: "+33 6 98 76 54 32",
    address: "42 Avenue des Champs, Lyon 69001",
    properties: 3,
    totalRevenue: 7800,
    status: "actif",
  },
  {
    id: "3",
    name: "Sophie Bernard",
    email: "sophie.bernard@email.com",
    phone: "+33 6 55 44 33 22",
    address: "8 Boulevard Victor Hugo, Marseille 13001",
    properties: 2,
    totalRevenue: 4200,
    status: "inactif",
  },
  {
    id: "4",
    name: "Jean-Luc Moreau",
    email: "jl.moreau@email.com",
    phone: "+33 6 11 22 33 44",
    address: "25 Rue du Commerce, Bordeaux 33000",
    properties: 8,
    totalRevenue: 24000,
    status: "actif",
  },
];

const Owners = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Propriétaires
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Gérez vos propriétaires et leurs biens
            </p>
          </div>
          <Button className="bg-emerald hover:bg-emerald-dark text-primary-foreground gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Ajouter un propriétaire
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un propriétaire..."
            className="pl-10"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Total propriétaires</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{owners.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Actifs</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald mt-1">
                {owners.filter(o => o.status === "actif").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Total biens</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
                {owners.reduce((sum, o) => sum + o.properties, 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Revenus mensuels</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
                {owners.reduce((sum, o) => sum + o.totalRevenue, 0).toLocaleString('fr-FR')} F CFA
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Owners List */}
        <div className="grid gap-4">
          {owners.map((owner) => (
            <Card key={owner.id} className="overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Owner Info */}
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-foreground font-semibold text-sm sm:text-base">
                        {owner.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base">{owner.name}</h3>
                        <Badge 
                          variant={owner.status === "actif" ? "default" : "secondary"}
                          className={owner.status === "actif" ? "bg-emerald text-primary-foreground" : ""}
                        >
                          {owner.status}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{owner.email}</span>
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>{owner.phone}</span>
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{owner.address}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
                    <div className="text-center">
                      <p className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-1">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {owner.properties}
                      </p>
                      <p className="text-xs text-muted-foreground">Biens</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg sm:text-xl font-bold text-emerald">
                        {owner.totalRevenue.toLocaleString('fr-FR')} F CFA
                      </p>
                      <p className="text-xs text-muted-foreground">Revenus/mois</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border border-border z-50">
                        <DropdownMenuItem>Voir les détails</DropdownMenuItem>
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuItem>Voir les biens</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Owners;
