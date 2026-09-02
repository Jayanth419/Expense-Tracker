import { supabase } from "../supabaseClient";

/**
 * Fetch settlements involving the user or within user groups
 */
export async function fetchSettlements(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("settlements")
    .select("*, groups(*)")
    .order("settled_at", { ascending: false });

  if (error) {
    console.error("Error fetching settlements:", error);
    throw error;
  }

  return data || [];
}

/**
 * Record a new settlement
 */
export async function createSettlement({
  group_id = null,
  payer_user_id = null,
  payer_contact_id = null,
  payer_name,
  payee_user_id = null,
  payee_contact_id = null,
  payee_name,
  amount,
  payment_method = "GPay",
  settled_at = new Date().toISOString().split("T")[0],
  notes = null,
  created_by,
}) {
  const { data, error } = await supabase
    .from("settlements")
    .insert([
      {
        group_id: group_id || null,
        payer_user_id: payer_user_id || null,
        payer_contact_id: payer_contact_id || null,
        payer_name: payer_name.trim(),
        payee_user_id: payee_user_id || null,
        payee_contact_id: payee_contact_id || null,
        payee_name: payee_name.trim(),
        amount: Number(amount),
        payment_method,
        settled_at,
        notes: notes?.trim() || null,
        created_by,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating settlement:", error);
    throw error;
  }

  return data;
}

/**
 * Delete a settlement record
 */
export async function deleteSettlement(settlementId) {
  const { error } = await supabase
    .from("settlements")
    .delete()
    .eq("id", settlementId);

  if (error) {
    console.error("Error deleting settlement:", error);
    throw error;
  }

  return true;
}
