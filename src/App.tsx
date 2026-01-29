import { Suspense, lazy, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WelcomeScreen from "@/components/WelcomeScreen";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import UpdatePrompt from "@/components/UpdatePrompt";
import OfflineIndicator from "@/components/OfflineIndicator";
import { Loader2 } from "lucide-react";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyDetails = lazy(() => import("./pages/PropertyDetails"));
const Owners = lazy(() => import("./pages/Owners"));
const OwnerDetails = lazy(() => import("./pages/OwnerDetails"));
const Tenants = lazy(() => import("./pages/Tenants"));
const TenantDetails = lazy(() => import("./pages/TenantDetails"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Payments = lazy(() => import("./pages/Payments"));
const Settings = lazy(() => import("./pages/Settings"));
const Install = lazy(() => import("./pages/Install"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Trash = lazy(() => import("./pages/Trash"));
const SignContract = lazy(() => import("./pages/SignContract"));
const Lotissements = lazy(() => import("./pages/Lotissements"));
const LotissementDetails = lazy(() => import("./pages/LotissementDetails"));
const VentesImmobilieres = lazy(() => import("./pages/VentesImmobilieres"));
const VenteImmobiliereDetails = lazy(() => import("./pages/VenteImmobiliereDetails"));
const BienVenteDetails = lazy(() => import("./pages/BienVenteDetails"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash on first visit per session
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    return !hasSeenSplash;
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem("hasSeenSplash", "true");
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {showSplash && <WelcomeScreen onComplete={handleSplashComplete} minDuration={5000} />}
        <PWAInstallBanner />
        <UpdatePrompt />
        <OfflineIndicator />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                
                <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
                <Route path="/properties/:id" element={<ProtectedRoute><PropertyDetails /></ProtectedRoute>} />
                <Route path="/owners" element={<ProtectedRoute><Owners /></ProtectedRoute>} />
                <Route path="/owners/:id" element={<ProtectedRoute><OwnerDetails /></ProtectedRoute>} />
                <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
                <Route path="/tenants/:id" element={<ProtectedRoute><TenantDetails /></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
<Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/trash" element={<ProtectedRoute><Trash /></ProtectedRoute>} />
                <Route path="/lotissements" element={<ProtectedRoute><Lotissements /></ProtectedRoute>} />
                <Route path="/lotissements/:id" element={<ProtectedRoute><LotissementDetails /></ProtectedRoute>} />
                <Route path="/ventes-immobilieres" element={<ProtectedRoute><VentesImmobilieres /></ProtectedRoute>} />
                <Route path="/ventes-immobilieres/:id" element={<ProtectedRoute><BienVenteDetails /></ProtectedRoute>} />
                <Route path="/ventes-immobilieres/vente/:id" element={<ProtectedRoute><VenteImmobiliereDetails /></ProtectedRoute>} />
                <Route path="/super-admin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
                <Route path="/install" element={<Install />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/sign-contract" element={<SignContract />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
