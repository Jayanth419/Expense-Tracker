import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Search,
  ChevronRight,
  Compass,
  Home as HomeIcon,
  Briefcase,
  Utensils,
  Calendar,
  Layers,
} from "lucide-react";
import { fetchUserGroups } from "../services/groupService";
import { fetchContacts } from "../services/contactService";
import { fetchAllExpensesAndSplits } from "../services/expenseService";
import { fetchSettlements } from "../services/settlementService";
import {
  calculateBalances,
  formatCurrency,
} from "../services/calculationEngine";
import GroupModal from "../components/groups/GroupModal";
import { supabase } from "../supabaseClient";

const CATEGORY_ICONS = {
  Trip: Compass,
  Roommates: HomeIcon,
  Office: Briefcase,
  Dining: Utensils,
  Family: Users,
  Event: Calendar,
  Other: Layers,
};

export default function Groups() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Current user
  const { data: user } = useQuery({
    queryKey: ["userSession"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    },
  });

  // Groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: () => fetchUserGroups(user.id),
    enabled: !!user?.id,
  });

  // Contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: () => fetchContacts(user.id),
    enabled: !!user?.id,
  });

  // Expenses & Splits
  const { data: expensesData = { expenses: [], splits: [] } } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: () => fetchAllExpensesAndSplits(user.id),
    enabled: !!user?.id,
  });

  // Settlements
  const { data: settlements = [] } = useQuery({
    queryKey: ["settlements", user?.id],
    queryFn: () => fetchSettlements(user.id),
    enabled: !!user?.id,
  });

  const filteredGroups = groups.filter((g) => {
    const q = searchQuery.toLowerCase();
    return (
      g.name?.toLowerCase().includes(q) ||
      g.category?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q)
    );
  });

  if (groupsLoading) {
    return (
      <div className="text-center py-16 text-slate-500">Loading groups...</div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn pb-14 max-w-2xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-blue-600 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              Groups & Trips
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize shared expenses with roommates, trips, and friends.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer whitespace-nowrap w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Create Group</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search groups by name or category..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Group Cards Grid */}
      {filteredGroups.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-2xs">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery ? "No matching groups" : "No groups created yet"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {searchQuery
              ? "Try searching for a different group name."
              : "Create a group for your next trip, apartment, or project to easily manage shared spending."}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Your First Group
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredGroups.map((group) => {
            const Icon = CATEGORY_ICONS[group.category] || Compass;

            const allExpenses = Array.isArray(expensesData)
              ? expensesData
              : expensesData?.expenses || [];
            const allSplits = expensesData?.splits || [];

            // Calculate group-specific totals and user balance
            const groupExpenses = allExpenses.filter(
              (e) => e.group_id === group.id,
            );
            const totalGroupSpend = groupExpenses.reduce(
              (sum, e) => sum + (Number(e.amount) || 0),
              0,
            );

            const groupSplits = allSplits.filter((s) =>
              groupExpenses.some((e) => e.id === s.expense_id),
            );
            const groupSettlements = settlements.filter(
              (s) => s.group_id === group.id,
            );

            const groupBalances = calculateBalances({
              expenses: groupExpenses,
              splits: groupSplits,
              settlements: groupSettlements,
              currentUserId: user?.id,
              members: group.group_members || [],
            });

            const userNet = groupBalances.currentUser?.netBalance || 0;
            const members = group.group_members || [];

            return (
              <div
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-4 group"
              >
                {/* Header info */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition">
                          {group.name}
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          {group.category || "Trip"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition shrink-0" />
                  </div>

                  {group.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </div>

                {/* Member Preview Avatars */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                    {members.slice(0, 4).map((m, idx) => (
                      <div
                        key={idx}
                        className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-2xs"
                        title={m.name}
                      >
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {members.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center border-2 border-white">
                        +{members.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="font-medium">
                    {members.length}{" "}
                    {members.length === 1 ? "member" : "members"}
                  </span>
                </div>

                {/* Financial Summary Bar */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Total Spend
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {formatCurrency(totalGroupSpend)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Your Balance
                    </span>
                    {userNet > 0.009 ? (
                      <span className="text-xs font-extrabold text-green-600">
                        +{formatCurrency(userNet)}
                      </span>
                    ) : userNet < -0.009 ? (
                      <span className="text-xs font-extrabold text-rose-600">
                        -{formatCurrency(Math.abs(userNet))}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">
                        Settled (₹0)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <GroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUserId={user?.id}
        currentUserName="You"
        currentUserEmail={user?.email}
        contacts={contacts}
        onGroupSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["groups"] });
        }}
      />
    </div>
  );
}
