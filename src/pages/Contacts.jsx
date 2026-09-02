import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Handshake,
  ChevronRight,
  Smartphone,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { fetchContacts, deleteContact } from "../services/contactService";
import { fetchAllExpensesAndSplits } from "../services/expenseService";
import { fetchSettlements } from "../services/settlementService";
import {
  calculateBalances,
  formatCurrency,
} from "../services/calculationEngine";
import ContactModal from "../components/contacts/ContactModal";
import ImportContactsModal from "../components/contacts/ImportContactsModal";
import ContactDetailsModal from "../components/contacts/ContactDetailsModal";
import SettleUpModal from "../components/settlements/SettleUpModal";
import ExpenseDetailsModal from "../components/expenses/ExpenseDetailsModal";
import { supabase } from "../supabaseClient";

export default function Contacts() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [settleModalConfig, setSettleModalConfig] = useState(null);
  const [viewingExpense, setViewingExpense] = useState(null);

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ["userSession"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    },
  });

  // Fetch contacts
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: () => fetchContacts(user.id),
    enabled: !!user?.id,
  });

  // Fetch all expenses and splits for balance calculations
  const { data: expensesData = { expenses: [], splits: [] } } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: () => fetchAllExpensesAndSplits(user.id),
    enabled: !!user?.id,
  });

  // Fetch all settlements
  const { data: settlements = [] } = useQuery({
    queryKey: ["settlements", user?.id],
    queryFn: () => fetchSettlements(user.id),
    enabled: !!user?.id,
  });

  const safeExpenses = Array.isArray(expensesData)
    ? expensesData
    : expensesData?.expenses || [];
  const safeSplits = expensesData?.splits || [];

  // Calculate comprehensive balances
  const balances = calculateBalances({
    expenses: safeExpenses,
    splits: safeSplits,
    settlements,
    currentUserId: user?.id,
    contacts,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      toast.success("Contact deleted");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  if (contactsLoading) {
    return (
      <div className="text-center py-16 text-slate-500">
        Loading contacts...
      </div>
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
              Contacts Directory
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your contacts, sync from phone, and track balances.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
            {/* Import Contacts Button */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer border border-slate-200 shadow-2xs"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Import Contacts</span>
            </button>

            {/* Add Contact Button */}
            <button
              type="button"
              onClick={() => {
                setEditingContact(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>+ Add Contact</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts by name, email, or phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Contact Cards Grid */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs space-y-4">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {searchQuery
                ? "No matching contacts found"
                : "No contacts added yet"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "Try searching for a different name or phone number."
                : "Add friends and roommates to easily split bills, track balances, and settle debts."}
            </p>
          </div>

          {!searchQuery && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200"
              >
                <Smartphone className="w-4 h-4 text-blue-600" />
                Import from Phone / File
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Add Contact Manually
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredContacts.map((contact) => {
            const pKey = `contact_${contact.id}`;
            const participant = balances.participants.find(
              (p) =>
                p.key === pKey ||
                (contact.user_id && p.key === `user_${contact.user_id}`),
            );
            const net = participant ? participant.netBalance : 0;
            const isOwed = net > 0.009;
            const owes = net < -0.009;

            return (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm hover:border-slate-300 transition cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-2xs">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition truncate max-w-[160px]">
                        {contact.name}
                      </h3>
                      {contact.phone && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </p>
                      )}
                      {contact.email && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition shrink-0" />
                </div>

                {/* Net Balance Status Badge */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    Balance
                  </span>

                  {isOwed && (
                    <div className="flex items-center gap-1 text-green-600 font-bold text-xs bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Owes you {formatCurrency(net)}</span>
                    </div>
                  )}

                  {owes && (
                    <div className="flex items-center gap-1 text-rose-600 font-bold text-xs bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>You owe {formatCurrency(Math.abs(net))}</span>
                    </div>
                  )}

                  {!isOwed && !owes && (
                    <div className="flex items-center gap-1 text-slate-400 font-medium text-xs bg-slate-50 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Settled Up</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile / File Contacts Importer Modal */}
      <ImportContactsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        ownerId={user?.id}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        }}
      />

      {/* Add / Edit Contact Modal */}
      <ContactModal
        isOpen={isAddModalOpen || !!editingContact}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingContact(null);
        }}
        initialContact={editingContact}
        ownerId={user?.id}
        onContactSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        }}
      />

      {/* Contact Details & History Modal */}
      {selectedContact && (
        <ContactDetailsModal
          isOpen={true}
          onClose={() => setSelectedContact(null)}
          contact={{
            ...selectedContact,
            balance: (() => {
              const pKey = `contact_${selectedContact.id}`;
              const participant = balances.participants.find(
                (p) =>
                  p.key === pKey ||
                  (selectedContact.user_id &&
                    p.key === `user_${selectedContact.user_id}`),
              );
              return participant ? participant.netBalance : 0;
            })(),
          }}
          sharedExpenses={safeExpenses.filter((e) => {
            if (!e.is_split) return false;
            const splits = safeSplits.filter((s) => s.expense_id === e.id);
            const isContactInSplit = splits.some(
              (s) =>
                s.contact_id === selectedContact.id ||
                (selectedContact.user_id &&
                  s.user_id === selectedContact.user_id),
            );
            const isContactPayer =
              e.paid_by_contact_id === selectedContact.id ||
              (selectedContact.user_id &&
                e.paid_by_user_id === selectedContact.user_id);
            return isContactInSplit || isContactPayer;
          })}
          sharedSettlements={settlements.filter((s) => {
            return (
              s.payer_contact_id === selectedContact.id ||
              s.payee_contact_id === selectedContact.id ||
              (selectedContact.user_id &&
                (s.payer_user_id === selectedContact.user_id ||
                  s.payee_user_id === selectedContact.user_id))
            );
          })}
          onEditContact={(c) => {
            setSelectedContact(null);
            setEditingContact(c);
          }}
          onDeleteContact={(id) => deleteMutation.mutate(id)}
          onOpenSettleUp={(cfg) => setSettleModalConfig(cfg)}
          onViewExpense={(exp) => {
            const expSplits = safeSplits.filter((s) => s.expense_id === exp.id);
            setViewingExpense({ ...exp, splits: expSplits });
          }}
        />
      )}

      {/* Settle Up Modal */}
      {settleModalConfig && (
        <SettleUpModal
          isOpen={true}
          onClose={() => setSettleModalConfig(null)}
          currentUserId={user?.id}
          currentUserName="You"
          contacts={contacts}
          initialPayer={settleModalConfig.payer}
          initialPayee={settleModalConfig.payee}
          initialAmount={settleModalConfig.amount}
          onSettlementRecorded={() => {
            queryClient.invalidateQueries({ queryKey: ["settlements"] });
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
          }}
        />
      )}

      {/* Expense Details Inspector */}
      {viewingExpense && (
        <ExpenseDetailsModal
          expense={viewingExpense}
          categories={[]}
          currentUserId={user?.id}
          onClose={() => setViewingExpense(null)}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )}
    </div>
  );
}
