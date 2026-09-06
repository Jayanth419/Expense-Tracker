import React from "react";
import {
  X,
  Calendar,
  Tag,
  CreditCard,
  Users,
  Image as ImageIcon,
  SquarePen,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "../../services/calculationEngine";

const PUBLIC_BASE_URL =
  "https://ukvbfcsfahvaczymudqu.supabase.co/storage/v1/object/public/expense-images/";

export default function ExpenseDetailsModal({
  expense,
  categories = [],
  onClose,
  onEdit,
  onDelete,
  currentUserId,
}) {
  if (!expense) return null;

  const categoryName =
    categories.find((c) => c.id === expense.category_id)?.name ||
    expense.Categories?.name ||
    "Uncategorized";

  const payerName =
    expense.paid_by_name ||
    (expense.user_id === currentUserId ? "You" : "User");
  const isPayerCurrentUser =
    expense.paid_by_user_id === currentUserId ||
    (!expense.paid_by_user_id &&
      !expense.paid_by_contact_id &&
      expense.user_id === currentUserId);

  function handleViewReceipt() {
    if (!expense.expense_images) return;
    const fullUrl = `${PUBLIC_BASE_URL}${expense.expense_images}`;
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Expense Details</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Main Title & Amount Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {expense.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(
                    expense.expense_date || expense.created_at,
                  ).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-blue-500" />
                  {categoryName}
                </span>
                {expense.payment_method && (
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-green-500" />
                    {expense.payment_method}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-blue-600">
                {formatCurrency(expense.amount)}
              </span>
            </div>
          </div>

          {/* Payer Info */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                {payerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Paid by</p>
                <p className="text-sm font-bold text-gray-800">
                  {payerName} {isPayerCurrentUser ? "(You)" : ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                {expense.is_split
                  ? `Split: ${expense.split_method || "Equal"}`
                  : "Personal Expense"}
              </span>
            </div>
          </div>

          {/* Splits Breakdown */}
          {expense.is_split && expense.splits && expense.splits.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Participant Breakdown ({expense.splits.length})
              </h3>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {expense.splits.map((s) => {
                  const isThisPayer =
                    (s.user_id && s.user_id === expense.paid_by_user_id) ||
                    (s.contact_id &&
                      s.contact_id === expense.paid_by_contact_id) ||
                    s.participant_name === payerName;

                  return (
                    <div
                      key={s.id || s.participant_name}
                      className="p-3 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center text-xs">
                          {s.participant_name?.charAt(0).toUpperCase() || "P"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {s.participant_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {isThisPayer ? (
                              <span className="text-green-600 font-medium">
                                Paid the bill
                              </span>
                            ) : (
                              <span>owes {payerName}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(s.share_amount)}
                        </p>
                        {s.share_percentage !== null &&
                          s.share_percentage !== undefined && (
                            <p className="text-xs text-gray-400">
                              {s.share_percentage}%
                            </p>
                          )}
                        {s.share_count !== null &&
                          s.share_count !== undefined && (
                            <p className="text-xs text-gray-400">
                              {s.share_count}{" "}
                              {s.share_count === 1 ? "share" : "shares"}
                            </p>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Receipt Image Button */}
          {expense.expense_images && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleViewReceipt}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl font-medium text-sm transition cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
                View Receipt Image
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(expense.id);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 bg-gray-100 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(expense);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer"
            >
              <SquarePen className="w-4 h-4" />
              Edit Expense
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
