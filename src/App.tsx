import { useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Payment from "./pages/Payment";
import SetupBinance from "./pages/SetupBinance";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import SecuritySettings from "./pages/SecuritySettings";
import Admin from "./pages/Admin";
import NotificationHistory from "./pages/NotificationHistory";
import NotFound from "./pages/NotFound";

const App = () => {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/setup-binance" element={<SetupBinance />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/security" element={<SecuritySettings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/notifications" element={<NotificationHistory />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
