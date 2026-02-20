import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import PaymentRequest from './pages/PaymentRequest';
import InvoiceGenerator from './pages/InvoiceGenerator';
import BillGenerator from './pages/BillGenerator';
import WorkOrders from './pages/WorkOrders';
import VendorDashboard from './pages/VendorDashboard';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import ProjectOverview from './pages/ProjectOverview';
import GeneralManager from './pages/GeneralManager';
import ApprovedPayments from './pages/ApprovedPayments';
import EmployeeRegistration from './pages/EmployeeRegistration';
import PayrollPage from './pages/PayrollPage';
import SalarySlip from './pages/SalarySlip';
import HRDashboard from './pages/HRDashboard';
import EmployeeList from './pages/EmployeeList';
import PayrollHistory from './pages/PayrollHistory';
import { MessageProvider } from './context/MessageContext';

function App() {
  return (
    <AuthProvider>
      <MessageProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute module="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/payment-request" element={<ProtectedRoute module="payment"><PaymentRequest /></ProtectedRoute>} />
            <Route path="/invoice-generator" element={<ProtectedRoute module="invoice"><InvoiceGenerator /></ProtectedRoute>} />
            <Route path="/bill-generator" element={<ProtectedRoute module="bill"><BillGenerator /></ProtectedRoute>} />
            <Route path="/work-orders" element={<ProtectedRoute module="workorders"><WorkOrders /></ProtectedRoute>} />
            <Route path="/vendor-dashboard" element={<ProtectedRoute module="vendor"><VendorDashboard /></ProtectedRoute>} />
            <Route path="/project-overview" element={<ProtectedRoute module="overview"><ProjectOverview /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute module="history"><HistoryPage /></ProtectedRoute>} />
            <Route path="/gm" element={<ProtectedRoute module="gm"><GeneralManager /></ProtectedRoute>} />
            <Route path="/approved-payments" element={<ProtectedRoute module="approved_payments"><ApprovedPayments /></ProtectedRoute>} />
            <Route path="/hr-dashboard" element={<ProtectedRoute module="hr"><HRDashboard /></ProtectedRoute>} />
            <Route path="/employee-registration" element={<ProtectedRoute module="hr"><EmployeeRegistration /></ProtectedRoute>} />
            <Route path="/employee-list" element={<ProtectedRoute module="hr"><EmployeeList /></ProtectedRoute>} />
            <Route path="/payroll" element={<ProtectedRoute module="hr"><PayrollPage /></ProtectedRoute>} />
            <Route path="/payroll-history" element={<ProtectedRoute module="hr"><PayrollHistory /></ProtectedRoute>} />
            <Route path="/salary-slip/:id" element={<ProtectedRoute module="hr"><SalarySlip /></ProtectedRoute>} />
          </Routes>
        </Router>
      </MessageProvider>
    </AuthProvider>
  );
}

export default App;
