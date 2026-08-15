import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { FreelaSignupPage } from './pages/FreelaSignupPage';
import { FreelasPage } from './pages/FreelasPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="cadastro-freela" element={<FreelaSignupPage />} />
          <Route path="freelas" element={<FreelasPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
