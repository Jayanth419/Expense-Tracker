import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import { Eye } from "lucide-react";

// Fetch current user
async function fetchUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Fetch categories from Supabase
async function fetchCategories() {
  const { data, error } = await supabase.from("Categories").select("*");
  if (error) throw error;
  return data;
}

// Fetch expenses for a specific user
async function fetchExpenses(userId) {
  const { data, error } = await supabase
    .from("Expenses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
const PUBLIC_BASE_URL =
  "https://ukvbfcsfahvaczymudqu.supabase.co/storage/v1/object/public/expense-images/";

function handleViewImage(path) {
  if (!path) return;

  const fullUrl = `${PUBLIC_BASE_URL}${path}`;
  window.open(fullUrl, "_blank", "noopener,noreferrer");
}

export default function History() {
  // Get user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  // Get categories (after user is loaded)
  const {
    data: categories,
    isLoading: catLoading,
    error: catError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: !!user,
  });

  // Get expenses (after user is loaded)
  const {
    data: expenses,
    isLoading: expLoading,
    error: expError,
  } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: () => fetchExpenses(user.id),
    enabled: !!user,
  });

  if (userLoading || catLoading || expLoading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="text-center mt-10 text-gray-600 text-lg">
        Please login to see your expenses.
      </div>
    );
  }

  if (catError || expError) {
    return (
      <div className="text-center mt-10 text-red-600">
        Error loading data. Please try again later.
      </div>
    );
  }

  // Fallback to empty array to avoid crash
  const safeCategories = categories || [];
  const safeExpenses = expenses || [];

  if (safeExpenses.length === 0) {
    return (
      <div className="text-center text-gray-600 mt-10 text-lg">
        No expenses found.
      </div>
    );
  }

  // Get category name for an expense
  const getCategoryName = (id) => {
    const cat = safeCategories.find((c) => c.id === id);
    return cat ? cat.name : "Uncategorized";
  };

  // Group expenses by month-year
  const groupedExpenses = safeExpenses.reduce((acc, e) => {
    const date = new Date(e.expense_date);
    const monthYear = date.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(e);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto bg-white p-6 rounded-2xl shadow-md space-y-8">
      <h1 className="text-2xl font-bold text-blue-600 mb-6">
        Your Expense History
      </h1>
      {Object.keys(groupedExpenses).map((month) => {
        const monthExpenses = groupedExpenses[month];
        const monthTotal = monthExpenses.reduce(
          (sum, e) => sum + Number(e.amount || 0),
          0
        );
        return (
          <div key={month} className="bg-gray-50 rounded-lg p-4 shadow-sm">
            <h2 className="text-xl font-semibold text-blue-600 mb-4">
              {month}
            </h2>
            <ul className="divide-y divide-gray-200">
              {monthExpenses.map((e) => (
                <li
                  key={e.id}
                  className="py-2 flex justify-between bg-gray-50 items-center text-gray-700 hover:bg-blue-100 rounded px-2"
                >
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-sm text-gray-500 flex gap-2">
                      {new Date(e.expense_date).toLocaleDateString()} •{" "}
                      <span className="italic text-gray-600">
                        {getCategoryName(e.category_id)}
                      </span>
                    </p>
                    {e.expense_images && (
                      <button
                        className="text-blue-600 hover:text-blue-800 cursor-pointer"
                        onClick={() => handleViewImage(e.expense_images)}
                      >
                        View Image
                        <Eye className="inline-block ml-1 h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <span className="font-semibold text-green-600">
                    ₹{Number(e.amount || 0).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="text-right font-semibold rounded bg-violet-50 text-gray-700 border-t pt-2 mt-2">
              Total for {month}: ₹{monthTotal.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
