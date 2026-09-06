import { supabase } from "../supabaseClient";

/**
 * Fetch all contacts owned by the user
 */
export async function fetchContacts(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("owner_id", userId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching contacts:", error);
    throw error;
  }
  return data || [];
}

/**
 * Add a new contact
 */
export async function createContact({
  owner_id,
  name,
  email = null,
  phone = null,
  avatar_url = null,
  user_id = null,
}) {
  const { data, error } = await supabase
    .from("contacts")
    .insert([
      {
        owner_id,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        avatar_url: avatar_url || null,
        user_id: user_id || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating contact:", error);
    throw error;
  }
  return data;
}

/**
 * Update an existing contact
 */
export async function updateContact(contactId, updates) {
  const { data, error } = await supabase
    .from("contacts")
    .update({
      name: updates.name?.trim(),
      email: updates.email?.trim() || null,
      phone: updates.phone?.trim() || null,
      avatar_url: updates.avatar_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .select()
    .single();

  if (error) {
    console.error("Error updating contact:", error);
    throw error;
  }
  return data;
}

/**
 * Delete a contact
 */
export async function deleteContact(contactId) {
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId);

  if (error) {
    console.error("Error deleting contact:", error);
    throw error;
  }
  return true;
}
