// import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
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
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            </Route>
          </Route>
        </Routes>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
