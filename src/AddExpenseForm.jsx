import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { supabase } from "./supabaseClient";
async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*");
  if (error) throw error;
  return data;
}

export default function AddExpenseForm({ onAdd, initialData }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category_id, setCategoryId] = useState("");
  const queryClient = useQueryClient(); // Fetch categories using useQuery

  const {
    data: categories = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setAmount(initialData.amount);
      setCategoryId(initialData.category_id);
    } else {
      setTitle("");
      setAmount("");
      setCategoryId("");
    }
  }, [initialData]);

  const mutation = useMutation({
    mutationFn: async (expense) => {
      const result = await onAdd(expense);
      return result;
    },
    onSuccess: () => {
      toast.success(initialData ? "Expense updated!" : "Expense added!");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setTitle("");
      setAmount("");
      setCategoryId("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !amount || !category_id) {
      toast.error("Please fill all fields");
      return;
    }
    mutation.mutate({ title, amount, category_id });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 p-6 rounded-2xl shadow-md space-y-5 transition-all hover:shadow-lg"
    >
      <div>
        <label className="block text-md font-medium text-gray-600 mb-1">
          Expense Title{" "}
        </label>
        <input
          type="text"
          placeholder="e.g. Grocery Shopping"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-gray-300 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          required
        />
      </div>
      <div>
        <label className="block text-md font-medium text-gray-600 mb-1">
          Amount (₹ )
        </label>
        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-xl border border-gray-300 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          required
        />
      </div>
      <div>
        <label className="block text-md font-medium text-gray-600 mb-1">
          Category
        </label>
        <select
          value={category_id}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-xl border border-gray-300 p-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          required
        >
          {isLoading ? (
            <option>Loading...</option>
          ) : isError ? (
            <option>Error loading categories</option>
          ) : (
            <>
              <option value="">Select Category</option> {" "}
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition transform hover:scale-[1.02] active:scale-[0.98]"
        disabled={mutation.isLoading}
      >
        {mutation.isLoading
          ? initialData
            ? "Updating..."
            : "Adding..."
          : initialData
          ? "Update Expense"
          : "+ Add Expense"}
      </button>
    </form>
  );
}
