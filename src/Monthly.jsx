import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#A020F0",
  "#FF3399",
];

// Get current user info
async function fetchUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Fetch all categories
async function fetchCategories() {
  const { data, error } = await supabase.from("Categories").select("*");
  if (error) throw error;
  return data;
}

// Fetch all expenses for current user
async function fetchExpenses(userId) {
  const { data, error } = await supabase
    .from("Expenses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export default function Monthly() {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  const {
    data: categories,
    isLoading: catLoading,
    error: catError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: !!user,
  });

  const {
    data: expenses,
    isLoading: expLoading,
    error: expError,
  } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: () => fetchExpenses(user.id),
    enabled: !!user,
  });

  // Combined loading, error, or empty states
  if (userLoading || catLoading || expLoading) {
    return <div className="text-center mt-10">Loading...</div>;
  }
  if (!user) {
    return (
      <div className="text-center mt-10 text-gray-600 text-lg">
        Please login to view summary.
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

  const safeCategories = categories || [];
  const safeExpenses = expenses || [];

  if (safeExpenses.length === 0) {
    return <div className="text-center mt-10">No expenses found.</div>;
  }

  // Filter expenses for selected month
  const filteredExpenses = selectedMonth
    ? safeExpenses.filter((e) => {
        const date = new Date(e.created_at);
        return (
          date.toLocaleString("default", { month: "long", year: "numeric" }) ===
          selectedMonth
        );
      })
    : safeExpenses;

  // Pie chart data (sum by category)
  const pieData = safeCategories
    .map((cat) => {
      const total = filteredExpenses
        .filter((e) => e.category_id === cat.id)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return { name: cat.name, value: total };
    })
    .filter((d) => d.value > 0);

  // Month select options
  const monthOptions = [
    ...new Set(
      safeExpenses.map((e) => {
        const date = new Date(e.created_at);
        return date.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      })
    ),
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">Monthly Summary</h1>

      {/* Month selector */}
      <select
        className="border px-3 py-1 rounded"
        value={selectedMonth}
        onChange={(e) => {
          setSelectedMonth(e.target.value);
          setSelectedCategory(null); // Reset category on month change
        }}
      >
        <option value="">All Months</option>
        {monthOptions.map((month) => (
          <option key={month} value={month}>
            {month}
          </option>
        ))}
      </select>

      {/* Row: Pie chart + Category table */}
      <div className="flex flex-col md:flex-row gap-6 mt-6">
        {/* Pie chart */}
        <div className="md:w-1/2 w-full h-80 sm:h-96">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 mt-4">
              No expenses for the selected month.
            </p>
          )}
        </div>
        {/* Category table */}
        <div className="md:w-1/2 w-full overflow-x-auto">
          <table className="min-w-full border divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Category
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pieData.map((d) => (
                <tr
                  key={d.name}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => setSelectedCategory(d.name)}
                >
                  <td className="px-4 py-2">{d.name}</td>
                  <td className="px-4 py-2">₹{d.value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details for selected category */}
      {selectedCategory && (
        <div className="mt-6 bg-gray-50 p-4 rounded-lg shadow-inner">
          <h3 className="font-semibold text-blue-600 mb-2">
            Expenses in {selectedCategory}
          </h3>
          <ul className="divide-y divide-gray-200">
            {filteredExpenses
              .filter(
                (e) =>
                  safeCategories.find((c) => c.id === e.category_id)?.name ===
                  selectedCategory
              )
              .map((e) => (
                <li key={e.id} className="py-2 flex justify-between">
                  <span>{e.title}</span>
                  <span className="font-semibold text-green-600">
                    ₹{e.amount}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
