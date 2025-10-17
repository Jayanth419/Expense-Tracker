import { Link, useNavigate } from "react-router-dom";

export default function Nav({ handleLogout }) {
  const navigate = useNavigate();

  return (
    <nav className="bg-blue-600 text-white p-4 flex flex-col sm:flex-row justify-between items-center shadow-md">
      <div className="flex items-center mb-2 sm:mb-0 space-x-4">
        <h1
          onClick={() => navigate("/home")}
          className="text-2xl font-bold cursor-pointer"
        >
          Expense-Tracker
        </h1>
      </div>

      <div className="flex flex-row sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <Link
          to="/home"
          className="px-3 py-1 rounded hover:bg-blue-600 transition-colors"
        >
          Home
        </Link>
        <Link
          to="/monthly"
          className="px-3 py-1 rounded hover:bg-blue-600 transition-colors"
        >
          Monthly
        </Link>
        <Link
          to="/history"
          className="px-3 py-1 rounded hover:bg-blue-600 transition-colors"
        >
          History
        </Link>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
