import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Home, Briefcase, Shield, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PanelDef {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[]; // roles that grant access
}

const PANELS: PanelDef[] = [
  { path: "/admin", label: "Admin", icon: Shield, roles: ["admin"] },
  { path: "/manager", label: "Správce", icon: Briefcase, roles: ["admin", "moderator"] },
  { path: "/host", label: "Hostitel", icon: Home, roles: ["admin", "host"] },
  { path: "/guest", label: "Host", icon: LayoutDashboard, roles: ["admin", "guest", "user", "host", "moderator"] },
];

interface DashboardSwitcherProps {
  variant?: "navbar" | "ghost";
  className?: string;
}

export const DashboardSwitcher = ({ variant = "navbar", className }: DashboardSwitcherProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRoles, user } = useAuth();

  if (!user) return null;

  const available = PANELS.filter((p) => p.roles.some((r) => userRoles.includes(r as any)));
  if (available.length <= 1) return null;

  const current = available.find((p) => location.pathname.startsWith(p.path)) ?? available[0];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "navbar" ? "outline" : "ghost"}
          size="sm"
          className={className}
        >
          <CurrentIcon className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{current.label}</span>
          <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Přepnout panel</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {available.map((p) => {
          const Icon = p.icon;
          const isActive = p.path === current.path;
          return (
            <DropdownMenuItem
              key={p.path}
              onClick={() => navigate(p.path)}
              className={isActive ? "bg-secondary/50 font-medium" : ""}
            >
              <Icon className="h-4 w-4 mr-2" />
              {p.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
