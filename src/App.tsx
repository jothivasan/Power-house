import React, { useState, useEffect, createContext, useContext } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { supabase, isConfigured } from "./services/supabase";
import { AuthUser } from "./types";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import TradeList from "./pages/TradeList";
import AddTrade from "./pages/AddTrade";
import TradeDetail from "./pages/TradeDetail";
import AccountsPage from "./pages/Accounts";
import CalendarPage from "./pages/Calendar";
import SettingsPage from "./pages/Settings";

const AUTH_STORAGE_KEY = "powerhouse_auth_user";

// Auth Context
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const ConfigWarning: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-black p-6 text-center">
    <div className="max-w-md p-8 rounded-none border border-white">
      <div className="text-4xl mb-4">⚙️</div>
      <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">
        Configuration Required
      </h2>
      <p className="text-zinc-400 text-sm mb-6">
        Supabase credentials are missing. Check supabase.ts.
      </p>
      <div className="bg-zinc-900 p-4 rounded-none text-left text-xs font-mono text-zinc-400 overflow-x-auto border border-zinc-800">
        SUPABASE_URL=...
        <br />
        SUPABASE_ANON_KEY=...
      </div>
    </div>
  </div>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: "DASHBOARD", path: "/dashboard", icon: "◆" },
    { label: "ACCOUNTS", path: "/accounts", icon: "$" },
    { label: "TRADES", path: "/trades", icon: "≡" },
    { label: "CALENDAR", path: "/calendar", icon: "▦" },
    { label: "SETTINGS", path: "/settings", icon: "⊙" },
  ];

  return (
    <div className="flex min-h-screen bg-black text-white flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-black sticky top-0 z-50">
        <h1 className="text-xl font-black tracking-tighter italic">
          POWERHOUSE
        </h1>
        <div className="text-[10px] font-black uppercase text-zinc-500 truncate max-w-[150px]">
          TERMINAL_ACTIVE
        </div>
      </header>

      {/* Sidebar - Desktop */}
      <aside className="w-64 border-r border-zinc-800 p-8 flex-col hidden md:flex sticky top-0 h-screen bg-black overflow-y-auto">
        <div className="mb-12">
          <h1 className="text-2xl font-black tracking-tighter italic">
            POWERHOUSE
          </h1>
          <div className="h-1 w-12 bg-white mt-1"></div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-0 py-2 transition-all ${
                location.pathname === item.path
                  ? "text-white font-black translate-x-2"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              <span className="text-[10px]">{item.icon}</span>
              <span className="text-xs font-bold uppercase tracking-widest">
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="pt-8 mt-auto border-t border-zinc-900 space-y-6">
          <button
            onClick={() => signOut().then(() => navigate("/login"))}
            className="flex items-center space-x-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
          >
            <span>LOGOUT_SESSION</span>
          </button>
        </div>
      </aside>

      {/* Mobile Nav - Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white z-50">
        <div className="flex items-center justify-around px-4 py-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-center w-12 h-12 transition-all ${
                location.pathname === item.path
                  ? "text-white scale-110"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <span className="text-2xl leading-none">{item.icon}</span>
            </Link>
          ))}
          <button
            onClick={() => signOut().then(() => navigate("/login"))}
            className="flex items-center justify-center w-12 h-12 text-zinc-600 hover:text-zinc-400 transition-all"
          >
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 relative">
        <div className="max-w-7xl mx-auto p-6 md:p-12">{children}</div>
      </main>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();

  if (loading && !user)
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="h-8 w-8 border-2 border-white animate-pulse"></div>
      </div>
    );

  if (!user && !loading) return <Navigate to="/login" replace />;

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Attempt to hydrate from localStorage for instant-load feel
    const cached = localStorage.getItem(AUTH_STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await (supabase.auth as any).getSession();
        const authUser = session?.user
          ? { id: session.user.id, email: session.user.email || "" }
          : null;

        setUser(authUser);
        if (authUser) {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      } catch (err) {
        console.error("Supabase session fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = (supabase.auth as any).onAuthStateChange(
      (_event: any, session: any) => {
        const authUser = session?.user
          ? { id: session.user.id, email: session.user.email || "" }
          : null;
        setUser(authUser);

        if (authUser) {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (!isConfigured) return <ConfigWarning />;

  const handleSignOut = async () => {
    await (supabase.auth as any).signOut();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut: handleSignOut }}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <AccountsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trades"
            element={
              <ProtectedRoute>
                <TradeList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-trade"
            element={
              <ProtectedRoute>
                <AddTrade />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trade/:id"
            element={
              <ProtectedRoute>
                <TradeDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;
