import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Building2,
  CalendarDays,
  Star,
  Wallet,
  Award,
  Home,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
  Settings,
  ChevronDown,
  MessageSquare,
  Receipt,
  Menu,
  UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { MyRentalsSection } from "@/components/dashboard/MyRentalsSection";
import { MyRentalReservationsSection } from "@/components/dashboard/MyRentalReservationsSection";
import { HostAvailabilitySection } from "@/components/dashboard/HostAvailabilitySection";
import { MyGuestStaysSection } from "@/components/dashboard/MyGuestStaysSection";
import { MyPayoutsSection } from "@/components/dashboard/MyPayoutsSection";
import { SuperhostStatusSection } from "@/components/dashboard/SuperhostStatusSection";
import { MyWishlistSection } from "@/components/dashboard/MyWishlistSection";
import { MyProfileSection } from "@/components/dashboard/MyProfileSection";
import { RentalMessagesInbox } from "@/components/rentals/RentalMessagesInbox";
import { FinancesSection } from "@/components/dashboard/FinancesSection";
import { OfflineReservationSection } from "@/components/dashboard/OfflineReservationSection";
import { DashboardSwitcher } from "@/components/DashboardSwitcher";
import logoImage from "@/assets/logo-produbai.png";

type HostTab =
  | "my-profile"
  | "my-rentals"
  | "my-rental-reservations"
  | "offline-reservation"
  | "host-availability"
  | "messages"
  | "my-stays"
  | "my-payouts"
  | "finances"
  | "my-superhost"
  | "my-wishlist";

interface NavItem {
  id: HostTab;
  label: string;
  icon: React.ReactNode;
}

const buildNavItems = (managerMode: boolean): NavItem[] => {
  const items: NavItem[] = [
    { id: "my-rentals", label: managerMode ? "Všechny pronájmy" : "Moje pronájmy", icon: <Building2 className="h-4 w-4" /> },
    { id: "my-rental-reservations", label: managerMode ? "Všechny rezervace" : "Příchozí rezervace", icon: <CalendarDays className="h-4 w-4" /> },
  ];
  if (managerMode) {
    items.push({ id: "offline-reservation", label: "Offline rezervace", icon: <UserPlus className="h-4 w-4" /> });
  }
  items.push(
    { id: "host-availability", label: "Kalendář dostupnosti", icon: <CalendarDays className="h-4 w-4" /> },
    { id: "messages", label: "Zprávy", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "my-payouts", label: managerMode ? "Všechny výplaty" : "Mé výplaty", icon: <Wallet className="h-4 w-4" /> },
    { id: "finances", label: "Finance", icon: <Receipt className="h-4 w-4" /> },
  );
  if (!managerMode) {
    items.splice(4, 0, { id: "my-stays", label: "Moje pobyty", icon: <Star className="h-4 w-4" /> });
    items.push(
      { id: "my-superhost", label: "Super-host status", icon: <Award className="h-4 w-4" /> },
      { id: "my-wishlist", label: "Oblíbené", icon: <Star className="h-4 w-4" /> },
    );
  }
  items.push({ id: "my-profile", label: "Můj profil", icon: <User className="h-4 w-4" /> });
  return items;
};

interface HostDashboardContentProps {
  managerMode?: boolean;
}

