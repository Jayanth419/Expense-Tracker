import React from "react";
import {
  Users,
  Percent,
  CircleDollarSign,
  PieChart,
  Plus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  SPLIT_METHODS,
  formatCurrency,
} from "../../services/calculationEngine";

export default function SplitSelector(props) {
  const {
    totalAmount = 0,
    splitMethod = SPLIT_METHODS.EQUAL,
    exactAmounts = {},
    percentages = {},
    shares = {},
    onOpenAddContact,
  } = props;

  // Support both prop naming variations
  const participants = props.participants || props.selectedParticipants || [];
  const handleSplitMethodChange =
    props.onSplitMethodChange || props.setSplitMethod || (() => {});
  const handleExactAmountsChange =
    props.onExactAmountsChange || props.setExactAmounts || (() => {});
  const handlePercentagesChange =
    props.onPercentagesChange || props.setPercentages || (() => {});
  const handleSharesChange =
    props.onSharesChange || props.setShares || (() => {});

  // Support both splitCalculation and splitValidation / calculatedSplits
  const calculation = props.splitCalculation || {
    isValid: Boolean(props.splitValidation?.isValid),
    totalAssigned: Number(props.splitValidation?.totalAssigned || 0),
    remaining: Number(props.splitValidation?.remaining ?? totalAmount),
    error: props.splitValidation?.error || null,
    shares: props.calculatedSplits || [],
  };

  const calculatedShares = calculation.shares || [];

  const methodTabs = [
    { id: SPLIT_METHODS.EQUAL, label: "Equally", icon: Users },
    { id: SPLIT_METHODS.EXACT, label: "Exact Amounts", icon: CircleDollarSign },
    { id: SPLIT_METHODS.PERCENTAGE, label: "Percentage", icon: Percent },
    { id: SPLIT_METHODS.SHARES, label: "By Shares", icon: PieChart },
  ];

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          Split Method
        </label>
        {onOpenAddContact && (
          <button
            type="button"
            onClick={onOpenAddContact}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Contact
          </button>
        )}
      </div>

      {/* Split Method Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {methodTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = splitMethod === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSplitMethodChange(tab.id)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Participants List */}
      <div className="space-y-2.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Split Between ({participants.length} selected)
        </div>

        <div className="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {participants.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              No participants selected. Please select participants above.
            </div>
          ) : (
            participants.map((p) => {
              const splitRecord = calculatedShares.find(
                (s) =>
                  s.participant?.id === p.id ||
                  s.participant?.key === p.key ||
                  s.id === p.id,
              );
              const shareAmount = splitRecord
                ? splitRecord.amount || splitRecord.share_amount || 0
                : 0;

              return (
                <div
                  key={p.id || p.key}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs shrink-0">
                      {p.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {p.name} {p.isCurrentUser ? "(You)" : ""}
                      </p>
                      {p.email && (
                        <p className="text-xs text-slate-400 truncate">
                          {p.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Input controls based on Split Method */}
                  <div className="flex items-center gap-2 shrink-0">
                    {splitMethod === SPLIT_METHODS.EQUAL && (
                      <span className="text-sm font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {formatCurrency(shareAmount)}
                      </span>
                    )}

                    {splitMethod === SPLIT_METHODS.EXACT && (
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs text-slate-400 font-medium">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={exactAmounts[p.id] ?? ""}
                          onChange={(e) =>
                            handleExactAmountsChange((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className="w-24 pl-6 pr-2 py-1.5 text-sm text-right font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {splitMethod === SPLIT_METHODS.PERCENTAGE && (
                      <div className="flex items-center gap-2">
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={percentages[p.id] ?? ""}
                            onChange={(e) =>
                              handlePercentagesChange((prev) => ({
                                ...prev,
                                [p.id]: e.target.value,
                              }))
                            }
                            placeholder="0"
                            className="w-20 pr-6 pl-2 py-1.5 text-sm text-right font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                          <span className="absolute right-2 text-xs text-slate-400 font-medium">
                            %
                          </span>
                        </div>
                        <span className="text-xs font-medium text-slate-500 w-16 text-right">
                          {formatCurrency(shareAmount)}
                        </span>
                      </div>
                    )}

                    {splitMethod === SPLIT_METHODS.SHARES && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              handleSharesChange((prev) => ({
                                ...prev,
                                [p.id]: Math.max(
                                  1,
                                  Number(prev[p.id] || 1) - 1,
                                ),
                              }))
                            }
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={shares[p.id] ?? 1}
                            onChange={(e) =>
                              handleSharesChange((prev) => ({
                                ...prev,
                                [p.id]: Math.max(
                                  1,
                                  Number(e.target.value) || 1,
                                ),
                              }))
                            }
                            className="w-12 py-1 text-xs text-center font-semibold focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleSharesChange((prev) => ({
                                ...prev,
                                [p.id]: Number(prev[p.id] || 1) + 1,
                              }))
                            }
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-xs font-medium text-slate-500 w-16 text-right">
                          {formatCurrency(shareAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Live Financial Summary & Validation Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
        <div className="flex justify-between text-xs text-slate-600 font-medium">
          <span>Total: {formatCurrency(totalAmount)}</span>
          <span>
            Assigned: {formatCurrency(calculation.totalAssigned || 0)}
          </span>
          <span
            className={
              calculation.remaining === 0
                ? "text-green-600 font-bold"
                : "text-amber-600 font-bold"
            }
          >
            Remaining: {formatCurrency(calculation.remaining || 0)}
          </span>
        </div>

        {/* Validation Status Indicator */}
        {calculation.isValid ? (
          <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span>Split calculations match total expense exactly.</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {calculation.error ||
                "Please adjust splits to match the total expense."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
