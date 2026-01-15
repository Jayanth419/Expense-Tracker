import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { supabase } from "./supabaseClient";

async function fetchCategories() {
  const { data, error } = await supabase.from("Categories").select("*");
  if (error) throw error;
  return data;
}

async function uploadExpenseImage(file) {
  if (!file) return null;

  const ext = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `receipts/${fileName}`;

  const { error } = await supabase.storage
    .from("expense-images")
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  return filePath; // store ONLY path
}

/* -------------------- component -------------------- */

export default function AddExpenseForm({ initialData }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category_id, setCategoryId] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseImage, setExpenseImage] = useState(null);
  const [existingImage, setExistingImage] = useState(null);

  const fileRef = useRef(null);

  const today = new Date().toISOString().split("T")[0];
  const queryClient = useQueryClient();

  const {
    data: categories = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setAmount(initialData.amount || "");
      setCategoryId(initialData.category_id || "");
      setExpenseDate(initialData.expense_date || "");
      setExistingImage(initialData.expense_images || null);
      setExpenseImage(null);
    } else {
      setTitle("");
      setAmount("");
      setCategoryId("");
      setExpenseDate(today);
      setExpenseImage(null);
      setExistingImage(null);
    }
  }, [initialData, today]);

  /* -------------------- mutation -------------------- */

  const mutation = useMutation({
    mutationFn: async () => {
      // 1️⃣ save expense WITHOUT image
      const { data, error } = initialData
        ? await supabase
            .from("Expenses")
            .update({ title, amount, category_id, expense_date: expenseDate })
            .eq("id", initialData.id)
            .select()
            .single()
        : await supabase
            .from("Expenses")
            .insert({ title, amount, category_id, expense_date: expenseDate })
            .select()
            .single();

      if (error) throw error;

      // 2️⃣ upload image AFTER
      let imagePath = existingImage;

      try {
        if (expenseImage) {
          imagePath = await uploadExpenseImage(expenseImage);
        }
      } catch (err) {
        toast.error("Image upload failed. Expense saved without image.");
      }

      // update image only if changed
      if (imagePath !== initialData?.expense_images) {
        await supabase
          .from("Expenses")
          .update({ expense_images: imagePath })
          .eq("id", data.id);
      }
    },

    onSuccess: () => {
      toast.success(initialData ? "Expense updated!" : "Expense added!");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });

      setTitle("");
      setAmount("");
      setCategoryId("");
      setExpenseDate(today);
      setExpenseImage(null);
      fileRef.current && (fileRef.current.value = "");
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong");
    },
  });

  /* -------------------- submit -------------------- */

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title || !amount || !category_id || !expenseDate) {
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
          Expense Title
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            Expense Date
          </label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            max={today}
            className="w-full rounded-xl border border-gray-300 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            required
          />
        </div>
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
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      <div>
        <label className="block text-md font-medium text-gray-600 mb-1">
          Expense Image
        </label>
        <input
          ref={fileRef}
          type="file"
          className="w-full file:border file:rounded-xl file:px-2 file:py-1 file:border-gray-300 file:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          accept="image/*,image/png,application/pdf"
          onChange={(e) => setExpenseImage(e.target.files[0])}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition transform hover:scale-[1.02] active:scale-[0.98]"
        disabled={mutation.isPending}
      >
        {mutation.isPending
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
