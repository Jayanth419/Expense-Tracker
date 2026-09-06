import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import toast from "react-hot-toast";
import { Wallet, Mail, Lock, LogIn } from "lucide-react";

export default function LoginForm({
  email: propEmail,
  setEmail: propSetEmail,
  password: propPassword,
  setPassword: propSetPassword,
}) {
  const [localEmail, setLocalEmail] = useState("");
  const [localPassword, setLocalPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const email = propEmail !== undefined ? propEmail : localEmail;
  const setEmail = propSetEmail || setLocalEmail;
  const password = propPassword !== undefined ? propPassword : localPassword;
  const setPassword = propSetPassword || setLocalPassword;

  // Google login handler
  const handleGoogleLogin = async () => {
    const redirectUrl = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl },
    });
    if (error) {
      toast.error("Google login failed: " + error.message);
    } else {
      toast.success("Redirecting to Google login...");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error(
        "No account found with this email. Please sign in with Google or check your credentials.",
      );
      return;
    }

    toast.success("Login successful");
  };

  return (
    <div className="max-w-md mx-auto my-8 p-8 bg-white rounded-3xl shadow-md border border-slate-200 space-y-6 animate-fadeIn">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-sm">
          <Wallet className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Welcome Back</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Sign in to access your personal and shared expenses
        </p>
      </div>

      {/* Google OAuth Login */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-3 rounded-xl border border-slate-300 shadow-2xs transition transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
          />
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
          />
          <path
            fill="#FBBC05"
            d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
          />
          <path
            fill="#34A853"
            d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
          />
        </svg>
        Sign in with Google
      </button>

      <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">
        <div className="flex-1 h-px bg-slate-200"></div>
        <span>or sign in with email</span>
        <div className="flex-1 h-px bg-slate-200"></div>
      </div>

      {/* Email/Password Login */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="name@example.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-sm transition transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer text-sm"
        >
          <LogIn className="w-4 h-4" />
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
