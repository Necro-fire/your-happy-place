import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccentColorProvider } from "@/contexts/AccentColorContext";
import { OrdersProvider } from "@/contexts/OrdersContext";
import { CompanySettingsProvider } from "@/contexts/CompanySettingsContext";
import { ChecklistProblemsProvider } from "@/contexts/ChecklistProblemsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import OrdersPage from "@/pages/OrdersPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import FinancialPage from "@/pages/FinancialPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import ChecklistManagementPage from "@/pages/ChecklistManagementPage";
import ClientsPage from "@/pages/ClientsPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AccentColorProvider>
        <CompanySettingsProvider>
          <OrdersProvider>
            <ChecklistProblemsProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/registro" element={<RegisterPage />} />
                    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/ordens" element={<OrdersPage />} />
                      <Route path="/ordens/:id" element={<OrderDetailPage />} />
                      <Route path="/checklist" element={<ChecklistManagementPage />} />
                      <Route path="/clientes" element={<ClientsPage />} />
                      <Route path="/financeiro" element={<FinancialPage />} />
                      <Route path="/relatorios" element={<ReportsPage />} />
                      <Route path="/configuracoes" element={<SettingsPage />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </ChecklistProblemsProvider>
          </OrdersProvider>
        </CompanySettingsProvider>
      </AccentColorProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
