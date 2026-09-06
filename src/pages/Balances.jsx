import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Handshake,
  CheckCircle2,
  Users,
  Compass,
} from "lucide-react";
import { fetchAllExpensesAndSplits } from "../services/expenseService";
import { fetchSettlements } from "../services/settlementService";
import { fetchContacts } from "../services/contactService";
import { fetchUserGroups } from "../services/groupService";
import {
  calculateBalances,
  formatCurrency,
} from "../services/calculationEngine";
import SettleUpModal from "../components/settlements/SettleUpModal";
import { supabase } from "../supabaseClient";

export default function Balances() {
  const queryClient = useQueryClient();
  const [settleModalConfig, setSettleModalConfig] = useState(null);

  // Current user
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

  // Expenses & Splits
  const {
    data: expensesData = { expenses: [], splits: [] },
    isLoading: expLoading,
  } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: () => fetchAllExpensesAndSplits(user.id),
    enabled: !!user?.id,
  });

  // Settlements
  const { data: settlements = [], isLoading: setLoading } = useQuery({
    queryKey: ["settlements", user?.id],
    queryFn: () => fetchSettlements(user.id),
    enabled: !!user?.id,
  });

  const safeExpenses = Array.isArray(expensesData)
    ? expensesData
    : expensesData?.expenses || [];
  const safeSplits = expensesData?.splits || [];

  // Balances calculation
  const balances = calculateBalances({
    expenses: safeExpenses,
    splits: safeSplits,
    settlements,
    currentUserId: user?.id,
    contacts,
  });

  if (expLoading || setLoading) {
    return (
      <div className="text-center py-16 text-slate-500">
        Calculating balances...
      </div>
    );
  }

  const isNetOwed = balances.netBalance > 0.009;
  const isNetOwing = balances.netBalance < -0.009;
  const isNetSettled = !isNetOwed && !isNetOwing;

  return (
    <div className="space-y-6 animate-fadeIn pb-14 max-w-2xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-blue-600 tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-blue-600" />
            Financial Balances
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time balance breakdown across all personal and shared expenses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSettleModalConfig({})}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-sm cursor-pointer"
        >
          <Handshake className="w-4 h-4" />
          Record Settlement
        </button>
      </div>

      {/* Global Net Balance Overview Cards - Single Row on Mobile & Desktop */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Net Balance */}
        <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
            Net Balance
          </span>
          <div className="mt-1">
            {isNetOwed && (
              <span className="text-sm sm:text-lg lg:text-xl font-black text-green-600 flex items-center gap-1 truncate">
                <TrendingUp className="w-3.5 h-3.5 text-green-500 shrink-0 hidden xs:block" />
                +{formatCurrency(balances.netBalance)}
              </span>
            )}
            {isNetOwing && (
              <span className="text-sm sm:text-lg lg:text-xl font-black text-rose-600 flex items-center gap-1 truncate">
                <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0 hidden xs:block" />
                -{formatCurrency(Math.abs(balances.netBalance))}
              </span>
            )}
            {isNetSettled && (
              <span className="text-sm sm:text-lg lg:text-xl font-black text-slate-600 flex items-center gap-1 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden xs:block" />
                ₹0.00
              </span>
            )}
          </div>
          <p className="text-[9px] sm:text-xs text-slate-400 mt-0.5 truncate">
            {isNetOwed
              ? "Positive balance"
              : isNetOwing
                ? "Negative balance"
                : "Fully settled"}
          </p>
        </div>

        {/* You are Owed */}
        <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
            You're Owed
          </span>
          <span className="text-sm sm:text-lg lg:text-xl font-black text-green-600 mt-1 block truncate">
            {formatCurrency(balances.totalYouAreOwed)}
          </span>
          <p className="text-[9px] sm:text-xs text-slate-400 mt-0.5 truncate">
            {balances.youAreOwedList.length} people
          </p>
        </div>

        {/* You Owe */}
        <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
            You Owe
          </span>
          <span className="text-sm sm:text-lg lg:text-xl font-black text-rose-600 mt-1 block truncate">
            {formatCurrency(balances.totalYouOwe)}
          </span>
          <p className="text-[9px] sm:text-xs text-slate-400 mt-0.5 truncate">
            {balances.youOweList.length} people
          </p>
        </div>
      </div>

      {/* Two-Column List: Who Owes You & Who You Owe */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* People Who Owe You */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-green-600" />
              People Who Owe You ({balances.youAreOwedList.length})
            </h3>
          </div>

          {balances.youAreOwedList.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <p className="text-sm font-medium">
                No one owes you money right now.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {balances.youAreOwedList.map(({ participant, amount }) => (
                <div
                  key={participant.key}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-100 text-green-700 font-bold flex items-center justify-center text-sm">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {participant.name}
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        owes you {formatCurrency(amount)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSettleModalConfig({
                        payer: participant,
                        payee: { isCurrentUser: true },
                        amount,
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer shadow-2xs"
                  >
                    <Handshake className="w-3.5 h-3.5" />
                    Settle
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* People You Owe */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <TrendingDown className="w-5 h-5 text-rose-600" />
              People You Owe ({balances.youOweList.length})
            </h3>
          </div>

          {balances.youOweList.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <p className="text-sm font-medium">
                You don't owe anyone money right now.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {balances.youOweList.map(({ participant, amount }) => (
                <div
                  key={participant.key}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-sm">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {participant.name}
                      </p>
                      <p className="text-xs text-rose-600 font-medium">
                        you owe {formatCurrency(amount)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSettleModalConfig({
                        payer: { isCurrentUser: true },
                        payee: participant,
                        amount,
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer shadow-2xs"
                  >
                    <Handshake className="w-3.5 h-3.5" />
                    Settle
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settle Up Modal */}
      {settleModalConfig && (
        <SettleUpModal
          isOpen={true}
          onClose={() => setSettleModalConfig(null)}
          currentUserId={user?.id}
          currentUserName="You"
          contacts={contacts}
          groups={groups}
          initialPayer={settleModalConfig.payer}
          initialPayee={settleModalConfig.payee}
          initialAmount={settleModalConfig.amount}
          onSettlementCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["settlements"] });
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
          }}
        />
      )}
    </div>
  );
}
