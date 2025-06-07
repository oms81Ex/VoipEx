import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import Room from '@/pages/Room';
import Call from '@/pages/Call';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
      <Route
        path="/room/:roomId"
        element={
          <PrivateRoute>
            <Room />
          </PrivateRoute>
        }
      />
      <Route
        path="/call/:userId"
        element={
          <PrivateRoute>
            <Call />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
    </Routes>
  );
};

export default App; 