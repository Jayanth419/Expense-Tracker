import React, { useEffect, useState } from "react";
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

export default function Monthly() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: catData } = await supabase.from("Categories").select("*");
        setCategories(catData || []);

        const { data: expData } = await supabase
          .from("Expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        setExpenses(expData || []);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (expenses.length === 0)
    return <div className="text-center mt-10">No expenses found.</div>;

  const filteredExpenses = selectedMonth
    ? expenses.filter((e) => {
        const date = new Date(e.created_at);
        return (
          date.toLocaleString("default", { month: "long", year: "numeric" }) ===
          selectedMonth
        );
      })
    : expenses;

  const pieData = categories
    .map((cat) => {
      const total = filteredExpenses
        .filter((e) => e.category_id === cat.id)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return { name: cat.name, value: total };
    })
    .filter((d) => d.value > 0);

  const monthOptions = [
    ...new Set(
      expenses.map((e) => {
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
        onChange={(e) => setSelectedMonth(e.target.value)}
      >
        <option value="">All Months</option>
        {monthOptions.map((month) => (
          <option key={month} value={month}>
            {month}
          </option>
        ))}
      </select>

      {/* First row */}
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
      {/* Selected Category Details */}

      {selectedCategory && (
        <div className="mt-6 bg-gray-50 p-4 rounded-lg shadow-inner">
          <h3 className="font-semibold text-blue-600 mb-2">
            Expenses in {selectedCategory}
          </h3>
          <ul className="divide-y divide-gray-200">
            {filteredExpenses
              .filter(
                (e) =>
                  categories.find((c) => c.id === e.category_id)?.name ===
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
