import React from "react";
import { supabase } from "./supabaseClient";
import toast from "react-hot-toast";

export default function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  handleLogin,
}) {
  // Google login handler
  const handleGoogleLogin = async () => {
    const redirectUrl = `https://expense-tracker-iota-fawn.vercel.app/`; // redirect back to your app
    // const redirectUrl = `http://localhost:5173/auth/callback`;
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

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md space-y-4">
      {/* Email/Password Login */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="flex flex-col">
          <label className="font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border px-3 py-2 rounded"
            placeholder="Enter email"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border px-3 py-2 rounded"
            placeholder="Enter password"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Login
        </button>
      </form>

      <div className="text-center text-gray-500">OR</div>

      {/* Google OAuth Login */}
      <button
        onClick={handleGoogleLogin}
        className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
      >
        Sign in with Google
      </button>
    </div>
  );
}
