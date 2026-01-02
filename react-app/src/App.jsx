import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import PaymentRequest from './pages/PaymentRequest';
import InvoiceGenerator from './pages/InvoiceGenerator';
import WorkOrders from './pages/WorkOrders';
import VendorDashboard from './pages/VendorDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/payment-request" element={<PaymentRequest />} />
        <Route path="/invoice-generator" element={<InvoiceGenerator />} />
        <Route path="/work-orders" element={<WorkOrders />} />
        <Route path="/vendor-dashboard" element={<VendorDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
