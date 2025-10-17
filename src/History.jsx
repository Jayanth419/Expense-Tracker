import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function History() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setExpenses([]);
          setLoading(false);
          return;
        }

        // categories
        const { data: categoriesData, error: catError } = await supabase
          .from("Categories")
          .select("*");
        if (catError) throw catError;
        setCategories(categoriesData || []);

        // Fetch expenses for logged-in user
        const { data: expensesData, error: expError } = await supabase
          .from("Expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (expError) throw expError;

        setExpenses(expensesData || []);
      } catch (err) {
        console.error("Error fetching user history:", err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const getCategoryName = (id) => {
    const cat = categories.find((c) => c.id === id);
    return cat ? cat.name : "Uncategorized";
  };

  // Group expenses by month-year
  const groupedExpenses = expenses.reduce((acc, e) => {
    const date = new Date(e.created_at);
    const monthYear = date.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(e);
    return acc;
  }, {});

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (expenses.length === 0)
    return (
      <div className="text-center text-gray-600 mt-10 text-lg">
        No expenses found .
      </div>
    );

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
                      {new Date(e.created_at).toLocaleDateString()} •{" "}
                      <span className="italic text-gray-600">
                        {getCategoryName(e.category_id)}
                      </span>
                    </p>
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
