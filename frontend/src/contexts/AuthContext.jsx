import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('tracker_token'));
  const [usuario, setUsuario] = useState(() => localStorage.getItem('tracker_user'));

  function login(tokenValue, usuarioValue) {
    localStorage.setItem('tracker_token', tokenValue);
    localStorage.setItem('tracker_user', usuarioValue);
    setToken(tokenValue);
    setUsuario(usuarioValue);
  }

  function logout() {
    localStorage.removeItem('tracker_token');
    localStorage.removeItem('tracker_user');
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ token, usuario, login, logout, autenticado: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
