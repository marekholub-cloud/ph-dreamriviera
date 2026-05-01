import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Home, User, LogOut, Settings, ExternalLink } from "lucide-react";
import { useRoleBasedSections } from "@/hooks/useRoleBasedSections";
import { useAuth } from "@/contexts/AuthContext";
import logoImage from "@/assets/logo-produbai.png";
import { motion, AnimatePresence } from "framer-motion";

export type AdminSection = 
  | 'profile'
  | 'system' 
  | 'users' 
  | 'content' 
  | 'leads' 
  | 'stats'
  | 'rentals';

export type AdminTab = 
  | 'my-profile'
  | 'overview'
  | 'settings'
  | 'roles'
  | 'email-templates'
  | 'api-logs'
  | 'chatbot-settings'
  | 'users-list'
  | 'user-registration'
  | 'properties'
  | 'developers'
  | 'areas'
  | 'import'
  | 'unit-prices'
  | 'unit-types'
  | 'leads-list'
  | 'messages'
  | 'requests'
  | 'chatbot-history'
  | 'consultations'
  | 'warmth'
  | 'network'
  | 'affiliate-analytics'
  | 'conversions'
  | 'revenue'
  | 'rental-properties'
  | 'rental-reservations'
  | 'rental-amenities'
  | 'rental-reviews'
  | 'rental-stats'
  | 'my-rentals'
  | 'my-rental-reservations'
  | 'my-stays'
  | 'my-payouts'
  | 'my-superhost'
  | 'my-wishlist'
  | 'rental-payouts'
  | 'rental-superhosts';

interface AdminSidebarProps {
  activeSection: AdminSection;
  activeTab: AdminTab;
  onSectionChange: (section: AdminSection) => void;
  onTabChange: (tab: AdminTab) => void;
}

export function AdminSidebar({ 
  activeSection, 
  activeTab, 
  onSectionChange, 
  onTabChange 
}: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState<AdminSection | null>(activeSection);
  const { sections } = useRoleBasedSections();
  const { isAdmin, isObchodnik, isTipar, user, signOut } = useAuth();

  // Determine role label for sidebar header
  const getRoleLabel = () => {
    if (isAdmin) return "Administrátor";
    if (isObchodnik) return "Obchodník";
    if (isTipar) return "Tipař";
    return "Dashboard";
  };

  const getRoleBadgeColor = () => {
    if (isAdmin) return "bg-admin-leads/20 text-admin-leads border-admin-leads/30";
    if (isObchodnik) return "bg-admin-clients/20 text-admin-clients border-admin-clients/30";
    if (isTipar) return "bg-admin-events/20 text-admin-events border-admin-events/30";
    return "bg-muted text-muted-foreground";
  };

  const handleSectionClick = (section: typeof sections[0]) => {
    if (expandedSection === section.id) {
      onSectionChange(section.id);
      if (section.tabs.length > 0) {
        onTabChange(section.tabs[0].id);
      }
    } else {
      setExpandedSection(section.id);
      onSectionChange(section.id);
      if (section.tabs.length > 0) {
        onTabChange(section.tabs[0].id);
      }
    }
  };

  const userInitials = user?.email 
    ? user.email.substring(0, 2).toUpperCase() 
    : 'U';

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={cn(
          "h-screen flex flex-col border-r border-border/30 transition-all duration-300 ease-in-out",
          "bg-gradient-to-b from-sidebar via-sidebar to-background",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {/* Logo Header */}
        <div className={cn(
          "flex items-center border-b border-border/30 h-16 px-4 backdrop-blur-sm",
          collapsed ? "justify-center" : "justify-center"
        )}>
          {!collapsed ? (
          <div className="w-full flex justify-center">
              <img src={logoImage} alt="PRESTON DEVELOPMENT FZ LLC" className="h-8 w-auto" />
            </div>
          ) : (
          <div>
              <img src={logoImage} alt="CAD" className="h-7 w-auto" />
            </div>
          )}
        </div>

        {/* User Quick Info */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-border/30">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <Avatar className="h-9 w-9 border border-border/50">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email?.split('@')[0]}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email}
                </p>
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full border mt-1 inline-block",
                  getRoleBadgeColor()
                )}>
                  {getRoleLabel()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-1 px-2">
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              const isExpanded = expandedSection === section.id && !collapsed;

              return (
                <div key={section.id} className="space-y-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleSectionClick(section)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                          "hover:bg-secondary/50",
                          "group relative",
                          isActive && "bg-secondary border border-border/50 shadow-sm",
                          collapsed && "justify-center px-2"
                        )}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <motion.div 
                            layoutId="activeSection"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary"
                          />
                        )}
                        
                        <span className={cn(
                          "flex-shrink-0 transition-all duration-200",
                          isActive ? section.colorClass : "text-muted-foreground group-hover:text-foreground"
                        )}>
                          {section.icon}
                        </span>
                        {!collapsed && (
                          <>
                            <span className={cn(
                              "flex-1 text-left text-sm font-medium transition-colors",
                              isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                            )}>
                              {section.label}
                            </span>
                            <ChevronRight className={cn(
                              "h-4 w-4 text-muted-foreground/50 transition-transform duration-200",
                              isExpanded && "rotate-90"
                            )} />
                          </>
                        )}
                      </button>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right" className="font-medium">
                        {section.label}
                      </TooltipContent>
                    )}
                  </Tooltip>

                  {/* Sub-tabs with animation */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-4 pl-3 border-l border-border/30 space-y-0.5 overflow-hidden"
                      >
                        {section.tabs.map((tab) => {
                          const isTabActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => onTabChange(tab.id)}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                "hover:bg-secondary/50",
                                isTabActive 
                                  ? cn("bg-primary/10 text-foreground font-medium", section.colorClass)
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <span className={cn(
                                "transition-colors",
                                isTabActive ? section.colorClass : "text-muted-foreground"
                              )}>
                                {tab.icon}
                              </span>
                              <span>{tab.label}</span>
                              {isTabActive && (
                                <motion.div 
                                  layoutId="activeTab"
                                  className="ml-auto h-1.5 w-1.5 rounded-full bg-current"
                                />
                              )}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border/30 p-2">
          {!collapsed ? (
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCollapsed(!collapsed)}
                  className="text-muted-foreground hover:text-foreground h-9 w-9"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
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
                    onClick={() => setCollapsed(!collapsed)}
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
      </aside>
    </TooltipProvider>
  );
}
