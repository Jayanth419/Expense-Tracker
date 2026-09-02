import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import Nav from "./Nav";
import Home from "./Home";
import Monthly from "./Monthly";
import History from "./History";
import Contacts from "./pages/Contacts";
import Groups from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails";
import Balances from "./pages/Balances";
import Settlements from "./pages/Settlements";
import LoginForm from "./LoginForm";
import ErrorBoundary from "./components/common/ErrorBoundary";
import toast, { Toaster } from "react-hot-toast";

export default function App() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session from storage
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setIsLoading(false);
    });

    // 2. Listen for auth changes (login, logout, token refresh, OAuth redirect callback)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: ["userSession"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const user = session?.user ?? null;

  const mutation = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      setSession(null);
      toast.success("Logged out successfully!");
      queryClient.clear();
    },
    onError: (error) => toast.error("Logout failed: " + error.message),
  });

  function handleLogout() {
    mutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 text-slate-600 font-semibold gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading Expense Tracker...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 lg:pb-10">
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: "14px",
              background: "#1e293b",
              color: "#fff",
              fontSize: "13px",
              fontWeight: "600",
            },
          }}
        />
        <Router>
          {user && <Nav user={user} handleLogout={handleLogout} />}

          <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
            <Routes>
              {!user ? (
                <Route path="*" element={<LoginForm />} />
              ) : (
                <>
                  <Route path="/home" element={<Home />} />
                  <Route path="/monthly" element={<Monthly />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/groups" element={<Groups />} />
                  <Route path="/groups/:id" element={<GroupDetails />} />
                  <Route path="/balances" element={<Balances />} />
                  <Route path="/settlements" element={<Settlements />} />
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </>
              )}
            </Routes>
          </main>
        </Router>
      </div>
    </ErrorBoundary>
  );
}
