import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Nav from "./Nav";
import Home from "./Home";
import Monthly from "./Monthly";
import History from "./History";
import Login from "./LoginForm";
import toast, { Toaster } from "react-hot-toast";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);

      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
    }
    getUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Logged out successfully!");
    setUser(null);
  }

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center">
        Loading...
      </div>
    );

  return (
    <Router>
      <Toaster position="top-center" />

      {user && <Nav handleLogout={handleLogout} />}

      <main className="max-w-5xl mx-auto px-4 mt-6">
        <Routes>
          {!user && <Route path="*" element={<Login />} />}
          {user && (
            <>
              <Route path="/home" element={<Home />} />
              <Route path="/monthly" element={<Monthly />} />
              <Route path="/history" element={<History />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </>
          )}
        </Routes>
      </main>
    </Router>
  );
}
