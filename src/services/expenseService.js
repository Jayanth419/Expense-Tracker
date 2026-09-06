import { supabase } from "../supabaseClient";

/**
 * Create a new expense (personal or split)
 * Supports both createExpense(expenseData, splitsData) and createExpense({ expense, splits, userId })
 */
export async function createExpense(arg1, arg2) {
  let expense, splits, userId;

  if (arg1 && arg1.expense) {
    expense = arg1.expense;
    splits = arg1.splits || [];
    userId = arg1.userId || expense?.user_id;
  } else {
    expense = arg1 || {};
    splits = arg2 || [];
    userId = expense?.user_id;
  }

  if (!userId) {
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id;
  }

  const isSplit = Boolean(expense?.is_split);

  // 1. Insert into Expenses
  const { data: createdExpense, error: expError } = await supabase
    .from("Expenses")
    .insert([
      {
        title: (expense.title || "").trim(),
        amount: Number(expense.amount),
        category_id: expense.category_id,
        expense_date: expense.expense_date,
        expense_images: expense.expense_images || null,
        user_id: userId,
        payment_method: expense.payment_method || "Cash",
        is_split: isSplit,
        group_id: expense.group_id || null,
        split_method: isSplit ? expense.split_method || "Equal" : null,
        paid_by_user_id: isSplit ? expense.paid_by_user_id || userId : null,
        paid_by_contact_id: isSplit ? expense.paid_by_contact_id || null : null,
        paid_by_name: isSplit ? expense.paid_by_name || "You" : null,
      },
    ])
    .select()
    .single();

  if (expError) {
    console.error("Error creating expense:", expError);
    throw expError;
  }

  // 2. If split, insert expense_splits
  if (isSplit && splits.length > 0) {
    const splitRecords = splits.map((s) => ({
      expense_id: createdExpense.id,
      user_id: s.user_id || (s.isCurrentUser ? userId : null),
      contact_id: s.contact_id || null,
      participant_name: s.participant_name || s.name || "Participant",
      share_amount: Number(s.share_amount) || 0,
      share_percentage:
        s.share_percentage !== undefined && s.share_percentage !== null
          ? Number(s.share_percentage)
          : null,
      share_count:
        s.share_count !== undefined && s.share_count !== null
          ? Number(s.share_count)
          : null,
    }));

    const { error: splitsError } = await supabase
      .from("expense_splits")
      .insert(splitRecords);

    if (splitsError) {
      console.error("Error inserting splits:", splitsError);
      throw splitsError;
    }
  }

  return createdExpense;
}

/**
 * Update an existing expense and its splits
 * Supports both updateExpense(expenseId, expenseData, splitsData) and updateExpense({ expenseId, expense, splits, userId })
 */
export async function updateExpense(arg1, arg2, arg3) {
  let expenseId, expense, splits, userId;

  if (typeof arg1 === "object" && arg1 !== null && arg1.expenseId) {
    expenseId = arg1.expenseId;
    expense = arg1.expense || {};
    splits = arg1.splits || [];
    userId = arg1.userId || expense?.user_id;
  } else {
    expenseId = arg1;
    expense = arg2 || {};
    splits = arg3 || [];
    userId = expense?.user_id;
  }

  if (!userId) {
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id;
  }

  const isSplit = Boolean(expense?.is_split);

  // 1. Update Expenses table
  const { data: updatedExpense, error: expError } = await supabase
    .from("Expenses")
    .update({
      title: (expense.title || "").trim(),
      amount: Number(expense.amount),
      category_id: expense.category_id,
      expense_date: expense.expense_date,
      expense_images: expense.expense_images || null,
      payment_method: expense.payment_method || "Cash",
      is_split: isSplit,
      group_id: expense.group_id || null,
      split_method: isSplit ? expense.split_method || "Equal" : null,
      paid_by_user_id: isSplit ? expense.paid_by_user_id || userId : null,
      paid_by_contact_id: isSplit ? expense.paid_by_contact_id || null : null,
      paid_by_name: isSplit ? expense.paid_by_name || "You" : null,
    })
    .eq("id", expenseId)
    .select()
    .single();

  if (expError) {
    console.error("Error updating expense:", expError);
    throw expError;
  }

  // 2. Refresh splits
  // Delete existing splits for this expense
  const { error: deleteSplitsError } = await supabase
    .from("expense_splits")
    .delete()
    .eq("expense_id", expenseId);

  if (deleteSplitsError) {
    console.error("Error clearing old splits:", deleteSplitsError);
  }

  // Insert updated splits if split
  if (isSplit && splits.length > 0) {
    const splitRecords = splits.map((s) => ({
      expense_id: expenseId,
      user_id: s.user_id || (s.isCurrentUser ? userId : null),
      contact_id: s.contact_id || null,
      participant_name: s.participant_name || s.name || "Participant",
      share_amount: Number(s.share_amount) || 0,
      share_percentage:
        s.share_percentage !== undefined && s.share_percentage !== null
          ? Number(s.share_percentage)
          : null,
      share_count:
        s.share_count !== undefined && s.share_count !== null
          ? Number(s.share_count)
          : null,
    }));

    const { error: insertSplitsError } = await supabase
      .from("expense_splits")
      .insert(splitRecords);

    if (insertSplitsError) {
      console.error("Error inserting updated splits:", insertSplitsError);
      throw insertSplitsError;
    }
  }

  return updatedExpense;
}

/**
 * Fetch expense details along with its splits
 */
export async function fetchExpenseDetails(expenseId) {
  if (!expenseId) return null;

  const { data: expense, error: expError } = await supabase
    .from("Expenses")
    .select("*, Categories(*)")
    .eq("id", expenseId)
    .single();

  if (expError) {
    console.error("Error fetching expense details:", expError);
    throw expError;
  }

  const { data: splits, error: splitsError } = await supabase
    .from("expense_splits")
    .select("*")
    .eq("expense_id", expenseId);

  if (splitsError) {
    console.error("Error fetching splits:", splitsError);
  }

  return {
    ...expense,
    splits: splits || [],
  };
}

/**
 * Fetch all expenses (personal + split) and all splits for a user
 */
export async function fetchAllExpensesAndSplits(userId) {
  if (!userId) return { expenses: [], splits: [] };

  const { data: expenses, error: expError } = await supabase
    .from("Expenses")
    .select("*, Categories(*)")
    .order("expense_date", { ascending: false });

  if (expError) {
    console.error("Error fetching all expenses:", expError);
    throw expError;
  }

  const splitExpenseIds = (expenses || [])
    .filter((e) => e.is_split)
    .map((e) => e.id);
  let splits = [];

  if (splitExpenseIds.length > 0) {
    const { data: splitsData, error: splitsError } = await supabase
      .from("expense_splits")
      .select("*")
      .in("expense_id", splitExpenseIds);

    if (splitsError) {
      console.error("Error fetching splits for user:", splitsError);
    } else {
      splits = splitsData || [];
    }
  }

  return { expenses: expenses || [], splits };
}

/**
 * Delete an expense and its splits
 */
export async function deleteExpense(expenseId) {
  const { error } = await supabase
    .from("Expenses")
    .delete()
    .eq("id", expenseId);
  if (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
  return true;
}
