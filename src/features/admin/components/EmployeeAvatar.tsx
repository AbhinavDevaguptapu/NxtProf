import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface EmployeeAvatarProps {
  name: string;
  className?: string;
  isSelected?: boolean;
}

// Helper function to get initials from a name
const getInitials = (name: string) => {
  if (!name) return "?";
  const names = name.split(" ");
  const initials =
    names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`
      : names[0][0];
  return initials.toUpperCase();
};

export default function EmployeeAvatar({ name, className, isSelected = false }: EmployeeAvatarProps) {
  return (
    <Avatar className={cn("h-9 w-9", className)}>
      <AvatarFallback
        className={cn(
          "text-sm font-semibold",
          isSelected
            ? "bg-primary-foreground text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
