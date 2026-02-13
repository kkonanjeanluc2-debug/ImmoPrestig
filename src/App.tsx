import { Suspense, lazy, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { FeatureProtectedRoute } from "@/components/auth/FeatureProtectedRoute";
import { InactivityHandler } from "@/components/auth/InactivityHandler";
import WelcomeScreen from "@/components/WelcomeScreen";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import UpdatePrompt from "@/components/UpdatePrompt";
import OfflineIndicator from "@/components/OfflineIndicator";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Lazy load pages for code splitting
const pageImports = {
  Index: () => import("./pages/Index"),
  Properties: () => import("./pages/Properties"),
  PropertyDetails: () => import("./pages/PropertyDetails"),
  Owners: () => import("./pages/Owners"),
  OwnerDetails: () => import("./pages/OwnerDetails"),
  Tenants: () => import("./pages/Tenants"),
  TenantDetails: () => import("./pages/TenantDetails"),
  Contracts: () => import("./pages/Contracts"),
  Payments: () => import("./pages/Payments"),
  Settings: () => import("./pages/Settings"),
  Install: () => import("./pages/Install"),
  Login: () => import("./pages/Login"),
  Signup: () => import("./pages/Signup"),
  ForgotPassword: () => import("./pages/ForgotPassword"),
  ResetPassword: () => import("./pages/ResetPassword"),
  NotFound: () => import("./pages/NotFound"),
  SuperAdmin: () => import("./pages/SuperAdmin"),
  Pricing: () => import("./pages/Pricing"),
  Trash: () => import("./pages/Trash"),
  SignContract: () => import("./pages/SignContract"),
  Lotissements: () => import("./pages/Lotissements"),
  LotissementDetails: () => import("./pages/LotissementDetails"),
  VentesImmobilieres: () => import("./pages/VentesImmobilieres"),
  VenteImmobiliereDetails: () => import("./pages/VenteImmobiliereDetails"),
  BienVenteDetails: () => import("./pages/BienVenteDetails"),
};

const Index = lazy(pageImports.Index);
const Properties = lazy(pageImports.Properties);
const PropertyDetails = lazy(pageImports.PropertyDetails);
const Owners = lazy(pageImports.Owners);
const OwnerDetails = lazy(pageImports.OwnerDetails);
const Tenants = lazy(pageImports.Tenants);
const TenantDetails = lazy(pageImports.TenantDetails);
const Contracts = lazy(pageImports.Contracts);
const Payments = lazy(pageImports.Payments);
const Settings = lazy(pageImports.Settings);
const Install = lazy(pageImports.Install);
const Login = lazy(pageImports.Login);
const Signup = lazy(pageImports.Signup);
const ForgotPassword = lazy(pageImports.ForgotPassword);
const ResetPassword = lazy(pageImports.ResetPassword);
const NotFound = lazy(pageImports.NotFound);
const SuperAdmin = lazy(pageImports.SuperAdmin);
const Pricing = lazy(pageImports.Pricing);
const Trash = lazy(pageImports.Trash);
const SignContract = lazy(pageImports.SignContract);
const Lotissements = lazy(pageImports.Lotissements);
const LotissementDetails = lazy(pageImports.LotissementDetails);
const VentesImmobilieres = lazy(pageImports.VentesImmobilieres);
const VenteImmobiliereDetails = lazy(pageImports.VenteImmobiliereDetails);
const BienVenteDetails = lazy(pageImports.BienVenteDetails);

// Preload all pages in background after initial render
function usePreloadPages() {
  useEffect(() => {
    const preload = () => {
      Object.values(pageImports).forEach((importFn) => {
        importFn().catch(() => {/* ignore preload errors */});
      });
    };
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preload);
    } else {
      setTimeout(preload, 2000);
    }
  }, []);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh, no refetch on mount
      gcTime: 30 * 60 * 1000, // 30 minutes - keep unused data in cache
      refetchOnWindowFocus: false, // Don't refetch every time user returns to tab
      retry: 1, // Reduce retries for faster failure
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => {
  usePreloadPages();
  
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
            <InactivityHandler />
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/" element={<Pricing />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  
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
                  <Route path="/lotissements" element={<ProtectedRoute><FeatureProtectedRoute feature="lotissement"><Lotissements /></FeatureProtectedRoute></ProtectedRoute>} />
                  <Route path="/lotissements/:id" element={<ProtectedRoute><FeatureProtectedRoute feature="lotissement"><LotissementDetails /></FeatureProtectedRoute></ProtectedRoute>} />
                  <Route path="/ventes-immobilieres" element={<ProtectedRoute><FeatureProtectedRoute feature="ventes_immobilieres"><VentesImmobilieres /></FeatureProtectedRoute></ProtectedRoute>} />
                  <Route path="/ventes-immobilieres/:id" element={<ProtectedRoute><FeatureProtectedRoute feature="ventes_immobilieres"><BienVenteDetails /></FeatureProtectedRoute></ProtectedRoute>} />
                  <Route path="/ventes-immobilieres/vente/:id" element={<ProtectedRoute><FeatureProtectedRoute feature="ventes_immobilieres"><VenteImmobiliereDetails /></FeatureProtectedRoute></ProtectedRoute>} />
                  <Route path="/super-admin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/sign-contract" element={<SignContract />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
