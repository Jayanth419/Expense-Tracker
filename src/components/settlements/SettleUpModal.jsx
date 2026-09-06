import React, { useState, useEffect } from "react";
import {
  X,
  Handshake,
  ArrowRight,
  AlertTriangle,
  Calendar,
  CreditCard,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  PAYMENT_METHODS,
  formatCurrency,
} from "../../services/calculationEngine";
import { createSettlement } from "../../services/settlementService";

export default function SettleUpModal({
  isOpen,
  onClose,
  currentUserId,
  currentUserName = "You",
  contacts = [],
  groups = [],
  initialPayer = null,
  initialPayee = null,
  initialAmount = "",
  initialGroupId = null,
  onSettlementCreated,
}) {
  const [payerId, setPayerId] = useState("");
  const [payeeId, setPayeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("GPay");
  const [settledAt, setSettledAt] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [groupId, setGroupId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available participants list (Current user + Contacts)
  const allPeople = [
    {
      id: `user_${currentUserId}`,
      name: `${currentUserName} (You)`,
      isCurrentUser: true,
      userId: currentUserId,
      contactId: null,
    },
    ...contacts.map((c) => ({
      id: c.user_id ? `user_${c.user_id}` : `contact_${c.id}`,
      name: c.name,
      isCurrentUser: false,
      userId: c.user_id || null,
      contactId: c.id,
    })),
  ];

  useEffect(() => {
    if (isOpen) {
      if (initialPayer) {
        setPayerId(
          initialPayer.key ||
            (initialPayer.isCurrentUser
              ? `user_${currentUserId}`
              : initialPayer.userId
                ? `user_${initialPayer.userId}`
                : `contact_${initialPayer.contactId || initialPayer.id}`),
        );
      } else {
        // Default payer: other contact if provided, or current user
        setPayerId(`user_${currentUserId}`);
      }

      if (initialPayee) {
        setPayeeId(
          initialPayee.key ||
            (initialPayee.isCurrentUser
              ? `user_${currentUserId}`
              : initialPayee.userId
                ? `user_${initialPayee.userId}`
                : `contact_${initialPayee.contactId || initialPayee.id}`),
        );
      } else {
        // Default payee: first contact if available
        const firstContact = contacts[0];
        setPayeeId(
          firstContact
            ? firstContact.user_id
              ? `user_${firstContact.user_id}`
              : `contact_${firstContact.id}`
            : "",
        );
      }

      setAmount(initialAmount ? String(initialAmount) : "");
      setGroupId(initialGroupId || "");
      setPaymentMethod("GPay");
      setSettledAt(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
  }, [
    isOpen,
    initialPayer,
    initialPayee,
    initialAmount,
    initialGroupId,
    currentUserId,
    contacts,
  ]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();

    if (!payerId || !payeeId) {
      toast.error("Please select both payer and payee");
      return;
    }

    if (payerId === payeeId) {
      toast.error("Payer and payee cannot be the same person");
      return;
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid settlement amount greater than 0");
      return;
    }

    const payerObj = allPeople.find((p) => p.id === payerId) || {
      name: "Payer",
    };
    const payeeObj = allPeople.find((p) => p.id === payeeId) || {
      name: "Payee",
    };

    try {
      setIsSubmitting(true);
      await createSettlement({
        group_id: groupId || null,
        payer_user_id: payerObj.userId,
        payer_contact_id: payerObj.contactId,
        payer_name: payerObj.name.replace(" (You)", ""),
        payee_user_id: payeeObj.userId,
        payee_contact_id: payeeObj.contactId,
        payee_name: payeeObj.name.replace(" (You)", ""),
        amount: amt,
        payment_method: paymentMethod,
        settled_at: settledAt,
        notes: notes.trim() || null,
        created_by: currentUserId,
      });

      toast.success(`Settlement of ${formatCurrency(amt)} recorded!`);
      if (onSettlementCreated) onSettlementCreated();
      onClose();
    } catch (err) {
      toast.error("Failed to record settlement: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Handshake className="w-5 h-5" />
            Record a Settlement
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* From -> To Participant Flow */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Who Paid? (Payer)
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              >
                <option value="">Select Payer</option>
                {allPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center -my-1">
              <div className="p-1 bg-white border border-slate-200 rounded-full text-slate-400">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Who Received? (Payee)
              </label>
              <select
                value={payeeId}
                onChange={(e) => setPayeeId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              >
                <option value="">Select Payee</option>
                {allPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-semibold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Settled Date
              </label>
              <input
                type="date"
                value={settledAt}
                onChange={(e) => setSettledAt(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Optional Group Association */}
          {groups.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Related Group (Optional)
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">No Group (Direct Settlement)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sent via UPI ref 12345"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isSubmitting ? "Recording..." : "Save Settlement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
