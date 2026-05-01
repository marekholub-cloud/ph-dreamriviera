import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AdminSidebar, AdminSection, AdminTab } from "./AdminSidebar";
import { NotificationDropdown } from "./NotificationDropdown";
import { DashboardSwitcher } from "@/components/DashboardSwitcher";

import { useRoleBasedSections } from "@/hooks/useRoleBasedSections";
import { cn } from "@/lib/utils";
import { 
  Search, 
  Plus, 
  LogOut, 
  User, 
  Calendar, 
  UserPlus, 
  Building2,
  Settings,
  ExternalLink,
  ChevronDown,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import { motion } from "framer-motion";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection: AdminSection;
  activeTab: AdminTab;
  onSectionChange: (section: AdminSection) => void;
  onTabChange: (tab: AdminTab) => void;
}

export function AdminLayout({
  children,
  activeSection,
  activeTab,
  onSectionChange,
  onTabChange,
}: AdminLayoutProps) {
  const { signOut, user, isAdmin } = useAuth();
  const { sections } = useRoleBasedSections();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Get current section and tab info for breadcrumbs
  const currentSection = sections.find(s => s.id === activeSection);
  const currentTab = currentSection?.tabs.find(t => t.id === activeTab);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleQuickAction = (action: string) => {
    setQuickAddOpen(false);
    switch (action) {
      case 'lead':
        onSectionChange('leads');
        onTabChange('leads-list');
        break;
      case 'property':
        onSectionChange('content');
        onTabChange('properties');
        break;
      case 'consultation':
        onSectionChange('leads');
        onTabChange('consultations');
        break;
    }
  };

  const userInitials = user?.email 
    ? user.email.substring(0, 2).toUpperCase() 
    : 'U';

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar
        activeSection={activeSection}
        activeTab={activeTab}
        onSectionChange={onSectionChange}
        onTabChange={onTabChange}
      />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Modern Header */}
        <header className="h-16 border-b border-border/30 bg-background/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {/* Breadcrumbs */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    href="/admin" 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/50" />
                <BreadcrumbItem>
                  <span className={cn("flex items-center gap-1.5", currentSection?.colorClass)}>
                    <span className="opacity-70">{currentSection?.icon}</span>
                    <BreadcrumbLink 
                      className="hover:text-foreground cursor-pointer transition-colors"
                      onClick={() => {
                        if (currentSection?.tabs.length) {
                          onTabChange(currentSection.tabs[0].id);
                        }
                      }}
                    >
                      {currentSection?.label}
                    </BreadcrumbLink>
                  </span>
                </BreadcrumbItem>
                {currentTab && (
                  <>
                    <BreadcrumbSeparator className="text-muted-foreground/50" />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-foreground font-medium">
                        {currentTab.label}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2">
            {/* Global Search */}
            <Button
              variant="outline"
              className="hidden md:flex items-center gap-2 text-muted-foreground w-56 justify-start h-9 border-border/50 hover:border-border hover:bg-secondary/50"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Hledat...</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-md border border-border/50 bg-secondary/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            {/* Mobile search */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Dashboard switcher */}
            <DashboardSwitcher />

            {/* Notifications */}
            <NotificationDropdown />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="h-9 gap-2 px-2 hover:bg-secondary/50"
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
                <DropdownMenuItem className="gap-2">
                  <User className="h-4 w-4" />
                  Můj profil
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Settings className="h-4 w-4" />
                  Nastavení
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2">
                  <a href="/" target="_blank">
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

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      {/* Global Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
          <Command className="rounded-lg border-none">
            <div className="flex items-center border-b border-border px-3">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <CommandInput 
                placeholder="Hledat sekce, akce..." 
                className="h-12 border-none focus:ring-0"
              />
            </div>
            <CommandList className="max-h-[400px]">
              <CommandEmpty className="py-6 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Žádné výsledky
              </CommandEmpty>
              <CommandGroup heading="Sekce">
                {sections.map((section) => (
                  <CommandItem
                    key={section.id}
                    onSelect={() => {
                      onSectionChange(section.id);
                      if (section.tabs.length > 0) {
                        onTabChange(section.tabs[0].id);
                      }
                      setSearchOpen(false);
                    }}
                    className="gap-3 py-3"
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      section.bgClass
                    )}>
                      <span className={section.colorClass}>{section.icon}</span>
                    </div>
                    <div>
                      <p className="font-medium">{section.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {section.tabs.length} položek
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Rychlé akce">
                <CommandItem 
                  onSelect={() => { handleQuickAction('lead'); setSearchOpen(false); }}
                  className="gap-3 py-3"
                >
                  <div className="h-8 w-8 rounded-lg bg-admin-clients/10 flex items-center justify-center">
                    <UserPlus className="h-4 w-4 text-admin-clients" />
                  </div>
                  <span>Přidat nový lead</span>
                </CommandItem>
                <CommandItem 
                  onSelect={() => { handleQuickAction('event'); setSearchOpen(false); }}
                  className="gap-3 py-3"
                >
                  <div className="h-8 w-8 rounded-lg bg-admin-events/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-admin-events" />
                  </div>
                  <span>Vytvořit event</span>
                </CommandItem>
                <CommandItem 
                  onSelect={() => { handleQuickAction('consultation'); setSearchOpen(false); }}
                  className="gap-3 py-3"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CalendarClock className="h-4 w-4 text-primary" />
                  </div>
                  <span>Nová rezervace konzultace</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