const HostDashboardContent = ({ managerMode = false }: HostDashboardContentProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const navItems = buildNavItems(managerMode);
  const [activeTab, setActiveTab] = useState<HostTab>(navItems[0].id);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "H";

  const currentItem = navItems.find((i) => i.id === activeTab);
  const roleBadgeLabel = managerMode ? "Správce" : "Hostitel";
  const breadcrumbRoot = managerMode ? "Správce" : "Hostitel";
  const breadcrumbHref = managerMode ? "/manager" : "/host";

  const renderContent = () => {
    switch (activeTab) {
      case "my-profile":
        return <MyProfileSection />;
      case "my-rentals":
        return <MyRentalsSection managerMode={managerMode} />;
      case "my-rental-reservations":
        return <MyRentalReservationsSection managerMode={managerMode} />;
      case "offline-reservation":
        return <OfflineReservationSection />;
      case "host-availability":
        return <HostAvailabilitySection managerMode={managerMode} />;
      case "messages":
        return user ? <RentalMessagesInbox currentUserId={user.id} /> : null;
      case "my-stays":
        return <MyGuestStaysSection />;
      case "my-payouts":
        return <MyPayoutsSection managerMode={managerMode} />;
      case "finances":
        return <FinancesSection managerMode={managerMode} />;
      case "my-superhost":
        return <SuperhostStatusSection />;
      case "my-wishlist":
        return <MyWishlistSection />;
      default:
        return <MyRentalsSection managerMode={managerMode} />;
    }
  };

  const handleNavClick = (id: HostTab) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const sidebarInner = (inSheet: boolean) => (
    <div className="h-full flex flex-col bg-gradient-to-b from-sidebar via-sidebar to-background">
      {/* Logo */}
      <div className="flex items-center justify-center border-b border-border/30 h-20 px-4">
        <img
          src={logoImage}
          alt="PRODUBAI"
          className={cn(
            "w-full h-full object-contain",
            !inSheet && collapsed ? "max-h-10" : "max-h-14"
          )}
        />
      </div>

      {/* User info */}
      {(inSheet || !collapsed) && (
        <div className="px-3 py-3 border-b border-border/30">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-secondary/30">
            <Avatar className="h-9 w-9 border border-border/50">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email?.split("@")[0]}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {user?.email}
              </p>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border mt-1 inline-block bg-admin-content-muted text-admin-content border-admin-content/30">
                {roleBadgeLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const showLabel = inSheet || !collapsed;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                      "hover:bg-secondary/50",
                      isActive && "bg-secondary border border-border/50 shadow-sm",
                      !showLabel && "justify-center px-2"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId={inSheet ? "hostActiveItemMobile" : "hostActiveItem"}
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary"
                      />
                    )}
                    <span
                      className={cn(
                        "flex-shrink-0 transition-colors",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {item.icon}
                    </span>
                    {showLabel && (
                      <span
                        className={cn(
                          "flex-1 text-left text-sm font-medium transition-colors",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        )}
                      >
                        {item.label}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                {!inSheet && collapsed && (
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border/30 p-2">
        {(inSheet || !collapsed) ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="flex-1 justify-start text-muted-foreground hover:text-foreground h-9"
              >
                <a href="/">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  <span className="text-sm">Otevřít web</span>
                </a>
              </Button>
              {!inSheet && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCollapsed(true)}
                  className="text-muted-foreground hover:text-foreground h-9 w-9"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start text-muted-foreground hover:text-destructive h-9"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="text-sm">Odhlásit se</span>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCollapsed(false)}
                  className="text-muted-foreground hover:text-foreground h-9 w-9"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Rozbalit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-destructive h-9 w-9"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Odhlásit se</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden md:flex h-screen flex-col border-r border-border/30 transition-all duration-300 ease-in-out sticky top-0",
            collapsed ? "w-[68px]" : "w-[260px]"
          )}
        >
          {sidebarInner(false)}
        </aside>

        {/* Mobile Sidebar (Sheet) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[280px] max-w-[85vw]">
            {sidebarInner(true)}
          </SheetContent>
        </Sheet>

        {/* Main */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
          <header className="h-14 md:h-16 border-b border-border/30 bg-background/80 backdrop-blur-xl flex items-center justify-between px-3 md:px-6 sticky top-0 z-40 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-9 w-9 flex-shrink-0"
                    aria-label="Otevřít menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>

              <Breadcrumb className="min-w-0">
                <BreadcrumbList className="flex-nowrap">
                  <BreadcrumbItem className="hidden sm:flex">
                    <BreadcrumbLink
                      href={breadcrumbHref}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {breadcrumbRoot}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-muted-foreground/50 hidden sm:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-foreground font-medium truncate">
                      {currentItem?.label}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex items-center gap-2">
              <DashboardSwitcher />
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 gap-2 px-2 hover:bg-secondary/50 flex-shrink-0"
                >
                  <Avatar className="h-7 w-7 border border-border/50">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Přihlášen jako</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => setActiveTab("my-profile")}
                >
                  <User className="h-4 w-4" />
                  Můj profil
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2">
                  <a href="/">
                    <ExternalLink className="h-4 w-4" />
                    Zobrazit web
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="text-destructive focus:text-destructive gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Odhlásit se
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="min-w-0"
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

interface HostDashboardProps {
  managerMode?: boolean;
}

const HostDashboard = ({ managerMode = false }: HostDashboardProps = {}) => (
  <ProtectedRoute>
    <HostDashboardContent managerMode={managerMode} />
  </ProtectedRoute>
);

export default HostDashboard;
