import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProjects from "./pages/AdminProjects";
import AdminTasks from "./pages/AdminTasks";
import UserDashboard from "./pages/UserDashboard";
import SalesDashboard from "./pages/SalesDashboard";
import WorklogHistory from "./pages/WorklogHistory";
import CalendarView from "./pages/CalendarView";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import { ResetPassword } from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AdminWorklogs from "./pages/AdminWorklogs";
import AdminEfficiency from "./pages/AdminEfficiency";
import AdminProjectEfficiency from "./pages/AdminProjectEfficiency";
import AdminVendors from "./pages/AdminVendors";
import UserManagement from "./pages/UserManagement";
import UserCalendarView from "./pages/UserCalendarView";
import AdminProfit from "./pages/AdminProfit";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected Admin Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/projects" 
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminProjects />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/tasks" 
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminTasks />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/worklogs" 
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminWorklogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute requiredRole="Admin">
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users/:userId/calendar" 
            element={
              <ProtectedRoute requiredRole="Admin">
                <UserCalendarView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/team-efficiency" 
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminEfficiency />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/project-efficiency" 
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminProjectEfficiency />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/vendors" 
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminVendors />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/profit" 
            element={
              <ProtectedRoute requiredRole="Admin">
                <AdminProfit />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected User Routes */}
          <Route 
            path="/user/dashboard" 
            element={
              <ProtectedRoute requiredRole="User">
                <UserDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/worklog-history" 
            element={
              <ProtectedRoute requiredRole="User">
                <WorklogHistory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/calendar" 
            element={
              <ProtectedRoute requiredRole="User">
                <CalendarView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/projects" 
            element={
              <ProtectedRoute requiredRole="User">
                <Projects />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/tasks" 
            element={
              <ProtectedRoute requiredRole="User">
                <Tasks />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/profile" 
            element={
              <ProtectedRoute requiredRole="User">
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/reports" 
            element={
              <ProtectedRoute requiredRole="User">
                <Reports />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected Sales Routes */}
          <Route 
            path="/sales/dashboard" 
            element={
              <ProtectedRoute requiredRole="Sales">
                <SalesDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
