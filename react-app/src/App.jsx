import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import PaymentRequest from './pages/PaymentRequest';
import InvoiceGenerator from './pages/InvoiceGenerator';
import WorkOrders from './pages/WorkOrders';
import VendorDashboard from './pages/VendorDashboard';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import ProjectOverview from './pages/ProjectOverview';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute module="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/payment-request" element={<ProtectedRoute module="payment"><PaymentRequest /></ProtectedRoute>} />
          <Route path="/invoice-generator" element={<ProtectedRoute module="invoice"><InvoiceGenerator /></ProtectedRoute>} />
          <Route path="/work-orders" element={<ProtectedRoute module="workorders"><WorkOrders /></ProtectedRoute>} />
          <Route path="/vendor-dashboard" element={<ProtectedRoute module="vendor"><VendorDashboard /></ProtectedRoute>} />
          <Route path="/project-overview" element={<ProtectedRoute module="overview"><ProjectOverview /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute module="history"><HistoryPage /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
