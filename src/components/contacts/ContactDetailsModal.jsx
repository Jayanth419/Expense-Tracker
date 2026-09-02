import React, { useState } from "react";
import {
  X,
  Phone,
  Mail,
  Receipt,
  Handshake,
  SquarePen,
  Trash2,
  Calendar,
  CreditCard,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "../../services/calculationEngine";

export default function ContactDetailsModal({
  contact,
  onClose,
  balanceInfo,
  sharedExpenses = [],
  sharedSettlements = [],
  onEditContact,
  onDeleteContact,
  onOpenSettleUp,
  onViewExpense,
  currentUserId,
}) {
  const [activeTab, setActiveTab] = useState("expenses"); // 'expenses' | 'settlements'

  if (!contact) return null;

  const contactKey = contact.user_id
    ? `user_${contact.user_id}`
    : `contact_${contact.id}`;
  const netAmount = balanceInfo?.netAmountWithUser || 0;
  const isOwed = netAmount > 0.009;
  const isOwing = netAmount < -0.009;
  const isSettled = !isOwed && !isOwing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs text-white font-black text-2xl flex items-center justify-center shadow-inner">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{contact.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-blue-100 mt-1">
                {contact.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {contact.phone}
                  </span>
                )}
                {contact.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {contact.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Balance Card & Settle Button */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
              Net Balance
            </span>
            {isOwed && (
              <div className="flex items-center gap-1.5 text-green-700 font-extrabold text-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Owes you {formatCurrency(netAmount)}
              </div>
            )}
            {isOwing && (
              <div className="flex items-center gap-1.5 text-rose-700 font-extrabold text-lg">
                <TrendingDown className="w-5 h-5 text-rose-600" />
                You owe {formatCurrency(Math.abs(netAmount))}
              </div>
            )}
            {isSettled && (
              <div className="flex items-center gap-1.5 text-slate-600 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-slate-400" />
                All settled up (₹0.00)
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isSettled && onOpenSettleUp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettleUp({
                    contact,
                    amount: Math.abs(netAmount),
                    payer: isOwing ? { isCurrentUser: true } : contact,
                    payee: isOwing ? contact : { isCurrentUser: true },
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer shadow-xs"
              >
                <Handshake className="w-4 h-4" />
                Settle Up
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            type="button"
            onClick={() => setActiveTab("expenses")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "expenses"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Receipt className="w-4 h-4" />
            Shared Expenses ({sharedExpenses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settlements")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "settlements"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Handshake className="w-4 h-4" />
            Settlements ({sharedSettlements.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {activeTab === "expenses" && (
            <>
              {sharedExpenses.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">
                  No shared expenses recorded with {contact.name} yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {sharedExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      onClick={() => onViewExpense && onViewExpense(exp)}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {exp.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(
                            exp.expense_date || exp.created_at,
                          ).toLocaleDateString()}{" "}
                          • Paid by{" "}
                          {exp.paid_by_name ||
                            (exp.user_id === currentUserId ? "You" : "User")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900">
                          {formatCurrency(exp.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "settlements" && (
            <>
              {sharedSettlements.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">
                  No settlement history with {contact.name} yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {sharedSettlements.map((s) => (
                    <div
                      key={s.id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          <span>{s.payer_name}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{s.payee_name}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {new Date(
                            s.settled_at || s.created_at,
                          ).toLocaleDateString()}{" "}
                          •{" "}
                          <span className="text-slate-600 font-medium">
                            {s.payment_method}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-emerald-600">
                          {formatCurrency(s.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to delete ${contact.name}?`,
                )
              ) {
                onDeleteContact(contact.id);
                onClose();
              }
            }}
            className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Contact
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditContact(contact);
              }}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition cursor-pointer"
            >
              <SquarePen className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
