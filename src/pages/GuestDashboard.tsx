import { useState } from "react";
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
  Star,
  Heart,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
  ChevronDown,
  MessageSquare,
  Menu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { MyGuestStaysSection } from "@/components/dashboard/MyGuestStaysSection";
import { MyWishlistSection } from "@/components/dashboard/MyWishlistSection";
import { MyProfileSection } from "@/components/dashboard/MyProfileSection";
import { RentalMessagesInbox } from "@/components/rentals/RentalMessagesInbox";
import { DashboardSwitcher } from "@/components/DashboardSwitcher";
import logoImage from "@/assets/dreamriviera-logo-admin.png";

type GuestTab =
  | "my-stays"
  | "my-wishlist"
  | "my-reviews"
  | "messages"
  | "my-profile";

interface NavItem {
  id: GuestTab;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: "my-stays", label: "Moje pobyty", icon: <Star className="h-4 w-4" /> },
  { id: "my-wishlist", label: "Oblíbené", icon: <Heart className="h-4 w-4" /> },
  { id: "my-reviews", label: "Recenze", icon: <Star className="h-4 w-4" /> },
  { id: "messages", label: "Zprávy", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "my-profile", label: "Můj profil", icon: <User className="h-4 w-4" /> },
];

const GuestReviewsPlaceholder = () => (
  <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
    <Star className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
    <h3 className="text-lg font-semibold mb-1">Vaše recenze</h3>
    <p className="text-sm text-muted-foreground">
      Zde se zobrazí recenze, které jste napsali na pobyty. Po dokončení pobytu vás vyzveme k jejímu napsání.
    </p>
  </div>
);

const GuestDashboardContent = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<GuestTab>("my-stays");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : "G";
  const currentItem = navItems.find((i) => i.id === activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case "my-stays":
        return <MyGuestStaysSection />;
      case "my-wishlist":
        return <MyWishlistSection />;
      case "my-reviews":
        return <GuestReviewsPlaceholder />;
      case "messages":
        return user ? <RentalMessagesInbox currentUserId={user.id} /> : null;
      case "my-profile":
        return <MyProfileSection />;
      default:
        return <MyGuestStaysSection />;
    }
  };

  const handleNavClick = (id: GuestTab) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const sidebarInner = (inSheet: boolean) => (
    <div className="h-full flex flex-col bg-gradient-to-b from-sidebar via-sidebar to-background">
      <div className="flex items-center justify-center border-b border-border/30 h-16 px-4">
        <img
          src={logoImage}
          alt="go2dubai.online"
          className={cn("w-auto", !inSheet && collapsed ? "h-7" : "h-8")}
        />
      </div>

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
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border mt-1 inline-block bg-primary/10 text-primary border-primary/30">
                Host
              </span>
            </div>
          </div>
        </div>
      )}

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
                        layoutId={inSheet ? "guestActiveItemMobile" : "guestActiveItem"}
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
        <aside
          className={cn(
            "hidden md:flex h-screen flex-col border-r border-border/30 transition-all duration-300 ease-in-out sticky top-0",
            collapsed ? "w-[68px]" : "w-[260px]"
          )}
        >
          {sidebarInner(false)}
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[280px] max-w-[85vw]">
            {sidebarInner(true)}
          </SheetContent>
        </Sheet>

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
                      href="/guest"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Host
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
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2" onClick={() => setActiveTab("my-profile")}>
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

const GuestDashboard = () => (
  <ProtectedRoute>
    <GuestDashboardContent />
  </ProtectedRoute>
);

export default GuestDashboard;
