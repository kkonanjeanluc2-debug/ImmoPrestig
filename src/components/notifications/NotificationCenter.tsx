import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2, AlertCircle, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useClearAllNotifications,
  NotificationType,
} from "@/hooks/useNotifications";
import { Link } from "react-router-dom";

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  info: { icon: <Info className="h-4 w-4" />, color: "text-blue-500" },
  warning: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-500" },
  error: { icon: <AlertCircle className="h-4 w-4" />, color: "text-destructive" },
  success: { icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-500" },
};

const ENTITY_ROUTES: Record<string, string> = {
  property: "/properties",
  tenant: "/tenants",
  owner: "/owners",
  payment: "/payments",
  document: "/documents",
  contract: "/tenants",
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { data: notifications, isLoading } = useNotifications(30);
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const clearAll = useClearAllNotifications();

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead.mutate(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleClearAll = () => {
    clearAll.mutate();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Tout lire
              </Button>
            )}
            {notifications && notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                onClick={handleClearAll}
                disabled={clearAll.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Aucune notification
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Les alertes importantes apparaîtront ici
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => {
                const typeConfig = TYPE_CONFIG[notification.type as NotificationType] || TYPE_CONFIG.info;
                const entityRoute = notification.entity_type
                  ? ENTITY_ROUTES[notification.entity_type]
                  : null;

                const content = (
                  <div
                    className={cn(
                      "flex gap-3 p-4 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer",
                      !notification.read && "bg-primary/5"
                    )}
                  >
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-muted", typeConfig.color)}>
                      {typeConfig.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm leading-tight",
                          !notification.read && "font-medium"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground/70">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => handleMarkAsRead(notification.id, e)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDelete(notification.id, e)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );

                if (entityRoute) {
                  return (
                    <Link
                      key={notification.id}
                      to={entityRoute}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead.mutate(notification.id);
                        }
                        setOpen(false);
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

        {/* Footer */}
        {notifications && notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link to="/settings" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-center text-sm">
                  Voir tout l'historique
                </Button>
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
