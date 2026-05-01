import { useMemo } from 'react';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { AdminSection, AdminTab } from '@/components/admin/AdminSidebar';
import {
  Settings,
  Users,
  Globe,
  Inbox,
  BarChart3,
  Shield,
  Mail,
  Activity,
  Building2,
  MousePointerClick,
  MapPin,
  Building,
  Import,
  DollarSign,
  UserCheck,
  MessageSquare,
  FileText,
  Flame,
  Target,
  PieChart,
  User,
  Bot,
  CalendarClock,
  Home,
  CalendarDays,
  Star,
  Sparkles,
  Wallet,
  Award,
} from 'lucide-react';
import React from 'react';

interface SectionConfig {
  id: AdminSection;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  requiredRoles: AppRole[] | 'all'; // 'all' means accessible to all authenticated users
  tabs: {
    id: AdminTab;
    label: string;
    icon: React.ReactNode;
    requiredRoles?: AppRole[] | 'all';
  }[];
}

// Complete sections configuration with role-based access
const allSections: SectionConfig[] = [
  {
    id: 'rentals',
    label: 'Pronájmy',
    icon: React.createElement(Home, { className: 'h-5 w-5' }),
    colorClass: 'text-admin-content',
    bgClass: 'bg-admin-content-muted',
    requiredRoles: 'all',
    tabs: [
      { id: 'rental-properties', label: 'Všechny nemovitosti', icon: React.createElement(Building2, { className: 'h-4 w-4' }), requiredRoles: ['admin'] },
      { id: 'my-rentals', label: 'Moje pronájmy', icon: React.createElement(Building2, { className: 'h-4 w-4' }), requiredRoles: 'all' },
      { id: 'my-rental-reservations', label: 'Příchozí rezervace', icon: React.createElement(CalendarDays, { className: 'h-4 w-4' }), requiredRoles: 'all' },
      { id: 'my-stays', label: 'Moje pobyty', icon: React.createElement(Star, { className: 'h-4 w-4' }), requiredRoles: 'all' },
      { id: 'my-payouts', label: 'Mé výplaty', icon: React.createElement(Wallet, { className: 'h-4 w-4' }), requiredRoles: 'all' },
      { id: 'my-superhost', label: 'Super-host status', icon: React.createElement(Award, { className: 'h-4 w-4' }), requiredRoles: 'all' },
      { id: 'my-wishlist', label: 'Oblíbené', icon: React.createElement(Star, { className: 'h-4 w-4' }), requiredRoles: 'all' },
      { id: 'rental-stats', label: 'Statistiky', icon: React.createElement(Sparkles, { className: 'h-4 w-4' }), requiredRoles: ['admin'] },
      { id: 'rental-reservations', label: 'Vše rezervace', icon: React.createElement(CalendarDays, { className: 'h-4 w-4' }), requiredRoles: ['admin'] },
      { id: 'rental-amenities', label: 'Vybavení', icon: React.createElement(Sparkles, { className: 'h-4 w-4' }), requiredRoles: ['admin'] },
      { id: 'rental-reviews', label: 'Recenze', icon: React.createElement(Star, { className: 'h-4 w-4' }), requiredRoles: ['admin'] },
      { id: 'rental-payouts', label: 'Výplaty', icon: React.createElement(Wallet, { className: 'h-4 w-4' }), requiredRoles: ['admin'] },
      { id: 'rental-superhosts', label: 'Super-hosts', icon: React.createElement(Award, { className: 'h-4 w-4' }), requiredRoles: ['admin'] },
    ]
  },
  {
    id: 'stats',
    label: 'Statistiky',
    icon: React.createElement(BarChart3, { className: 'h-5 w-5' }),
    colorClass: 'text-admin-stats',
    bgClass: 'bg-admin-stats-muted',
    requiredRoles: ['admin', 'obchodnik', 'senior_obchodnik'],
    tabs: [
      { id: 'network', label: 'Výkon sítě', icon: React.createElement(Activity, { className: 'h-4 w-4' }) },
    ]
  },
  {
    id: 'content',
    label: 'Projekty',
    icon: React.createElement(Globe, { className: 'h-5 w-5' }),
    colorClass: 'text-admin-content',
    bgClass: 'bg-admin-content-muted',
    requiredRoles: ['admin'],
    tabs: [
      { id: 'properties', label: 'Nemovitosti', icon: React.createElement(Building2, { className: 'h-4 w-4' }) },
      { id: 'developers', label: 'Developeři', icon: React.createElement(Building, { className: 'h-4 w-4' }) },
      { id: 'areas', label: 'Oblasti', icon: React.createElement(MapPin, { className: 'h-4 w-4' }) },
      { id: 'unit-types', label: 'Typy jednotek', icon: React.createElement(Home, { className: 'h-4 w-4' }) },
      { id: 'unit-prices', label: 'Ceny jednotek', icon: React.createElement(DollarSign, { className: 'h-4 w-4' }) },
      { id: 'import', label: 'Import/Export', icon: React.createElement(Import, { className: 'h-4 w-4' }) },
    ]
  },
  {
    id: 'system',
    label: 'Systém',
    icon: React.createElement(Settings, { className: 'h-5 w-5' }),
    colorClass: 'text-admin-system',
    bgClass: 'bg-admin-system-muted',
    requiredRoles: ['admin'],
    tabs: [
      { id: 'roles', label: 'Role & oprávnění', icon: React.createElement(Shield, { className: 'h-4 w-4' }) },
      { id: 'email-templates', label: 'Emailové šablony', icon: React.createElement(Mail, { className: 'h-4 w-4' }) },
      { id: 'chatbot-settings', label: 'Nastavení chatbota', icon: React.createElement(Bot, { className: 'h-4 w-4' }) },
    ]
  },
];

export function useRoleBasedSections() {
  const { userRoles, isAdmin } = useAuth();

  const checkRoleAccess = (requiredRoles: AppRole[] | 'all'): boolean => {
    if (requiredRoles === 'all') return true; // Available to all authenticated users
    return requiredRoles.some(role => userRoles.includes(role));
  };

  const filteredSections = useMemo(() => {
    // Admin sees everything
    if (isAdmin) {
      return allSections.map(section => ({
        ...section,
        tabs: section.tabs.map(tab => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon
        }))
      }));
    }

    return allSections
      .filter(section => {
        // Check if user has any of the required roles for this section
        return checkRoleAccess(section.requiredRoles);
      })
      .map(section => ({
        ...section,
        tabs: section.tabs
          .filter(tab => {
            // If no specific roles required, inherit from section
            if (!tab.requiredRoles) return true;
            return checkRoleAccess(tab.requiredRoles);
          })
          .map(tab => ({
            id: tab.id,
            label: tab.label,
            icon: tab.icon
          }))
      }))
      .filter(section => section.tabs.length > 0); // Remove sections with no accessible tabs
  }, [userRoles, isAdmin]);

  const getDefaultSection = (): AdminSection => {
    if (filteredSections.length === 0) return 'profile';
    return filteredSections[0].id;
  };

  const getDefaultTab = (section?: AdminSection): AdminTab => {
    const targetSection = filteredSections.find(s => s.id === (section || getDefaultSection()));
    if (!targetSection || targetSection.tabs.length === 0) return 'my-profile';
    return targetSection.tabs[0].id;
  };

  return {
    sections: filteredSections,
    getDefaultSection,
    getDefaultTab,
    allSections
  };
}
