import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Trash2,
  SquarePen,
  Eye,
  Plus,
  ArrowRight,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "./supabaseClient";
import AddExpenseForm from "./AddExpenseForm";
import ExpenseDetailsModal from "./components/expenses/ExpenseDetailsModal";
import {
  fetchAllExpensesAndSplits,
  deleteExpense,
} from "./services/expenseService";
import { fetchSettlements } from "./services/settlementService";
import { fetchContacts } from "./services/contactService";
import {
  calculateBalances,
  formatCurrency,
} from "./services/calculationEngine";

const PUBLIC_BASE_URL =
  "https://ukvbfcsfahvaczymudqu.supabase.co/storage/v1/object/public/expense-images/";

function handleViewImage(path) {
  if (!path) return;
  const fullUrl = `${PUBLIC_BASE_URL}${path}`;
  window.open(fullUrl, "_blank", "noopener,noreferrer");
}

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedExpenseDetails, setSelectedExpenseDetails] = useState(null);

  // Fetch Current User
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["userSession"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    },
  });

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Categories").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch Expenses and Splits
  const {
    data: expensesData = { expenses: [], splits: [] },
    isLoading: expLoading,
  } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: () => fetchAllExpensesAndSplits(user?.id),
    enabled: !!user?.id,
  });

  // Fetch Contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: () => fetchContacts(user?.id),
    enabled: !!user?.id,
  });

  // Fetch Settlements
  const { data: settlements = [] } = useQuery({
    queryKey: ["settlements", user?.id],
    queryFn: () => fetchSettlements(user?.id),
    enabled: !!user?.id,
  });

  const safeCategories = categories || [];
  const safeExpenses = Array.isArray(expensesData)
    ? expensesData
    : expensesData?.expenses || [];
  const safeSplits = expensesData?.splits || [];

  // Calculate Net Balances
  const balances = calculateBalances({
    expenses: safeExpenses,
    splits: safeSplits,
    settlements,
    currentUserId: user?.id,
    contacts,
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      toast.success("Expense deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (error) => toast.error(error.message),
  });

  if (userLoading || expLoading) {
    return (
      <div className="text-center py-16 text-slate-500">
        Loading your dashboard...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16 text-slate-600 text-lg">
        Please login to manage your expenses.
      </div>
    );
  }

  // Calculate current month total personal spending
  const currentMonthStr = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const monthExpenses = safeExpenses.filter((e) => {
    const d = new Date(e.expense_date || e.created_at);
    return (
      d.toLocaleString("default", { month: "long", year: "numeric" }) ===
      currentMonthStr
    );
  });
  const monthTotal = monthExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0,
  );

  function handleDelete(expenseId) {
    if (!window.confirm("Are you sure you want to delete this expense?"))
      return;
    deleteMutation.mutate(expenseId);
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-14 max-w-2xl mx-auto">
      {/* Overview Stat Cards - Single Row on Mobile & Desktop */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Month Spending */}
        <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
              This Month
            </span>
          </div>
          <span className="text-sm sm:text-lg lg:text-xl font-black text-slate-900 mt-1 block truncate">
            {formatCurrency(monthTotal)}
          </span>
          <p className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
            {monthExpenses.length} logged
          </p>
        </div>

        {/* You are Owed */}
        <div
          onClick={() => navigate("/balances")}
          className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 hover:border-green-300 shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
              You're Owed
            </span>
            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500 shrink-0 hidden xs:block" />
          </div>
          <span className="text-sm sm:text-lg lg:text-xl font-black text-green-600 mt-1 block truncate group-hover:translate-x-0.5 transition">
            {formatCurrency(balances.totalYouAreOwed)}
          </span>
          <p className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
            {balances.youAreOwedList.length} people
          </p>
        </div>

        {/* You Owe */}
        <div
          onClick={() => navigate("/balances")}
          className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 hover:border-rose-300 shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
              You Owe
            </span>
            <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500 shrink-0 hidden xs:block" />
          </div>
          <span className="text-sm sm:text-lg lg:text-xl font-black text-rose-600 mt-1 block truncate group-hover:translate-x-0.5 transition">
            {formatCurrency(balances.totalYouOwe)}
          </span>
          <p className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
            {balances.youOweList.length} people
          </p>
        </div>
      </div>

      {/* Main Add Expense Container Matching User's Theme */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-blue-600 tracking-tight">
          {editingExpense ? "Edit Expense" : "Add Expense"}
        </h1>

        <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200">
          <AddExpenseForm
            initialData={editingExpense}
            onCancelEdit={() => setEditingExpense(null)}
          />
        </div>
      </div>

      {/* Recent Transactions Matching User's Theme */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-blue-600">
            Recent Transactions
          </h2>
          <button
            type="button"
            onClick={() => navigate("/history")}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {safeExpenses.length > 0 ? (
            safeExpenses.slice(0, 8).map((e) => {
              const category = safeCategories.find(
                (c) => c.id === e.category_id,
              );
              const splits = safeSplits.filter((s) => s.expense_id === e.id);

              return (
                <div
                  key={e.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                >
                  <div
                    onClick={() =>
                      setSelectedExpenseDetails({
                        ...e,
                        splits,
                        Categories: category,
                      })
                    }
                    className="flex-1 cursor-pointer min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm truncate uppercase">
                        {e.title}
                      </p>
                      {e.is_split && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md shrink-0">
                          Split
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      ₹{e.amount} • {category?.name || "Uncategorized"}
                    </p>
                  </div>

                  {/* Right Action Icons: Blue Edit, Red Delete */}
                  <div className="flex items-center gap-3 shrink-0">
                    {e.expense_images && (
                      <button
                        type="button"
                        className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
                        onClick={() => handleViewImage(e.expense_images)}
                        title="View Receipt"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        setEditingExpense(e);
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1 cursor-pointer transition active:scale-95"
                      title="Edit Expense"
                    >
                      <SquarePen className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer transition active:scale-95"
                      onClick={() => handleDelete(e.id)}
                      title="Delete Expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-slate-400 text-xs py-8 text-center">
              No recent transactions recorded yet.
            </p>
          )}
        </div>
      </div>

      {/* Expense Details Inspector Modal */}
      {selectedExpenseDetails && (
        <ExpenseDetailsModal
          expense={selectedExpenseDetails}
          categories={safeCategories}
          currentUserId={user?.id}
          onClose={() => setSelectedExpenseDetails(null)}
          onEdit={(exp) => {
            setSelectedExpenseDetails(null);
            setEditingExpense(exp);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onDelete={(id) => {
            setSelectedExpenseDetails(null);
            handleDelete(id);
          }}
        />
      )}
    </div>
  );
}
