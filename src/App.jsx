import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import { POSPage } from './pages/POSPage'
import { InventoryPage } from './pages/InventoryPage'
import { SuppliersPage } from './pages/SuppliersPage'
import { ProductsPage } from './pages/ProductsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { PersonnelPage } from './pages/PersonnelPage'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage } from './pages/LoginPage'
import { OrdersPage } from './pages/OrdersPage'
import { KitchenPage } from './pages/KitchenPage'

import { CustomersPage } from './pages/CustomersPage'
import { CashRegisterPage } from './pages/CashRegisterPage'
import { UsersPage } from './pages/UsersPage'
import ReportsPage from './pages/ReportsPage'
import { SettingsProvider } from './context/SettingsContext'
import { DataProvider } from './context/DataContext'
import { AuthProvider, useAuth } from './context/AuthContext'

import ErrorBoundary from './components/ErrorBoundary'

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, hasPermission } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasPermission(requiredRole)) {
    return <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>
      <h2>Acceso Denegado</h2>
      <p>No tienes permisos para ver esta página.</p>
    </div>;
  }

  // Regla estricta para Cocina: Redirigir siempre a /kitchen si intentan ir a otro lado
  if (currentUser.role === 'kitchen' && !location.pathname.startsWith('/kitchen')) {
    return <Navigate to="/kitchen" replace />;
  }

  return children;
};

import EncryptionKeyPrompt from './components/EncryptionKeyPrompt'

function App() {
  const [isUnlocked, setIsUnlocked] = React.useState(false);

  if (!isUnlocked) {
    return <EncryptionKeyPrompt onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <DataProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route path="/" element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<POSPage />} />
                  <Route path="inventory" element={
                    <ProtectedRoute requiredRole="manager">
                      <InventoryPage />
                    </ProtectedRoute>
                  } />
                  <Route path="suppliers" element={
                    <ProtectedRoute requiredRole="manager">
                      <SuppliersPage />
                    </ProtectedRoute>
                  } />
                  <Route path="products" element={
                    <ProtectedRoute requiredRole="manager">
                      <ProductsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="personnel" element={
                    <ProtectedRoute requiredRole="admin">
                      <PersonnelPage />
                    </ProtectedRoute>
                  } />

                  <Route path="reports" element={
                    <ProtectedRoute requiredRole="manager">
                      <ReportsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="tables" element={<OrdersPage />} />
                  <Route path="kitchen" element={<KitchenPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="cash-register" element={
                    <ProtectedRoute requiredRole="manager">
                      <CashRegisterPage />
                    </ProtectedRoute>
                  } />
                  <Route path="settings" element={
                    <ProtectedRoute requiredRole="admin">
                      <SettingsPage />
                    </ProtectedRoute>
                  } />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </DataProvider>
      </SettingsProvider>
    </ErrorBoundary>
  )
}

export default App
