import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PieChart, Calendar, Tag, ArrowRight } from "lucide-react";
import { fetchAllExpensesAndSplits } from "./services/expenseService";
import { formatCurrency } from "./services/calculationEngine";

const COLORS = [
  "#2563EB", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Rose
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#64748B", // Slate
];

// Fetch categories
async function fetchCategories() {
  const { data, error } = await supabase.from("Categories").select("*");
  if (error) throw error;
  return data || [];
}

export default function Monthly() {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["userSession"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    },
  });

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: !!user,
  });

  const {
    data: expensesData = { expenses: [], splits: [] },
    isLoading: expLoading,
  } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: () => fetchAllExpensesAndSplits(user?.id),
    enabled: !!user,
  });

  if (userLoading || catLoading || expLoading) {
    return (
      <div className="text-center py-16 text-slate-500">
        Loading monthly analytics...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16 text-slate-600 text-lg">
        Please login to view monthly analysis.
      </div>
    );
  }

  const safeCategories = categories || [];
  const safeExpenses = Array.isArray(expensesData)
    ? expensesData
    : expensesData?.expenses || [];

  if (safeExpenses.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-2xs max-w-2xl mx-auto space-y-2">
        <PieChart className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">
          No expenses recorded yet
        </h3>
        <p className="text-xs text-slate-400">
          Record expenses to see visual monthly breakdowns and category charts.
        </p>
      </div>
    );
  }

  // Filter expenses for selected month
  const filteredExpenses = selectedMonth
    ? safeExpenses.filter((e) => {
        const date = new Date(e.expense_date || e.created_at);
        return (
          date.toLocaleString("default", {
            month: "long",
            year: "numeric",
          }) === selectedMonth
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

  const totalFilteredAmount = filteredExpenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  // Month select options
  const monthOptions = [
    ...new Set(
      safeExpenses.map((e) => {
        const date = new Date(e.expense_date || e.created_at);
        return date.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      })
    ),
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-14 max-w-2xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-blue-600 tracking-tight flex items-center gap-2">
              <PieChart className="w-6 h-6 text-blue-600" />
              Monthly Analysis
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Category distribution and spending trends.
            </p>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl w-fit">
            <Calendar className="w-4 h-4 text-blue-600" />
            <select
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedCategory(null);
              }}
            >
              <option value="">All Time</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Total Metric */}
        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            Total Spend for {selectedMonth || "All Time"}
          </span>
          <span className="text-lg font-black text-blue-600">
            {formatCurrency(totalFilteredAmount)}
          </span>
        </div>
      </div>

      {/* Row: Pie chart + Category Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
        <h2 className="text-base font-bold text-slate-800">
          Category Distribution
        </h2>

        {pieData.length > 0 ? (
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  paddingAngle={3}
                  fill="#8884d8"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontWeight: "bold",
                    fontSize: "12px",
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center py-10 text-slate-400 text-xs">
            No expenses found for this period.
          </div>
        )}

        {/* Category Share List */}
        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
          {pieData.map((d, index) => {
            const pct =
              totalFilteredAmount > 0
                ? ((d.value / totalFilteredAmount) * 100).toFixed(1)
                : 0;

            return (
              <div
                key={d.name}
                onClick={() => setSelectedCategory(d.name)}
                className="p-3 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  ></span>
                  <span className="font-bold text-slate-800">{d.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-semibold">{pct}%</span>
                  <span className="font-black text-slate-900">
                    {formatCurrency(d.value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details for Selected Category */}
      {selectedCategory && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 animate-slideUp">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-blue-600" />
              Transactions in {selectedCategory}
            </h3>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
            >
              Clear Filter
            </button>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {filteredExpenses
              .filter(
                (e) =>
                  safeCategories.find((c) => c.id === e.category_id)?.name ===
                  selectedCategory
              )
              .map((e) => (
                <div
                  key={e.id}
                  className="p-3 flex justify-between items-center hover:bg-slate-50 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 uppercase block">
                      {e.title}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(
                        e.expense_date || e.created_at
                      ).toLocaleDateString()}
                      {e.is_split ? " • Split" : " • Personal"}
                    </span>
                  </div>
                  <span className="font-black text-slate-900 text-sm">
                    {formatCurrency(e.amount)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
