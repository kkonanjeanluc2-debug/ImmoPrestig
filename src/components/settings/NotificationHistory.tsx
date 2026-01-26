import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Trash2,
  Check,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useClearAllNotifications,
  NotificationType,
} from "@/hooks/useNotifications";
import { Link } from "react-router-dom";

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string; label: string }> = {
  info: {
    icon: <Info className="h-4 w-4" />,
    color: "text-blue-500 bg-blue-500/10",
    label: "Information",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-amber-500 bg-amber-500/10",
    label: "Avertissement",
  },
  error: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-destructive bg-destructive/10",
    label: "Erreur",
  },
  success: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-emerald bg-emerald/10",
    label: "Succès",
  },
};

const ENTITY_ROUTES: Record<string, string> = {
  property: "/properties",
  tenant: "/tenants",
  payment: "/payments",
  contract: "/tenants",
  document: "/documents",
};

export function NotificationHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");

  const { data: notifications, isLoading } = useNotifications(100);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const clearAll = useClearAllNotifications();

  const filteredNotifications = (notifications || []).filter((n) => {
    // Type filter
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    
    // Read filter
    if (readFilter === "unread" && n.read) return false;
    if (readFilter === "read" && !n.read) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markAsRead.mutate(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <Bell className="h-5 w-5 flex-shrink-0" />
              <span>Historique des notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary">
                  {unreadCount} non lu{unreadCount > 1 ? "es" : "e"}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Consultez toutes vos notifications passées
            </CardDescription>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
                className="text-xs sm:text-sm"
              >
                {markAllAsRead.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                <span className="hidden xs:inline">Tout marquer comme</span> lu
              </Button>
            )}
            {(notifications || []).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearAll.mutate()}
                disabled={clearAll.isPending}
                className="text-destructive hover:text-destructive text-xs sm:text-sm"
              >
                {clearAll.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                <span className="hidden xs:inline">Tout</span> supprimer
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="info">Information</SelectItem>
                <SelectItem value="warning">Avertissement</SelectItem>
                <SelectItem value="error">Erreur</SelectItem>
                <SelectItem value="success">Succès</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="unread">Non lues</SelectItem>
                <SelectItem value="read">Lues</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">Aucune notification</p>
              <p className="text-sm">
                {searchQuery || typeFilter !== "all" || readFilter !== "all"
                  ? "Essayez de modifier vos filtres"
                  : "Vous n'avez pas encore de notifications"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => {
                const config = TYPE_CONFIG[notification.type as NotificationType] || TYPE_CONFIG.info;
                const entityRoute = notification.entity_type
                  ? ENTITY_ROUTES[notification.entity_type]
                  : null;
                
                const content = (
                  <div
                    className={`flex gap-3 p-4 border rounded-lg transition-colors hover:bg-muted/50 ${
                      !notification.read ? "bg-primary/5 border-primary/20" : ""
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      {config.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-medium truncate ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                              {notification.title}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {config.label}
                            </Badge>
                            {!notification.read && (
                              <Badge className="bg-primary text-primary-foreground text-xs">
                                Nouveau
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => handleMarkAsRead(notification.id, e)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDelete(notification.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
                
                if (entityRoute && notification.entity_id) {
                  return (
                    <Link
                      key={notification.id}
                      to={entityRoute}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead.mutate(notification.id);
                        }
                      }}
                    >
                      {content}
                    </Link>
                  );
                }
                
                return <div key={notification.id}>{content}</div>;
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
