import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import Nav from "./Nav";
import Home from "./Home";
import Monthly from "./Monthly";
import History from "./History";
import LoginForm from "./LoginForm";
import toast from "react-hot-toast";
import { useEffect } from "react";

async function fetchSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export default function App() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["userSession"],
    queryFn: fetchSession,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      toast.success("Logged out successfully!");
      queryClient.invalidateQueries({ queryKey: ["userSession"] });
    },
    onError: (error) => toast.error("Logout failed: " + error.message),
  });

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ["userSession"] });
    });
    return () => listener.subscription.unsubscribe();
  }, [queryClient]);

  function handleLogout() {
    mutation.mutate();
  }

  if (isLoading)
    return (
      <div className="min-h-screen flex justify-center items-center">
        Loading...
      </div>
    );

  return (
    <Router>
      {user && <Nav handleLogout={handleLogout} />}

      <main className="max-w-5xl mx-auto px-4 mt-6">
        <Routes>
          {!user && <Route path="*" element={<LoginForm />} />}
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
