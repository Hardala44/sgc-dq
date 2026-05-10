import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClinicProvider } from './context/ClinicContext';
import Layout from './components/Layout';
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
import { ProtectedRoute } from './components/ProtectedRoute';

// Admin-only guard
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClinicProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/catalogo" element={<Catalogo />} />
                <Route path="/buscar" element={<MarketplaceSearch />} />
                <Route path="/producto/:id" element={<ProductoDetalle />} />
                <Route path="/dashboard" element={<DashboardAnalytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/legacy-dashboard" element={<CuadroMando />} />
                <Route path="/puntos" element={<MisPuntos />} />
                <Route path="/proveedores" element={<Proveedores />} />
                <Route path="/proveedores/:id" element={<ProveedorDetalle />} />
                <Route path="/admin" element={
                  <AdminRoute>
                    <AdminHub />
                  </AdminRoute>
                } />
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
