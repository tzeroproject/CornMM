import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { HomePage } from './pages/HomePage';
import { TrendingPage } from './pages/TrendingPage';
import { LatestPage } from './pages/LatestPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { SearchPage } from './pages/SearchPage';
import { WatchPage } from './pages/WatchPage';
import { CreatorProfilePage } from './pages/CreatorProfilePage';
import { UploadPage } from './pages/UploadPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { EditVideoPage } from './pages/EditVideoPage';
import { WatchHistoryPage } from './pages/WatchHistoryPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { TermsPage, PrivacyPage, DmcaPage, GuidelinesPage, ContactPage } from './pages/LegalPages';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="trending" element={<TrendingPage />} />
              <Route path="latest" element={<LatestPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="watch/:id" element={<WatchPage />} />
              <Route path="creator/:username" element={<CreatorProfilePage />} />
              <Route path="upload" element={<UploadPage />} />
              <Route path="dashboard" element={<UserDashboardPage />} />
              <Route path="edit/:id" element={<EditVideoPage />} />
              <Route path="history" element={<WatchHistoryPage />} />
              <Route path="favorites" element={<FavoritesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="admin" element={<AdminDashboardPage />} />
              <Route path="corn-admin-login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="dmca" element={<DmcaPage />} />
              <Route path="guidelines" element={<GuidelinesPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
};

export default App;
