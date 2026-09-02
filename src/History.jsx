import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History as HistoryIcon,
  Search,
  Filter,
  Eye,
  Calendar,
  Tag,
  Split,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "./supabaseClient";
import { fetchAllExpensesAndSplits } from "./services/expenseService";
import { formatCurrency } from "./services/calculationEngine";
import ExpenseDetailsModal from "./components/expenses/ExpenseDetailsModal";

const PUBLIC_BASE_URL =
  "https://ukvbfcsfahvaczymudqu.supabase.co/storage/v1/object/public/expense-images/";

function handleViewImage(path) {
  if (!path) return;
  const fullUrl = `${PUBLIC_BASE_URL}${path}`;
  window.open(fullUrl, "_blank", "noopener,noreferrer");
}

export default function History() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all' | 'personal' | 'split'
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Current User
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["userSession"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    },
  });

  // Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Categories").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Expenses & Splits
  const {
    data: expensesData = { expenses: [], splits: [] },
    isLoading: expLoading,
  } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: () => fetchAllExpensesAndSplits(user?.id),
    enabled: !!user?.id,
  });

  if (userLoading || expLoading) {
    return (
      <div className="text-center py-16 text-slate-500">
        Loading expense history...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16 text-slate-600 text-lg">
        Please login to see your expense history.
      </div>
    );
  }

  const safeCategories = categories || [];
  const safeExpenses = Array.isArray(expensesData)
    ? expensesData
    : expensesData?.expenses || [];
  const safeSplits = expensesData?.splits || [];

  const getCategoryName = (id) => {
    const cat = safeCategories.find((c) => c.id === id);
    return cat ? cat.name : "Uncategorized";
  };

  // Filter and search expenses
  const filteredExpenses = safeExpenses.filter((e) => {
    // Filter type
    if (filterType === "personal" && e.is_split) return false;
    if (filterType === "split" && !e.is_split) return false;

    // Search query
    const q = searchQuery.toLowerCase();
    const catName = getCategoryName(e.category_id).toLowerCase();
    const titleMatch = e.title?.toLowerCase().includes(q);
    const catMatch = catName.includes(q);
    const payerMatch = e.paid_by_name?.toLowerCase().includes(q);

    return titleMatch || catMatch || payerMatch;
  });

  // Group filtered expenses by month-year
  const groupedExpenses = filteredExpenses.reduce((acc, e) => {
    const date = new Date(e.expense_date || e.created_at);
    const monthYear = date.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(e);
    return acc;
  }, {});

  function handleExportCSV() {
    if (filteredExpenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }

    const headers = [
      "Date",
      "Title",
      "Amount (INR)",
      "Category",
      "Type",
      "Split Method",
      "Paid By",
      "Payment Method",
    ];

    const rows = filteredExpenses.map((e) => [
      e.expense_date || e.created_at?.split("T")[0],
      `"${(e.title || "").replace(/"/g, '""')}"`,
      e.amount,
      `"${(getCategoryName(e.category_id) || "").replace(/"/g, '""')}"`,
      e.is_split ? "Split" : "Personal",
      e.is_split ? e.split_method || "Equal" : "N/A",
      `"${(e.paid_by_name || "You").replace(/"/g, '""')}"`,
      `"${(e.payment_method || "Cash").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `expenses_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded!");
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-14 max-w-2xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-blue-600 tracking-tight flex items-center gap-2">
              <HistoryIcon className="w-6 h-6 text-blue-600" />
              Expense History
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete timeline of your personal and shared expenses.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200 w-fit"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Export CSV
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterType === "all"
                  ? "bg-white text-blue-600 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({safeExpenses.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("personal")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterType === "personal"
                  ? "bg-white text-blue-600 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Personal
            </button>
            <button
              type="button"
              onClick={() => setFilterType("split")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterType === "split"
                  ? "bg-white text-blue-600 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Split
            </button>
          </div>
        </div>
      </div>

      {/* Grouped Month Cards */}
      {Object.keys(groupedExpenses).length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-2xs space-y-2">
          <HistoryIcon className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            No expenses found
          </h3>
          <p className="text-xs text-slate-400">
            {searchQuery
              ? "No transactions match your search filter."
              : "Transactions you record will appear organized here."}
          </p>
        </div>
      ) : (
        Object.keys(groupedExpenses).map((month) => {
          const monthItems = groupedExpenses[month];
          const monthTotal = monthItems.reduce(
            (sum, e) => sum + Number(e.amount || 0),
            0
          );

          return (
            <div
              key={month}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              {/* Month Header */}
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  {month}
                </h2>
                <span className="text-xs font-black text-blue-600">
                  {formatCurrency(monthTotal)}
                </span>
              </div>

              {/* Transactions in Month */}
              <div className="divide-y divide-slate-100">
                {monthItems.map((e) => {
                  const splits = safeSplits.filter(
                    (s) => s.expense_id === e.id
                  );

                  return (
                    <div
                      key={e.id}
                      onClick={() =>
                        setSelectedExpense({
                          ...e,
                          splits,
                          Categories: safeCategories.find(
                            (c) => c.id === e.category_id
                          ),
                        })
                      }
                      className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm uppercase truncate max-w-[200px] sm:max-w-xs">
                            {e.title}
                          </p>
                          {e.is_split ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md shrink-0">
                              Split
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md shrink-0">
                              Personal
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5">
                          <span>
                            {new Date(
                              e.expense_date || e.created_at
                            ).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span className="text-slate-600 font-medium">
                            {getCategoryName(e.category_id)}
                          </span>
                          {e.paid_by_name && (
                            <>
                              <span>•</span>
                              <span>Paid by {e.paid_by_name}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-slate-900 text-base">
                          {formatCurrency(e.amount)}
                        </span>

                        {e.expense_images && (
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleViewImage(e.expense_images);
                            }}
                            className="text-slate-400 hover:text-blue-600 p-1"
                            title="View Receipt Image"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Expense Details Modal */}
      {selectedExpense && (
        <ExpenseDetailsModal
          expense={selectedExpense}
          categories={safeCategories}
          currentUserId={user?.id}
          onClose={() => setSelectedExpense(null)}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )}
    </div>
  );
}
