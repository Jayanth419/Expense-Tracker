import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import AddExpenseForm from "./AddExpenseForm";
import toast from "react-hot-toast";

// Fetch current user from Supabase
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

// Fetch all expenses for user
async function fetchExpenses(userId) {
  const { data, error } = await supabase
    .from("Expenses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Insert or update expense in Supabase
async function addOrUpdateExpense({ expense, userId, editingExpense }) {
  if (editingExpense) {
    // Update existing expense
    const { error } = await supabase
      .from("Expenses")
      .update({
        title: expense.title,
        amount: expense.amount,
        category_id: expense.category_id,
      })
      .eq("id", editingExpense.id);
    if (error) throw error;
    return { ...expense, id: editingExpense.id };
  } else {
    // Add new expense
    const { data, error } = await supabase
      .from("Expenses")
      .insert([{ ...expense, user_id: userId }]);
    if (error) throw error;
    return data?.[0];
  }
}

// Delete expense by ID
async function deleteExpense(id) {
  const { error } = await supabase.from("Expenses").delete().eq("id", id);
  if (error) throw error;
}

export default function Home() {
  const queryClient = useQueryClient();
  const [editingExpense, setEditingExpense] = useState(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: !!user,
  });

  const { data: expenses, isLoading: expLoading } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: () => fetchExpenses(user.id),
    enabled: !!user,
  });

  // Add/Edit
  const mutation = useMutation({
    mutationFn: ({ expense, editingExpense }) =>
      addOrUpdateExpense({ expense, userId: user.id, editingExpense }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", user?.id] });
      setEditingExpense(null);
    },
    onError: (error) => toast.error(error.message),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", user?.id] });
    },
    onError: (error) => toast.error(error.message),
  });

  if (userLoading || catLoading || expLoading)
    return <div className="text-center mt-10">Loading...</div>;

  if (!user)
    return (
      <div className="text-center mt-10 text-gray-600 text-lg">
        Please login to manage your expenses.
      </div>
    );

  const safeCategories = categories || [];
  const safeExpenses = expenses || [];

  // form submit (add or update)
  function handleAddOrUpdate(expense) {
    mutation.mutate({ expense, editingExpense });
  }

  function handleDelete(expenseId) {
    if (!window.confirm("Are you sure you want to delete this expense?"))
      return;
    deleteMutation.mutate(expenseId);
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <h1 className="text-2xl font-bold text-blue-600">
        {editingExpense ? "Edit Expense" : "Add Expense"}
      </h1>

      {/* Expense Form */}
      <AddExpenseForm
        categories={safeCategories}
        onAdd={handleAddOrUpdate}
        initialData={editingExpense}
      />

      <div className="mt-6">
        <h2 className="text-xl font-semibold text-blue-600 mb-3">
          Recent Transactions
        </h2>
        {safeExpenses.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {safeExpenses.map((e) => (
              <li key={e.id} className="py-2 flex justify-between items-center">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-gray-500">
                    ₹{e.amount} •{" "}
                    {safeCategories.find((c) => c.id === e.category_id)?.name ||
                      "Uncategorized"}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => setEditingExpense(e)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => handleDelete(e.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No recent transactions yet.</p>
        )}
      </div>
    </div>
  );
}
