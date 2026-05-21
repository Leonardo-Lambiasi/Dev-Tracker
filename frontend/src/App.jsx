import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Register from './pages/Register';
import History from './pages/History';
import Login from './pages/Login';

const linkStyle = {
  padding: '6px 14px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  color: '#94a3b8',
  transition: 'all 0.15s',
};

const activeLinkStyle = {
  ...linkStyle,
  background: 'var(--accent-bg)',
  color: '#e2e8f0',
};

function RotaProtegida({ children }) {
  const { autenticado } = useAuth();
  if (!autenticado) return <Navigate to="/login" replace />;
  return children;
}

function NavBar() {
  const { autenticado, usuario, logout } = useAuth();
  if (!autenticado) return null;
  return (
    <nav style={{
      background: '#1a1d27',
      borderBottom: '1px solid #2a2d3e',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 56,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0', marginRight: 16 }}>
        Dev Tracker
      </span>
      <NavLink to="/" end style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
        Dashboard
      </NavLink>
      <NavLink to="/registrar" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
        Registrar
      </NavLink>
      <NavLink to="/historico" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
        Histórico
      </NavLink>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>{usuario}</span>
        <button
          type="button"
          onClick={logout}
          style={{
            background: 'none', border: '1px solid #2a2d3e', borderRadius: 8,
            padding: '5px 14px', fontSize: 13, color: '#94a3b8', cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </div>
    </nav>
  );
}

function AppLayout() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <NavBar />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        <Routes>
          <Route path="/" element={<RotaProtegida><Home /></RotaProtegida>} />
          <Route path="/registrar" element={<RotaProtegida><Register /></RotaProtegida>} />
          <Route path="/historico" element={<RotaProtegida><History /></RotaProtegida>} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
