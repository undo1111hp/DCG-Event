import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdminRoute } from './components/AdminRoute';
import { OrganizerOrAdminRoute } from './components/OrganizerOrAdminRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminPage } from './pages/AdminPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { EventFormPage } from './pages/EventFormPage';
import { EventStatsPage } from './pages/EventStatsPage';
import { DashboardPage } from './pages/DashboardPage';
import { AccountPage } from './pages/AccountPage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<EventsPage />} />
        <Route path="/events/:event_id" element={<EventDetailPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-tickets"
          element={
            <ProtectedRoute>
              <MyTicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/events/stats"
          element={
            <OrganizerOrAdminRoute>
              <EventStatsPage />
            </OrganizerOrAdminRoute>
          }
        />
        <Route
          path="/events/new"
          element={
            <OrganizerOrAdminRoute>
              <EventFormPage mode="create" />
            </OrganizerOrAdminRoute>
          }
        />
        <Route
          path="/events/:event_id/edit"
          element={
            <OrganizerOrAdminRoute>
              <EventFormPage mode="edit" />
            </OrganizerOrAdminRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
