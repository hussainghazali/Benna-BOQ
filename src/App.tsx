import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import AuthPage from "@/pages/AuthPage";
import WelcomePage from "@/pages/WelcomePage";
import BuildProjectPage from "@/pages/BuildProjectPage";
import BOQProjectsPage from "@/pages/BOQProjectsPage";
import BOQProjectDetailPage from "@/pages/BOQProjectDetailPage";
import CreditsPage from "@/pages/CreditsPage";

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/build-project" replace />} />
                <Route path="/build-project" element={<BuildProjectPage />} />
                <Route path="/boq-projects" element={<BOQProjectsPage />} />
                <Route path="/boq-projects/:projectId" element={<BOQProjectDetailPage />} />
                <Route path="/credits" element={<CreditsPage />} />
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/login" element={<AuthPage mode="login" />} />
                <Route path="/register" element={<AuthPage mode="register" />} />
                <Route path="*" element={<Navigate to="/build-project" replace />} />
              </Routes>
              <Toaster richColors position="top-center" />
            </BrowserRouter>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
