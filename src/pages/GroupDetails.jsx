import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  ArrowLeft,
  Sparkles,
  Handshake,
  Receipt,
  Trash2,
  SquarePen,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Calendar,
  CreditCard,
  UserPlus,
  Eye,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  fetchGroupDetails,
  fetchGroupExpenses,
  fetchGroupSettlements,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
} from "../services/groupService";
import { fetchContacts } from "../services/contactService";
import { deleteExpense } from "../services/expenseService";
import {
  calculateBalances,
  calculateSimplifiedDebts,
  formatCurrency,
} from "../services/calculationEngine";
import GroupModal from "../components/groups/GroupModal";
import SimplifyDebtsModal from "../components/groups/SimplifyDebtsModal";
import SettleUpModal from "../components/settlements/SettleUpModal";
import ExpenseDetailsModal from "../components/expenses/ExpenseDetailsModal";
import { supabase } from "../supabaseClient";

const PUBLIC_BASE_URL =
  "https://ukvbfcsfahvaczymudqu.supabase.co/storage/v1/object/public/expense-images/";

export default function GroupDetails() {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("expenses"); // 'expenses' | 'balances' | 'settlements' | 'members'
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSimplifyModalOpen, setIsSimplifyModalOpen] = useState(false);
  const [settleModalConfig, setSettleModalConfig] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [newMemberName, setNewMemberName] = useState("");

  // User
  const { data: user } = useQuery({
    queryKey: ["userSession"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    },
  });

  // Group Details
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => fetchGroupDetails(groupId),
    enabled: !!groupId,
  });

  // Group Expenses & Splits
  const {
    data: expensesData = { expenses: [], splits: [] },
    isLoading: expLoading,
  } = useQuery({
    queryKey: ["groupExpenses", groupId],
    queryFn: () => fetchGroupExpenses(groupId),
    enabled: !!groupId,
  });

  // Group Settlements
  const { data: settlements = [] } = useQuery({
    queryKey: ["groupSettlements", groupId],
    queryFn: () => fetchGroupSettlements(groupId),
    enabled: !!groupId,
  });

  // Contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: () => fetchContacts(user.id),
    enabled: !!user?.id,
  });

  // Delete Group Mutation
  const deleteGroupMutation = useMutation({
    mutationFn: () => deleteGroup(groupId),
    onSuccess: () => {
      toast.success("Group deleted");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      navigate("/groups");
    },
    onError: (err) => toast.error("Failed to delete group: " + err.message),
  });

  // Delete Expense Mutation
  const deleteExpMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      toast.success("Expense deleted");
      queryClient.invalidateQueries({ queryKey: ["groupExpenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err) => toast.error(err.message),
  });

  // Add Member Mutation
  const addMemberMutation = useMutation({
    mutationFn: (memberPayload) => {
      if (typeof memberPayload === "string") {
        return addGroupMember(groupId, {
          name: memberPayload,
          registered_user_id: null,
          contact_id: null,
        });
      }
      return addGroupMember(groupId, memberPayload);
    },
    onSuccess: () => {
      toast.success("Member added to group!");
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      setNewMemberName("");
    },
    onError: (err) => toast.error("Failed to add member: " + err.message),
  });

  // Remove Member Mutation
  const removeMemberMutation = useMutation({
    mutationFn: removeGroupMember,
    onSuccess: () => {
      toast.success("Member removed from group");
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    },
    onError: (err) => toast.error("Failed to remove member: " + err.message),
  });

  if (groupLoading || expLoading) {
    return (
      <div className="text-center py-16 text-slate-500">
        Loading group details...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p>Group not found or you don't have permission to view it.</p>
        <button
          onClick={() => navigate("/groups")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          Back to Groups
        </button>
      </div>
    );
  }

  const members = group.group_members || [];

  const safeExpenses = Array.isArray(expensesData)
    ? expensesData
    : expensesData?.expenses || [];
  const safeSplits = Array.isArray(expensesData?.splits)
    ? expensesData.splits
    : [];

  // Group Balances
  const groupBalances = calculateBalances({
    expenses: safeExpenses,
    splits: safeSplits,
    settlements,
    currentUserId: user?.id,
    members,
    contacts,
  });

  const totalGroupSpend = safeExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0,
  );

  const simplifiedDebts = calculateSimplifiedDebts(
    groupBalances?.participants || [],
  );

  function handleExportGroupCSV() {
    if (safeExpenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }

    const headers = [
      "Date",
      "Title",
      "Amount (INR)",
      "Split Method",
      "Paid By",
      "Payment Method",
    ];

    const rows = safeExpenses.map((e) => [
      e.expense_date || e.created_at?.split("T")[0],
      `"${(e.title || "").replace(/"/g, '""')}"`,
      e.amount,
      e.split_method || "Equal",
      `"${(e.paid_by_name || "User").replace(/"/g, '""')}"`,
      `"${(e.payment_method || "Cash").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${group.name.replace(/\s+/g, "_")}_expenses_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Group CSV report downloaded!");
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-14 max-w-2xl mx-auto">
      {/* Back Button & Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/groups")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Groups
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportGroupCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setIsSimplifyModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Simplify Debts
          </button>
          <button
            type="button"
            onClick={() =>
              setSettleModalConfig({
                groupId: group.id,
                amount: "",
              })
            }
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <Handshake className="w-3.5 h-3.5" />
            Settle Up
          </button>
        </div>
      </div>

      {/* Main Group Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-extrabold uppercase tracking-wider">
                {group.category || "Trip"}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Created {new Date(group.created_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {group.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              title="Edit Group"
            >
              <SquarePen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to delete this group? All group expenses and splits will be deleted.",
                  )
                ) {
                  deleteGroupMutation.mutate();
                }
              }}
              className="p-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
              title="Delete Group"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Group Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
              Total Group Spend
            </span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">
              {formatCurrency(totalGroupSpend)}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
              Your Group Balance
            </span>
            <div className="mt-0.5">
              {groupBalances.currentUser?.netBalance > 0.009 ? (
                <span className="text-xl font-black text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-5 h-5 text-green-500" />+
                  {formatCurrency(groupBalances.currentUser.netBalance)}
                </span>
              ) : groupBalances.currentUser?.netBalance < -0.009 ? (
                <span className="text-xl font-black text-rose-600 flex items-center gap-1">
                  <TrendingDown className="w-5 h-5 text-rose-500" />-
                  {formatCurrency(
                    Math.abs(groupBalances.currentUser.netBalance),
                  )}
                </span>
              ) : (
                <span className="text-xl font-black text-slate-600 flex items-center gap-1">
                  <CheckCircle2 className="w-5 h-5 text-slate-400" />
                  Settled (₹0.00)
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
              Group Members
            </span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">
              {members.length} {members.length === 1 ? "Person" : "People"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "expenses"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Expenses ({safeExpenses.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("balances")}
          className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "balances"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Balances
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settlements")}
          className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "settlements"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Handshake className="w-4 h-4" />
          Settlements ({settlements.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "members"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Members ({members.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-b-2xl p-6 shadow-sm border border-slate-200 -mt-6">
        {/* TAB 1: GROUP EXPENSES */}
        {activeTab === "expenses" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">
                Group Expenses
              </h3>
              <button
                type="button"
                onClick={() => navigate("/home")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Group Expense
              </button>
            </div>

            {safeExpenses.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">
                  No expenses in this group yet.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Add an expense from the Home page and select "{group.name}".
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {safeExpenses.map((exp) => {
                  const splits = safeSplits.filter(
                    (s) => s.expense_id === exp.id,
                  );
                  return (
                    <div
                      key={exp.id}
                      onClick={() => setSelectedExpense({ ...exp, splits })}
                      className="p-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {exp.title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                            {exp.split_method || "Equal"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(
                              exp.expense_date || exp.created_at,
                            ).toLocaleDateString()}
                          </span>
                          <span>
                            • Paid by{" "}
                            {exp.paid_by_name ||
                              (exp.user_id === user?.id ? "You" : "User")}
                          </span>
                          {exp.payment_method && (
                            <span>• {exp.payment_method}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-base font-black text-slate-900 block">
                            {formatCurrency(exp.amount)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {splits.length}{" "}
                            {splits.length === 1 ? "person" : "people"}
                          </span>
                        </div>
                        {exp.expense_images && (
                          <Eye className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BALANCES */}
        {activeTab === "balances" && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-base">
              Member Balances
            </h3>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {groupBalances.participants.map((p) => {
                const net = p.netBalance;
                const isPositive = net > 0.009;
                const isNegative = net < -0.009;

                return (
                  <div
                    key={p.key}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {p.name} {p.isCurrentUser ? "(You)" : ""}
                        </p>
                        <p className="text-xs text-slate-400">
                          Paid {formatCurrency(p.totalPaid)} • Share{" "}
                          {formatCurrency(p.totalOwed)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {isPositive && (
                        <span className="text-sm font-extrabold text-green-600 block">
                          is owed {formatCurrency(net)}
                        </span>
                      )}
                      {isNegative && (
                        <span className="text-sm font-extrabold text-rose-600 block">
                          owes {formatCurrency(Math.abs(net))}
                        </span>
                      )}
                      {!isPositive && !isNegative && (
                        <span className="text-xs font-semibold text-slate-400 block">
                          Settled (₹0.00)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SETTLEMENTS */}
        {activeTab === "settlements" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">
                Settlement History
              </h3>
              <button
                type="button"
                onClick={() => setSettleModalConfig({ groupId: group.id })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Handshake className="w-3.5 h-3.5" />
                Record Settlement
              </button>
            </div>

            {settlements.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-sm">
                No settlements recorded in this group yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {settlements.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {s.payer_name} paid {s.payee_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(
                          s.settled_at || s.created_at,
                        ).toLocaleDateString()}{" "}
                        • {s.payment_method}
                        {s.notes ? ` • "${s.notes}"` : ""}
                      </p>
                    </div>
                    <span className="text-base font-black text-emerald-600">
                      {formatCurrency(s.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MEMBERS */}
        {activeTab === "members" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">
                Group Members ({members.length})
              </h3>
            </div>

            {/* Add Member Controls */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Add Person to this Group
              </span>

              {/* Add from Contacts */}
              {contacts.filter(
                (c) => !members.some((m) => m.contact_id === c.id),
              ).length > 0 && (
                <div className="flex gap-2">
                  <select
                    id="contactSelectToAdd"
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    defaultValue=""
                    onChange={(e) => {
                      const contactId = e.target.value;
                      if (!contactId) return;
                      const contact = contacts.find((c) => c.id === contactId);
                      if (contact) {
                        addMemberMutation.mutate({
                          contact_id: contact.id,
                          user_id: contact.user_id || null,
                          name: contact.name,
                          email: contact.email || null,
                          phone: contact.phone || null,
                        });
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="" disabled>
                      Choose from your contacts...
                    </option>
                    {contacts
                      .filter(
                        (c) => !members.some((m) => m.contact_id === c.id),
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Or Add by Typing Name */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!newMemberName.trim()) return;
                      addMemberMutation.mutate(newMemberName.trim());
                    }
                  }}
                  placeholder="Or enter new person's name (e.g. Anand)..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newMemberName.trim()) return;
                    addMemberMutation.mutate(newMemberName.trim());
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Name
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {m.name}{" "}
                        {m.registered_user_id === user?.id ? "(You)" : ""}
                      </p>
                      {m.email && (
                        <p className="text-xs text-slate-400">{m.email}</p>
                      )}
                    </div>
                  </div>

                  {m.registered_user_id !== user?.id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove ${m.name} from group? Past expenses involving ${m.name} will remain intact.`,
                          )
                        ) {
                          removeMemberMutation.mutate(m.id);
                        }
                      }}
                      className="text-xs text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Group Modal */}
      <GroupModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialGroup={group}
        currentUserId={user?.id}
        currentUserName="You"
        currentUserEmail={user?.email}
        contacts={contacts}
        onGroupSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["group", groupId] });
        }}
      />

      {/* Simplify Debts Modal */}
      <SimplifyDebtsModal
        isOpen={isSimplifyModalOpen}
        onClose={() => setIsSimplifyModalOpen(false)}
        groupName={group.name}
        simplifiedTransactions={simplifiedDebts}
        onSettleTransaction={(tx) => {
          setSettleModalConfig({
            groupId: group.id,
            payer: { name: tx.fromName, key: tx.fromKey, id: tx.fromId },
            payee: { name: tx.toName, key: tx.toKey, id: tx.toId },
            amount: tx.amount,
          });
        }}
      />

      {/* Settle Up Modal */}
      {settleModalConfig && (
        <SettleUpModal
          isOpen={true}
          onClose={() => setSettleModalConfig(null)}
          currentUserId={user?.id}
          currentUserName="You"
          contacts={contacts}
          initialGroupId={group.id}
          initialPayer={settleModalConfig.payer}
          initialPayee={settleModalConfig.payee}
          initialAmount={settleModalConfig.amount}
          onSettlementCreated={() => {
            queryClient.invalidateQueries({
              queryKey: ["groupSettlements", groupId],
            });
            queryClient.invalidateQueries({
              queryKey: ["groupExpenses", groupId],
            });
            queryClient.invalidateQueries({ queryKey: ["settlements"] });
          }}
        />
      )}

      {/* Expense Details Modal */}
      {selectedExpense && (
        <ExpenseDetailsModal
          expense={selectedExpense}
          currentUserId={user?.id}
          onClose={() => setSelectedExpense(null)}
          onEdit={(exp) => {
            // Navigate to home with edit
            navigate("/home");
          }}
          onDelete={(id) => deleteExpMutation.mutate(id)}
        />
      )}
    </div>
  );
}
