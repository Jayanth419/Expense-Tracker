import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  History,
  PieChart,
  Users,
  Compass,
  Scale,
  Handshake,
  LogOut,
  Wallet,
} from "lucide-react";

export default function Nav({ user, handleLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/home", label: "Home", icon: Home },
    { path: "/monthly", label: "Monthly", icon: PieChart },
    { path: "/history", label: "History", icon: History },
    { path: "/contacts", label: "Contacts", icon: Users },
    { path: "/groups", label: "Groups", icon: Compass },
    { path: "/balances", label: "Balances", icon: Scale },
    { path: "/settlements", label: "Settlements", icon: Handshake },
  ];

  const userEmail = user?.email || "";
  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    userEmail.split("@")[0] ||
    "User";
  const userAvatar =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <>
      {/* Top Main Navigation Bar - Vibrant Blue Theme */}
      <header className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Desktop & Tablet Layout (>= 768px) */}
          <div className="hidden md:flex items-center justify-between h-16">
            {/* Brand Title */}
            <div
              onClick={() => navigate("/home")}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <span className="text-xl font-black tracking-tight text-white">
                Expense-Tracker
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <div className="flex items-center gap-1.5 lg:gap-2">
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                      isActive
                        ? "bg-white/25 text-white font-bold shadow-2xs"
                        : "text-white/90 hover:text-white hover:bg-white/15"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* User Info & Red Logout Pill Button */}
            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-white/90">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="w-7 h-7 rounded-full border border-white/40 object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-xs">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[100px] truncate">{userName}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold px-4 py-1.5 rounded-md transition shadow-2xs hover:shadow cursor-pointer active:scale-95"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile Layout (< 768px) Matching User's Screenshot */}
          <div className="md:hidden py-3 space-y-2.5">
            {/* Centered Brand Title */}
            <div className="text-center">
              <span
                onClick={() => navigate("/home")}
                className="text-lg font-black tracking-tight text-white cursor-pointer"
              >
                Expense-Tracker
              </span>
            </div>

            {/* Horizontal Scrollable Navigation Links + Logout Button */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
              <div className="flex items-center gap-1.5 shrink-0">
                {navItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition whitespace-nowrap ${
                        isActive
                          ? "bg-white/25 text-white font-extrabold"
                          : "text-white/90 hover:text-white hover:bg-white/15"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {/* Red Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1 rounded-md transition shrink-0 cursor-pointer active:scale-95 shadow-2xs"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar for Quick One-Thumb Access */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg text-[10px] font-bold transition ${
                isActive
                  ? "text-blue-600 font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? "text-blue-600 stroke-[2.5]" : "text-slate-400"
                }`}
              />
              <span className="truncate max-w-[48px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
