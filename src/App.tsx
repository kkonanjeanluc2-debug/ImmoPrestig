import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import PropertyDetails from "./pages/PropertyDetails";
import Owners from "./pages/Owners";
import OwnerDetails from "./pages/OwnerDetails";
import Tenants from "./pages/Tenants";
import TenantDetails from "./pages/TenantDetails";
import Payments from "./pages/Payments";
import Documents from "./pages/Documents";
import AdvancedDashboard from "./pages/AdvancedDashboard";
import Settings from "./pages/Settings";
import Install from "./pages/Install";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><AdvancedDashboard /></ProtectedRoute>} />
            <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
            <Route path="/properties/:id" element={<ProtectedRoute><PropertyDetails /></ProtectedRoute>} />
            <Route path="/owners" element={<ProtectedRoute><Owners /></ProtectedRoute>} />
            <Route path="/owners/:id" element={<ProtectedRoute><OwnerDetails /></ProtectedRoute>} />
            <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
            <Route path="/tenants/:id" element={<ProtectedRoute><TenantDetails /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/install" element={<Install />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
