import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Handshake,
  Plus,
  Search,
  ArrowRight,
  Calendar,
  CreditCard,
  Trash2,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  fetchSettlements,
  deleteSettlement,
} from "../services/settlementService";
import { fetchContacts } from "../services/contactService";
import { fetchUserGroups } from "../services/groupService";
import { formatCurrency } from "../services/calculationEngine";
import SettleUpModal from "../components/settlements/SettleUpModal";
import { supabase } from "../supabaseClient";

export default function Settlements() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // User
  const { data: user } = useQuery({
    queryKey: ["userSession"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    },
  });

  // Contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: () => fetchContacts(user.id),
    enabled: !!user?.id,
  });

  // Groups
  const { data: groups = [] } = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: () => fetchUserGroups(user.id),
    enabled: !!user?.id,
  });

  // Settlements
  const { data: settlements = [], isLoading: setLoading } = useQuery({
    queryKey: ["settlements", user?.id],
    queryFn: () => fetchSettlements(user.id),
    enabled: !!user?.id,
  });

  // Delete settlement mutation
  const deleteMutation = useMutation({
    mutationFn: deleteSettlement,
    onSuccess: () => {
      toast.success("Settlement deleted");
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err) =>
      toast.error("Failed to delete settlement: " + err.message),
  });

  const filteredSettlements = settlements.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.payer_name?.toLowerCase().includes(q) ||
      s.payee_name?.toLowerCase().includes(q) ||
      s.payment_method?.toLowerCase().includes(q) ||
      s.notes?.toLowerCase().includes(q) ||
      s.groups?.name?.toLowerCase().includes(q)
    );
  });

  if (setLoading) {
    return (
      <div className="text-center py-16 text-slate-500">
        Loading settlement history...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-14 max-w-2xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-blue-600 tracking-tight flex items-center gap-2">
            <Handshake className="w-6 h-6 text-blue-600" />
            Settlements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of payments and settled balances.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRecordModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Record Settlement
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settlements by person, payment method, group, notes..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
        />
      </div>

      {/* Settlements List */}
      {filteredSettlements.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs">
          <Handshake className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">
            {searchQuery
              ? "No matching settlements"
              : "No settlements recorded yet"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {searchQuery
              ? "Try adjusting your search terms."
              : "When you or your friends pay off balances, record them here to keep debts clear."}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Record First Settlement
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
          {filteredSettlements.map((s) => (
            <div
              key={s.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <span>{s.payer_name}</span>
                  <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                    <ArrowRight className="w-3.5 h-3.5 mr-1" /> paid
                  </div>
                  <span>{s.payee_name}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(
                      s.settled_at || s.created_at,
                    ).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    {s.payment_method}
                  </span>
                  {s.groups?.name && (
                    <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
                      Group: {s.groups.name}
                    </span>
                  )}
                </div>

                {s.notes && (
                  <p className="text-xs text-slate-500 italic mt-0.5 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" />"{s.notes}"
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                <span className="text-xl font-black text-emerald-600">
                  {formatCurrency(s.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Delete this settlement record?")) {
                      deleteMutation.mutate(s.id);
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition cursor-pointer"
                  title="Delete Settlement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settle Up Modal */}
      <SettleUpModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        currentUserId={user?.id}
        currentUserName="You"
        contacts={contacts}
        groups={groups}
        onSettlementCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["settlements"] });
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        }}
      />
    </div>
  );
}
