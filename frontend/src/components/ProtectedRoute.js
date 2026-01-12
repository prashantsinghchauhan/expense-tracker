import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_API_BASE_URL; // <-- Make sure this matches everywhere

// In development we completely bypass login and always treat the
// user as authenticated so you can go straight to the dashboard.
const DISABLE_AUTH =
  process.env.REACT_APP_DISABLE_AUTH === 'true' ||
  process.env.NODE_ENV === 'development';

function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(
    location.state?.user ? true : null
  );
  const [user, setUser] = useState(location.state?.user || null);
  const [loading, setLoading] = useState(location.state?.user ? false : true);

  useEffect(() => {
    // ===== DEV MODE: SKIP AUTH CHECKS ENTIRELY =====
    if (DISABLE_AUTH) {
      setUser({
        user_id: 'dev-user',
        email: 'dev@example.com',
        name: 'Dev User',
      });
      setIsAuthenticated(true);
      setLoading(false);
      return;
    }

    if (location.state?.user) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
          withCredentials: true,
        });
        if (response.status === 200) {
          setUser(response.data);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return React.cloneElement(children, { user });
}

export default ProtectedRoute;
