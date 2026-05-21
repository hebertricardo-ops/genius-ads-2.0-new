import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateCreative from "./pages/CreateCreative";
import CreateCarousel from "./pages/CreateCarousel";
import CreativeResults from "./pages/CreativeResults";
import CarouselResults from "./pages/CarouselResults";
import History from "./pages/History";
import Profile from "./pages/Profile";
import RegenerateCreative from "./pages/RegenerateCreative";
import PaymentSuccess from "./pages/PaymentSuccess";
import ChangePassword from "./pages/ChangePassword";
import AddCredits from "./pages/AddCredits";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import EmailConfirmation from "./pages/EmailConfirmation";
import AuthCallback from "./pages/AuthCallback";
import BrandSetup from "./pages/BrandSetup";
import BrandsManager from "./pages/BrandsManager";
import Subscription from "./pages/Subscription";
import SignUp from "./pages/SignUp";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import Calendario from "./pages/Calendario";
import SocialAccounts from "./pages/SocialAccounts";
import { BrandProvider } from "@/contexts/BrandContext";

const queryClient = new QueryClient();

const ProtectedWithLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <BrandProvider>
      <AppLayout>{children}</AppLayout>
    </BrandProvider>
  </ProtectedRoute>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-use" element={<TermsOfUse />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/email-confirmation" element={<EmailConfirmation />} />
            <Route path="/dashboard" element={<ProtectedWithLayout><Dashboard /></ProtectedWithLayout>} />
            <Route path="/create" element={<ProtectedWithLayout><CreateCreative /></ProtectedWithLayout>} />
            <Route path="/create-carousel" element={<ProtectedWithLayout><CreateCarousel /></ProtectedWithLayout>} />
            <Route path="/results/:requestId" element={<ProtectedWithLayout><CreativeResults /></ProtectedWithLayout>} />
            <Route path="/carousel-results/:requestId" element={<ProtectedWithLayout><CarouselResults /></ProtectedWithLayout>} />
            <Route path="/history" element={<ProtectedWithLayout><History /></ProtectedWithLayout>} />
            <Route path="/regenerate" element={<ProtectedWithLayout><RegenerateCreative /></ProtectedWithLayout>} />
            <Route path="/add-credits" element={<ProtectedWithLayout><AddCredits /></ProtectedWithLayout>} />
            <Route path="/profile" element={<ProtectedWithLayout><Profile /></ProtectedWithLayout>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
            <Route path="/brands" element={<ProtectedWithLayout><BrandsManager /></ProtectedWithLayout>} />
            <Route path="/brands/new" element={<ProtectedWithLayout><BrandSetup /></ProtectedWithLayout>} />
            <Route path="/brands/:id/edit" element={<ProtectedWithLayout><BrandSetup /></ProtectedWithLayout>} />
            <Route path="/subscription" element={<ProtectedWithLayout><Subscription /></ProtectedWithLayout>} />
            <Route path="/calendario" element={<ProtectedWithLayout><Calendario /></ProtectedWithLayout>} />
            <Route path="/social-accounts" element={<ProtectedWithLayout><SocialAccounts /></ProtectedWithLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
