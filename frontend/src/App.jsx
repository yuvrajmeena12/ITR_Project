import { lazy, Suspense } from 'react';
import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { Spinner } from './components/ui';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const MySkills = lazy(() => import('./pages/MySkills'));
const Explore = lazy(() => import('./pages/Explore'));
const SmartMatch = lazy(() => import('./pages/SmartMatch'));
const MySwaps = lazy(() => import('./pages/MySwaps'));
const Chat = lazy(() => import('./pages/Chat'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));

function Layout() {
  return (
    <>
      <a href="#main" className="sr-only">Skip to content</a>
      <Navbar />
      <main id="main">
        <Suspense fallback={<div className="state" style={{ minHeight: '50vh', justifyContent: 'center' }}><Spinner large /></div>}>
          <Outlet />
        </Suspense>
      </main>
    </>
  );
}

function NotFound() {
  return (
    <div className="page page-narrow">
      <div className="state card">
        <h3>Page not found</h3>
        <p>The page you are looking for does not exist.</p>
        <Link to="/" className="btn btn-primary">Go home</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/skills" element={<MySkills />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/smart-match" element={<SmartMatch />} />
          <Route path="/swaps" element={<MySwaps />} />
          <Route path="/messages" element={<Chat />} />
          <Route path="/messages/:userId" element={<Chat />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<PublicProfile />} />
        </Route>
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
