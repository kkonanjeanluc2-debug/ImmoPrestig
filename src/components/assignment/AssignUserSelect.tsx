import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Users } from "lucide-react";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { Skeleton } from "@/components/ui/skeleton";

interface AssignUserSelectProps {
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AssignUserSelect({
  value,
  onValueChange,
  disabled = false,
  placeholder = "Non assigné",
}: AssignUserSelectProps) {
  const { data: users, isLoading } = useAssignableUsers();

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return (email || "U").charAt(0).toUpperCase();
  };

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  const selectedUser = users?.find(u => u.user_id === value);

  return (
    <Select
      value={value || "unassigned"}
      onValueChange={(val) => onValueChange(val === "unassigned" ? null : val)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {value && selectedUser ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(selectedUser.full_name, selectedUser.email)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedUser.full_name || selectedUser.email}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              {placeholder}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Non assigné (visible par tous)</span>
          </div>
        </SelectItem>
        {users?.map((user) => (
          <SelectItem key={user.user_id} value={user.user_id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(user.full_name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span>{user.full_name || user.email}</span>
                <span className="text-xs text-muted-foreground">{user.role}</span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Display-only badge showing assignment
interface AssignmentBadgeProps {
  userId: string | null | undefined;
  showUnassigned?: boolean;
}

export function AssignmentBadge({ userId, showUnassigned = false }: AssignmentBadgeProps) {
  const { data: users } = useAssignableUsers();

  if (!userId) {
    if (!showUnassigned) return null;
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <Users className="h-3 w-3" />
        Tous
      </Badge>
    );
  }

  const user = users?.find(u => u.user_id === userId);
  if (!user) return null;

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return (email || "U").charAt(0).toUpperCase();
  };

  return (
    <Badge variant="secondary" className="text-xs gap-1">
      <User className="h-3 w-3" />
      {user.full_name || user.email?.split("@")[0]}
    </Badge>
  );
}
