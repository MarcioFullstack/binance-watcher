import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AuthLayout } from "@/components/AuthLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Payment from "./pages/Payment";
import SetupBinance from "./pages/SetupBinance";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import NotificationHistory from "./pages/NotificationHistory";
import AlertHistory from "./pages/AlertHistory";
import Install from "./pages/Install";
import ForceLogout from "./pages/ForceLogout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <InstallPrompt />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/payment" element={<AuthLayout><Payment /></AuthLayout>} />
            <Route path="/setup-binance" element={<AuthLayout><SetupBinance /></AuthLayout>} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<AuthLayout><Settings /></AuthLayout>} />
            <Route path="/security" element={<AuthLayout><Dashboard /></AuthLayout>} />
            <Route path="/admin" element={<AuthLayout><Admin /></AuthLayout>} />
            <Route path="/notifications" element={<AuthLayout><NotificationHistory /></AuthLayout>} />
            <Route path="/alert-history" element={<AuthLayout><AlertHistory /></AuthLayout>} />
            <Route path="/install" element={<AuthLayout showTimer={false}><Install /></AuthLayout>} />
            <Route path="/force-logout" element={<ForceLogout />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
