import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import HRLayout from './pages/HRLayout';
import EmployeeList from './pages/EmployeeList';
import PayrollHistory from './pages/PayrollHistory';
import WagesPage from './pages/WagesPage';
import AccountsDashboard from './pages/AccountsDashboard';
import PettyCashLayout from './pages/PettyCashLayout';
import PettyCashDashboard from './pages/PettyCashDashboard';
import PettyCashEntry from './pages/PettyCashEntry';
import PettyCashHistory from './pages/PettyCashHistory';
import PettyCashDetail from './pages/PettyCashDetail';
import PettyCashPersonEntry from './pages/PettyCashPersonEntry';
import PettyCashPersonList from './pages/PettyCashPersonList';
import PettyCashMasterSheet from './pages/PettyCashMasterSheet';
import MDDashboard from './pages/MDDashboard';
import MDLayout from './pages/MDLayout';
import ProjectStatusDashboard from './pages/ProjectStatusDashboard';
import ProjectStatusLayout from './pages/ProjectStatusLayout';
import ProjectEntry from './pages/ProjectEntry';
import ProjectStatusUpdate from './pages/ProjectStatusUpdate';
import ProjectPersonnel from './pages/ProjectPersonnel';
import SubVendorChecklist from './pages/SubVendorChecklist';
import SubVendorChecklistHistory from './pages/SubVendorChecklistHistory';
import SignUpPage from './pages/SignUpPage';
import DesignTeamWorkflow from './pages/DesignTeamWorkflow';
import FinishesList from './pages/FinishesList';
import LaborPortal from './pages/LaborPortal';
import MasterRegister from './pages/MasterRegister';
import AssistantBot from './components/AssistantBot';
import { MessageProvider } from './context/MessageContext';
import NetworkStatus from './components/NetworkStatus';
import FeedbackSystem from './components/ui/FeedbackSystem';
import NotificationListener from './components/ui/NotificationListener';


function App() {
  return (
    <AuthProvider>
      <MessageProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
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
            <Route path="/hr" element={<ProtectedRoute module="hr"><HRLayout /></ProtectedRoute>}>
              <Route index element={<HRDashboard />} />
              <Route path="registration" element={<EmployeeRegistration />} />
              <Route path="directory" element={<EmployeeList />} />
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="history" element={<PayrollHistory />} />
            </Route>
            <Route path="/salary-slip/:id" element={<ProtectedRoute module="hr"><SalarySlip /></ProtectedRoute>} />
            <Route path="/wages" element={<ProtectedRoute module="wages"><WagesPage /></ProtectedRoute>} />
            <Route path="/md" element={<ProtectedRoute module="md"><MDLayout /></ProtectedRoute>}>
              <Route index element={<MDDashboard />} />
              <Route path="petty-cash" element={<MDDashboard />} />
              <Route path="project-dashboard" element={<ProjectStatusDashboard />} />
              <Route path="history" element={<PettyCashHistory />} />
              <Route path="view/:id" element={<PettyCashDetail />} />
            </Route>
            <Route path="/accounts" element={<ProtectedRoute module="accounts"><AccountsDashboard /></ProtectedRoute>} />
            <Route path="/accounts/petty-cash" element={<ProtectedRoute module="accounts"><PettyCashLayout /></ProtectedRoute>}>
              <Route index element={<PettyCashDashboard />} />
              <Route path="entry" element={<PettyCashEntry />} />
              <Route path="history" element={<PettyCashHistory />} />
              <Route path="master-sheet" element={<PettyCashMasterSheet />} />
              <Route path="persons" element={<PettyCashPersonList />} />
              <Route path="persons/new" element={<PettyCashPersonEntry />} />
              <Route path="view/:id" element={<PettyCashDetail />} />
              <Route path="edit/:id" element={<PettyCashEntry />} />
            </Route>
            <Route path="/project-status" element={<ProjectStatusLayout />}>
              <Route index element={<ProtectedRoute module="project_entry"><ProjectEntry /></ProtectedRoute>} />
              <Route path="entry" element={<ProtectedRoute module="project_entry"><ProjectEntry /></ProtectedRoute>} />
              <Route path="update" element={<ProtectedRoute module="project_status"><ProjectStatusUpdate /></ProtectedRoute>} />
              <Route path="personnel/:role" element={<ProtectedRoute module="project_entry"><ProjectPersonnel /></ProtectedRoute>} />
              <Route path="finishes" element={<ProtectedRoute module="project_entry"><FinishesList /></ProtectedRoute>} />
            </Route>
            <Route path="/sub-vendor-checklist" element={<ProtectedRoute module="sub_vendor_checklist"><SubVendorChecklist /></ProtectedRoute>} />
            <Route path="/sub-vendor-checklist/history" element={<ProtectedRoute module="sub_vendor_checklist"><SubVendorChecklistHistory /></ProtectedRoute>} />
            <Route path="/design-team" element={<ProtectedRoute module="design_team_workflow"><DesignTeamWorkflow /></ProtectedRoute>} />
            <Route path="/master-register" element={<ProtectedRoute module="register"><MasterRegister /></ProtectedRoute>} />
            
            {/* Labor Portal - No standard admin auth required */}
            <Route path="/portal" element={<LaborPortal />} />
          </Routes>
          <AssistantBotWrapper />
          <NetworkStatus />
          <FeedbackSystem />
          <NotificationListener />
        </Router>
      </MessageProvider>

    </AuthProvider>
  );
}

const AssistantBotWrapper = () => {
  const location = useLocation();
  const { user } = useAuth();
  const hidePaths = ['/login', '/signup'];
  
  if (hidePaths.includes(location.pathname)) return null;
  
  // Enforce Bot Access Permission
  if (user) {
    if (!user.is_admin && !user.permissions?.includes('bot_access')) {
        return null;
    }
  } else {
    return null; // Hide if not logged in
  }

  return <AssistantBot />;
};

export default App;
