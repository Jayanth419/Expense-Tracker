import { supabase } from "../supabaseClient";

/**
 * Fetch all groups created by or joined by the user
 */
export async function fetchUserGroups(userId) {
  if (!userId) return [];

  // Fetch groups created by user
  const { data: createdGroups, error: createdError } = await supabase
    .from("groups")
    .select("*, group_members(*)")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (createdError) {
    console.error("Error fetching created groups:", createdError);
    throw createdError;
  }

  // Fetch groups where user is a registered member
  const { data: memberOf, error: memberError } = await supabase
    .from("group_members")
    .select("group_id, groups(*, group_members(*))")
    .eq("registered_user_id", userId);

  if (memberError) {
    console.error("Error fetching member groups:", memberError);
    throw memberError;
  }

  const allMap = new Map();
  (createdGroups || []).forEach((g) => allMap.set(g.id, g));
  (memberOf || []).forEach((m) => {
    if (m.groups && !allMap.has(m.groups.id)) {
      allMap.set(m.groups.id, m.groups);
    }
  });

  return Array.from(allMap.values());
}

/**
 * Fetch group details with members
 */
export async function fetchGroupDetails(groupId) {
  if (!groupId) return null;

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("*, group_members(*)")
    .eq("id", groupId)
    .single();

  if (groupError) {
    console.error("Error fetching group:", groupError);
    throw groupError;
  }

  return group;
}

/**
 * Create a group along with its initial members
 */
export async function createGroup({
  name,
  description = null,
  category = "Trip",
  createdBy,
  creatorName = "You",
  creatorEmail = null,
  initialMembers = [],
}) {
  // 1. Insert Group
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert([
      {
        name: name.trim(),
        description: description?.trim() || null,
        category,
        created_by: createdBy,
      },
    ])
    .select()
    .single();

  if (groupError) {
    console.error("Error creating group:", groupError);
    throw groupError;
  }

  // 2. Add creator as first group member
  const membersToInsert = [
    {
      group_id: group.id,
      registered_user_id: createdBy,
      name: creatorName,
      email: creatorEmail,
    },
  ];

  // 3. Add other members
  initialMembers.forEach((m) => {
    // Avoid duplicate creator
    if (m.registered_user_id === createdBy || m.user_id === createdBy) return;
    membersToInsert.push({
      group_id: group.id,
      registered_user_id: m.registered_user_id || m.user_id || null,
      contact_id: m.contact_id || m.id || null,
      name: m.name.trim(),
      email: m.email?.trim() || null,
      phone: m.phone?.trim() || null,
    });
  });

  const { error: membersError } = await supabase
    .from("group_members")
    .insert(membersToInsert);

  if (membersError) {
    console.error("Error adding group members:", membersError);
    throw membersError;
  }

  return group;
}

/**
 * Update group basic details
 */
export async function updateGroup(groupId, updates) {
  const { data, error } = await supabase
    .from("groups")
    .update({
      name: updates.name?.trim(),
      description: updates.description?.trim() || null,
      category: updates.category || "Trip",
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupId)
    .select()
    .single();

  if (error) {
    console.error("Error updating group:", error);
    throw error;
  }
  return data;
}

/**
 * Delete a group
 */
export async function deleteGroup(groupId) {
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) {
    console.error("Error deleting group:", error);
    throw error;
  }
  return true;
}

/**
 * Add a member to an existing group
 */
export async function addGroupMember(groupId, memberData) {
  const { data, error } = await supabase
    .from("group_members")
    .insert([
      {
        group_id: groupId,
        registered_user_id:
          memberData.registered_user_id || memberData.user_id || null,
        contact_id: memberData.contact_id || memberData.id || null,
        name: memberData.name.trim(),
        email: memberData.email?.trim() || null,
        phone: memberData.phone?.trim() || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error adding group member:", error);
    throw error;
  }
  return data;
}

/**
 * Remove a member from a group
 */
export async function removeGroupMember(memberId) {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    console.error("Error removing member:", error);
    throw error;
  }
  return true;
}

/**
 * Fetch group expenses and splits
 */
export async function fetchGroupExpenses(groupId) {
  if (!groupId) return { expenses: [], splits: [] };

  const { data: expenses, error: expError } = await supabase
    .from("Expenses")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (expError) {
    console.error("Error fetching group expenses:", expError);
    throw expError;
  }

  if (!expenses || expenses.length === 0) {
    return { expenses: [], splits: [] };
  }

  const expenseIds = expenses.map((e) => e.id);
  const { data: splits, error: splitError } = await supabase
    .from("expense_splits")
    .select("*")
    .in("expense_id", expenseIds);

  if (splitError) {
    console.error("Error fetching group splits:", splitError);
    throw splitError;
  }

  return { expenses, splits: splits || [] };
}

/**
 * Fetch settlements for a group
 */
export async function fetchGroupSettlements(groupId) {
  if (!groupId) return [];

  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching group settlements:", error);
    throw error;
  }
  return data || [];
}
