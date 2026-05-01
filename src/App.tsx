import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ShareSidebar } from "@/components/ShareSidebar";
import { WhatsAppSidebarTab } from "@/components/WhatsAppSidebarTab";
import { ConsultationSidebarTab } from "@/components/ConsultationSidebarTab";
import { useChatbotNotifications } from "@/hooks/useChatbotNotifications";

import { initAffiliateTracking } from "@/utils/affiliateCode";
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import PropertyDetail from "./pages/PropertyDetail";


import Areas from "./pages/Areas";
import AreaDetail from "./pages/AreaDetail";







import Blog from "./pages/Blog";




import DownloadCatalog from "./pages/DownloadCatalog";
import DownloadFile from "./pages/DownloadFile";
import Auth from "./pages/Auth";
import UnifiedDashboard from "./pages/UnifiedDashboard";
import InvestorProfile from "./pages/InvestorProfile";
import ObchodnikProfile from "./pages/ObchodnikProfile";
import NotFound from "./pages/NotFound";
import DirectDownload from "./pages/DirectDownload";
import PropertiesMap from "./pages/PropertiesMap";


import EmbedInvestorForm from "./pages/EmbedInvestorForm";
import LeadDetail from "./pages/LeadDetail";
import RecommendedProjects from "./pages/RecommendedProjects";
import TiparVerification from "./pages/TiparVerification";
import Rentals from "./pages/Rentals";
import RentalDetail from "./pages/RentalDetail";
import RentalHostProfile from "./pages/RentalHostProfile";
import BecomeHost from "./pages/BecomeHost";
import HostDashboard from "./pages/HostDashboard";
import WhyDubai from "./pages/WhyDubai";
import Invest from "./pages/Invest";
import GuestDashboard from "./pages/GuestDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import IslandNest from "./pages/IslandNest";

const queryClient = new QueryClient();

// Component that enables real-time notifications for admins
const AdminRealtimeNotifications = () => {
  const { userRoles, adminLoading } = useAuth();
  const isAdmin = userRoles.includes("admin");

  // Enable real-time notifications for admins
  useChatbotNotifications();

  // Wait for roles to load before deciding
  if (adminLoading) return null;
  if (!isAdmin) return null;

  return null;
};

const AppContent = () => {
  useEffect(() => {
    initAffiliateTracking();
  }, []);

  return (
    <>
      <ScrollToTop />
      {/* Bočná tlačítka skryta na přání: ShareSidebar, WhatsAppSidebarTab, ConsultationSidebarTab */}
      <AdminRealtimeNotifications />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/villas" element={<Projects />} />
        <Route path="/map" element={<PropertiesMap />} />
        <Route path="/map-for-sale" element={<PropertiesMap />} />
        <Route path="/nemovitosti-mapa" element={<PropertiesMap />} />
        <Route path="/nemovitost/:slug" element={<PropertyDetail />} />
        
        <Route path="/oblasti" element={<Areas />} />
        <Route path="/oblast/:slug" element={<AreaDetail />} />
        
        
        
        
        
        
        
        <Route path="/blog" element={<Blog />} />
        
        
        
        
        <Route path="/download-catalog" element={<DownloadCatalog />} />
        <Route path="/download-file" element={<DownloadFile />} />
        <Route path="/dl" element={<DirectDownload />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/tipar-verification" element={<TiparVerification />} />
        
        {/* Unified Dashboard for all roles */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireAnyRole={['admin', 'obchodnik', 'senior_obchodnik', 'tipar', 'influencer_coordinator']}>
              <UnifiedDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Legacy routes - redirect to unified dashboard */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute requireAnyRole={['admin', 'obchodnik', 'senior_obchodnik', 'tipar', 'influencer_coordinator']}>
              <UnifiedDashboard />
            </ProtectedRoute>
          } 
        />
        {/* Lead Detail Page */}
        <Route 
          path="/lead/:id" 
          element={
            <ProtectedRoute requireAnyRole={['admin', 'obchodnik', 'senior_obchodnik', 'tipar', 'influencer_coordinator']}>
              <LeadDetail />
            </ProtectedRoute>
          } 
        />
        
        <Route path="/investor-profil" element={<InvestorProfile />} />
        
        
        <Route path="/embed/investor-form" element={<EmbedInvestorForm />} />
        <Route path="/doporucene-projekty" element={<RecommendedProjects />} />
        <Route path="/rentals" element={<Rentals />} />
        <Route path="/rentals/host/:hostId" element={<RentalHostProfile />} />
        <Route path="/rentals/:slug" element={<RentalDetail />} />
        <Route path="/become-host" element={<BecomeHost />} />
        <Route path="/host" element={<HostDashboard />} />
        <Route 
          path="/manager" 
          element={
            <ProtectedRoute requireAnyRole={['admin', 'moderator']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/guest" 
          element={
            <ProtectedRoute>
              <GuestDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/why-dubai" element={<WhyDubai />} />
        <Route path="/why-costa-rica" element={<WhyDubai />} />
        <Route path="/invest" element={<Invest />} />
        <Route path="/island-nest" element={<IslandNest />} />
        <Route 
          path="/muj-profil" 
          element={
            <ProtectedRoute>
              <ObchodnikProfile />
            </ProtectedRoute>
          } 
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
