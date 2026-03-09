import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/layouts/AppLayout';
import { AuthPage } from '@/pages/AuthPage';
import { BoxesPage } from '@/pages/BoxesPage';
import { CompleteProfilePage } from '@/pages/CompleteProfilePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { LandingPage } from '@/pages/LandingPage';
import { RankingPage } from '@/pages/RankingPage';
import { RebirthPage } from '@/pages/RebirthPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StatsPage } from '@/pages/StatsPage';
import { TradePage } from '@/pages/TradePage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute';
import { UsernameRequiredRoute } from '@/routes/UsernameRequiredRoute';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/auth" element={<AuthPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/complete-profile" element={<CompleteProfilePage />} />

          <Route element={<UsernameRequiredRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="boxes" element={<BoxesPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="ranking" element={<RankingPage />} />
              <Route path="trade" element={<TradePage />} />
              <Route path="rebirth" element={<RebirthPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
