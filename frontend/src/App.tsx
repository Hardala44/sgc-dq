import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClinicProvider } from './context/ClinicContext';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Catalogo from './pages/Catalogo';
import MarketplaceSearch from './pages/MarketplaceSearch';
import ProductoDetalle from './pages/ProductoDetalle';
import CuadroMando from './pages/CuadroMando';
import MisPuntos from './pages/MisPuntos';
import Proveedores from './pages/Proveedores';
import ProveedorDetalle from './pages/ProveedorDetalle';
import DashboardAnalytics from './pages/DashboardAnalytics';
import Settings from './pages/Settings';
import AdminHub from './pages/AdminHub';
import AdminDashboard from './pages/AdminDashboard';
import AdminClinicas from './pages/AdminClinicas';
import AdminMarketplace from './pages/AdminMarketplace';
import AdminProveedores from './pages/AdminProveedores';
import AdminFidelizacion from './pages/AdminFidelizacion';
import AdminPeticiones from './pages/AdminPeticiones';
import AdminOfertas from './pages/AdminOfertas';
import { ProtectedRoute } from './components/ProtectedRoute';

// Guard: must be authenticated AND admin_dq
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Redirect admin_dq away from the regular home
const HomeOrAdmin = () => {
  const { isAdmin } = useAuth();
  return isAdmin ? <Navigate to="/admin/inicio" replace /> : <Home />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClinicProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* ── Admin experience (AdminLayout, dark control sidebar) ── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route path="/admin" element={<Navigate to="/admin/inicio" replace />} />
                <Route path="/admin/inicio"        element={<AdminDashboard />} />
                <Route path="/admin/clinicas"      element={<AdminClinicas />} />
                <Route path="/admin/marketplace"   element={<AdminMarketplace />} />
                <Route path="/admin/proveedores"   element={<AdminProveedores />} />
                <Route path="/admin/fidelizacion"  element={<AdminFidelizacion />} />
                <Route path="/admin/peticiones"    element={<AdminPeticiones />} />
                <Route path="/admin/ofertas"        element={<AdminOfertas />} />
                {/* Legacy admin hub */}
                <Route path="/admin/hub"           element={<AdminHub />} />
              </Route>
            </Route>

            {/* ── Standard user experience (collapsible sidebar) ── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/"           element={<HomeOrAdmin />} />
                <Route path="/catalogo"   element={<Catalogo />} />
                <Route path="/buscar"     element={<MarketplaceSearch />} />
                <Route path="/producto/:id" element={<ProductoDetalle />} />
                <Route path="/dashboard"  element={<DashboardAnalytics />} />
                <Route path="/settings"   element={<Settings />} />
                <Route path="/legacy-dashboard" element={<CuadroMando />} />
                <Route path="/puntos"     element={<MisPuntos />} />
                <Route path="/proveedores" element={<Proveedores />} />
                <Route path="/proveedores/:id" element={<ProveedorDetalle />} />
              </Route>
            </Route>
          </Routes>
          <Toaster position="top-right" />
        </ClinicProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
