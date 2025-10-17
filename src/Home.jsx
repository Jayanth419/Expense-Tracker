import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import AddExpenseForm from "./AddExpenseForm";

export default function Home() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState(null);

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
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleAddOrUpdate(expense) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

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

      if (error) console.error(error);
      else setEditingExpense(null);
    } else {
      // Add new expense
      const { error } = await supabase
        .from("Expenses")
        .insert([{ ...expense, user_id: user.id }]);

      if (error) console.error(error);
    }

    // Refresh expenses
    const { data: expData } = await supabase
      .from("Expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setExpenses(expData || []);
  }

  async function handleDelete(expenseId) {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    const { error } = await supabase
      .from("Expenses")
      .delete()
      .eq("id", expenseId);
    if (error) console.error(error);

    setExpenses(expenses.filter((e) => e.id !== expenseId));
  }

  if (loading) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <h1 className="text-2xl font-bold text-blue-600">
        {editingExpense ? "Edit Expense" : "Add Expense"}
      </h1>

      <AddExpenseForm
        categories={categories}
        onAdd={handleAddOrUpdate}
        initialData={editingExpense}
      />

      <div className="mt-6">
        <h2 className="text-xl font-semibold text-blue-600 mb-3">
          Recent Transactions
        </h2>
        {expenses.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {expenses.map((e) => (
              <li key={e.id} className="py-2 flex justify-between items-center">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-gray-500">
                    ₹{e.amount} •{" "}
                    {categories.find((c) => c.id === e.category_id)?.name ||
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
