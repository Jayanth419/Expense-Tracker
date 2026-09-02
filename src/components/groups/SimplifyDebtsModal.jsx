import React from "react";
import { X, Sparkles, ArrowRight, CheckCircle, Handshake } from "lucide-react";
import { formatCurrency } from "../../services/calculationEngine";

export default function SimplifyDebtsModal({
  isOpen,
  onClose,
  groupName,
  simplifiedTransactions = [],
  onSettleTransaction,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            Simplify Debts for {groupName}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-sm text-slate-600">
            Debt simplification calculates the optimal minimal transfers to
            settle everyone's net balances with the fewest payments.
          </p>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-800">
            💡 <strong>Note:</strong> Simplifying debts does not change past
            expenses. It provides suggested settlement transfers you can record
            when payments are made.
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Suggested Settlements ({simplifiedTransactions.length})
            </h3>

            {simplifiedTransactions.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-200">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">All settled up!</p>
                <p className="text-xs text-slate-500 mt-1">
                  There are no outstanding debts in this group.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                {simplifiedTransactions.map((tx, idx) => (
                  <div
                    key={idx}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">
                          {tx.fromName}
                        </span>
                        <div className="flex items-center text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full text-xs font-medium">
                          <ArrowRight className="w-3.5 h-3.5 mr-1" /> pays
                        </div>
                        <span className="font-semibold text-slate-800 text-sm">
                          {tx.toName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="text-base font-extrabold text-indigo-600">
                        {formatCurrency(tx.amount)}
                      </span>
                      {onSettleTransaction && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSettleTransaction(tx);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer shadow-xs"
                        >
                          <Handshake className="w-3.5 h-3.5" />
                          Record
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
