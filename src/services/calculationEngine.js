/**
 * Pure Financial Calculation Engine for Expense Splitting & Debt Simplification
 * All calculations use integer paise (1/100 of INR) to avoid floating-point errors.
 */

export const PAYMENT_METHODS = [
  "Cash",
  "GPay",
  "PhonePe",
  "Paytm",
  "Bank Transfer",
  "Card",
  "Other",
];

export const SPLIT_METHODS = {
  EQUAL: "equal",
  EXACT: "exact",
  PERCENTAGE: "percentage",
  SHARES: "shares",
};

/**
 * Format a number as Indian Currency (INR)
 * @param {number|string} amount
 * @returns {string} e.g. "₹1,200.00"
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Clean helper to convert float/decimal to integer paise
 */
export function toPaise(amount) {
  return Math.round((Number(amount) || 0) * 100);
}

/**
 * Convert paise back to rupee float
 */
export function fromPaise(paise) {
  return Math.round(paise) / 100;
}

/**
 * 1. EQUAL SPLIT
 * Divides total amount equally with deterministic paise distribution.
 * e.g., ₹100 among 3 -> ₹33.34, ₹33.33, ₹33.33 (Sum = ₹100.00 exactly)
 *
 * @param {number|string} totalAmount
 * @param {Array<{id: string, name: string}>} participants
 * @returns {{splits: Array, totalAssigned: number, remaining: number, isValid: boolean, error: string|null}}
 */
export function calculateEqualSplit(totalAmount, participants) {
  const total = Number(totalAmount) || 0;
  if (total <= 0 || !participants || participants.length === 0) {
    return {
      splits: (participants || []).map((p) => ({
        ...p,
        share_amount: 0,
        share_percentage: 0,
        share_count: 1,
      })),
      totalAssigned: 0,
      remaining: total,
      isValid: false,
      error: "Total amount and at least one participant are required.",
    };
  }

  const n = participants.length;
  const totalPaise = toPaise(total);
  const basePaise = Math.floor(totalPaise / n);
  const remainderPaise = totalPaise % n;

  const splits = participants.map((p, index) => {
    // Distribute remainder 1 paisa to the first remainderPaise participants
    const sharePaise = basePaise + (index < remainderPaise ? 1 : 0);
    const shareAmount = fromPaise(sharePaise);
    const percentage = Number(((shareAmount / total) * 100).toFixed(2));

    return {
      ...p,
      share_amount: shareAmount,
      share_percentage: percentage,
      share_count: 1,
    };
  });

  const totalAssignedPaise = splits.reduce(
    (sum, s) => sum + toPaise(s.share_amount),
    0,
  );

  return {
    splits,
    totalAssigned: fromPaise(totalAssignedPaise),
    remaining: 0,
    isValid: true,
    error: null,
  };
}

/**
 * 2. EXACT AMOUNT SPLIT
 * Validates that custom exact amounts entered by the user sum to the total expense.
 *
 * @param {number|string} totalAmount
 * @param {Array<{id: string, name: string}>} participants
 * @param {Record<string, number|string>} exactAmounts Map of participantId -> amount
 * @returns {{splits: Array, totalAssigned: number, remaining: number, isValid: boolean, error: string|null}}
 */
export function calculateExactSplit(
  totalAmount,
  participants,
  exactAmounts = {},
) {
  const total = Number(totalAmount) || 0;
  if (!participants || participants.length === 0) {
    return {
      splits: [],
      totalAssigned: 0,
      remaining: total,
      isValid: false,
      error: "No participants selected.",
    };
  }

  const totalPaise = toPaise(total);
  let totalAssignedPaise = 0;

  const splits = participants.map((p) => {
    const rawVal = exactAmounts[p.id] ?? 0;
    const amountNum = Math.max(0, Number(rawVal) || 0);
    const sharePaise = toPaise(amountNum);
    totalAssignedPaise += sharePaise;

    const percentage =
      total > 0 ? Number(((amountNum / total) * 100).toFixed(2)) : 0;

    return {
      ...p,
      share_amount: amountNum,
      share_percentage: percentage,
      share_count: null,
    };
  });

  const remainingPaise = totalPaise - totalAssignedPaise;
  const remaining = fromPaise(remainingPaise);
  const totalAssigned = fromPaise(totalAssignedPaise);

  let error = null;
  const isValid = remainingPaise === 0 && total > 0;

  if (remainingPaise > 0) {
    error = `Split amounts are ${formatCurrency(remaining)} short of total.`;
  } else if (remainingPaise < 0) {
    error = `Split amounts exceed total by ${formatCurrency(Math.abs(remaining))}.`;
  }

  return {
    splits,
    totalAssigned,
    remaining,
    isValid,
    error,
  };
}

/**
 * 3. PERCENTAGE SPLIT
 * Validates percentages sum to 100% and computes shares with deterministic remainder distribution.
 *
 * @param {number|string} totalAmount
 * @param {Array<{id: string, name: string}>} participants
 * @param {Record<string, number|string>} percentages Map of participantId -> percentage
 * @returns {{splits: Array, totalAssigned: number, remaining: number, totalPercent: number, isValid: boolean, error: string|null}}
 */
export function calculatePercentageSplit(
  totalAmount,
  participants,
  percentages = {},
) {
  const total = Number(totalAmount) || 0;
  if (!participants || participants.length === 0) {
    return {
      splits: [],
      totalAssigned: 0,
      remaining: total,
      totalPercent: 0,
      isValid: false,
      error: "No participants selected.",
    };
  }

  const totalPaise = toPaise(total);
  let totalPercent = 0;

  // Compute raw paise for each percentage
  let allocatedPaise = 0;
  const rawSplits = participants.map((p) => {
    const pct = Math.max(0, Number(percentages[p.id]) || 0);
    totalPercent += pct;

    const sharePaise = Math.round((totalPaise * pct) / 100);
    allocatedPaise += sharePaise;

    return {
      ...p,
      share_percentage: pct,
      share_paise: sharePaise,
    };
  });

  // Adjust 1-paisa rounding difference to the largest participant share if totalPercent is 100
  const isPercentValid = Math.abs(totalPercent - 100) < 0.001;
  let diffPaise = isPercentValid ? totalPaise - allocatedPaise : 0;

  if (diffPaise !== 0 && rawSplits.length > 0) {
    // Find index of highest non-zero share
    let maxIdx = 0;
    for (let i = 1; i < rawSplits.length; i++) {
      if (rawSplits[i].share_paise > rawSplits[maxIdx].share_paise) {
        maxIdx = i;
      }
    }
    rawSplits[maxIdx].share_paise += diffPaise;
  }

  const splits = rawSplits.map((s) => ({
    id: s.id,
    name: s.name,
    user_id: s.user_id,
    contact_id: s.contact_id,
    share_amount: fromPaise(s.share_paise),
    share_percentage: s.share_percentage,
    share_count: null,
  }));

  const totalAssignedPaise = splits.reduce(
    (sum, s) => sum + toPaise(s.share_amount),
    0,
  );
  const totalAssigned = fromPaise(totalAssignedPaise);
  const remaining = fromPaise(totalPaise - totalAssignedPaise);

  let error = null;
  if (!isPercentValid) {
    error = `Percentages must total 100% (currently ${totalPercent.toFixed(1)}%).`;
  }

  return {
    splits,
    totalAssigned,
    remaining,
    totalPercent: Number(totalPercent.toFixed(2)),
    isValid: isPercentValid && total > 0,
    error,
  };
}

/**
 * 4. SHARES SPLIT
 * Computes split based on share weights (e.g., Jayanth: 2, Rahul: 1, Arun: 1).
 *
 * @param {number|string} totalAmount
 * @param {Array<{id: string, name: string}>} participants
 * @param {Record<string, number|string>} shares Map of participantId -> share count
 * @returns {{splits: Array, totalAssigned: number, remaining: number, totalShares: number, isValid: boolean, error: string|null}}
 */
export function calculateShareSplit(totalAmount, participants, shares = {}) {
  const total = Number(totalAmount) || 0;
  if (!participants || participants.length === 0) {
    return {
      splits: [],
      totalAssigned: 0,
      remaining: total,
      totalShares: 0,
      isValid: false,
      error: "No participants selected.",
    };
  }

  let totalShares = 0;
  participants.forEach((p) => {
    const s = Math.max(
      0,
      Number(shares[p.id] !== undefined ? shares[p.id] : 1) || 0,
    );
    totalShares += s;
  });

  if (totalShares <= 0 || total <= 0) {
    return {
      splits: participants.map((p) => ({
        ...p,
        share_amount: 0,
        share_percentage: 0,
        share_count: Number(shares[p.id] || 0),
      })),
      totalAssigned: 0,
      remaining: total,
      totalShares,
      isValid: false,
      error: "Total shares must be greater than 0.",
    };
  }

  const totalPaise = toPaise(total);
  let allocatedPaise = 0;

  const rawSplits = participants.map((p) => {
    const s = Math.max(
      0,
      Number(shares[p.id] !== undefined ? shares[p.id] : 1) || 0,
    );
    const sharePaise = Math.floor((totalPaise * s) / totalShares);
    allocatedPaise += sharePaise;

    return {
      ...p,
      share_count: s,
      share_paise: sharePaise,
    };
  });

  // Distribute remainder paise (1 per participant starting from highest weight)
  let remainderPaise = totalPaise - allocatedPaise;
  if (remainderPaise > 0) {
    // Sort indices by share count descending
    const sortedIndices = rawSplits
      .map((item, index) => ({ index, count: item.share_count }))
      .sort((a, b) => b.count - a.count);

    for (let i = 0; i < remainderPaise && i < sortedIndices.length; i++) {
      rawSplits[sortedIndices[i].index].share_paise += 1;
    }
  }

  const splits = rawSplits.map((s) => {
    const amount = fromPaise(s.share_paise);
    const percentage =
      total > 0 ? Number(((amount / total) * 100).toFixed(2)) : 0;
    return {
      id: s.id,
      name: s.name,
      user_id: s.user_id,
      contact_id: s.contact_id,
      share_amount: amount,
      share_percentage: percentage,
      share_count: s.share_count,
    };
  });

  const totalAssignedPaise = splits.reduce(
    (sum, s) => sum + toPaise(s.share_amount),
    0,
  );

  return {
    splits,
    totalAssigned: fromPaise(totalAssignedPaise),
    remaining: 0,
    totalShares,
    isValid: true,
    error: null,
  };
}

/**
 * Universal Participant Key Helper
 * Ensures stable matching between expenses, splits, contacts, registered users, and settlements.
 */
export function getParticipantKey(participant) {
  if (!participant) return "unknown";
  if (participant.registered_user_id)
    return `user_${participant.registered_user_id}`;
  if (participant.user_id) return `user_${participant.user_id}`;
  if (participant.contact_id) return `contact_${participant.contact_id}`;
  if (participant.id) {
    if (
      String(participant.id).startsWith("user_") ||
      String(participant.id).startsWith("contact_")
    ) {
      return participant.id;
    }
    return participant.isRegistered
      ? `user_${participant.id}`
      : `contact_${participant.id}`;
  }
  return `name_${participant.name || "unknown"}`;
}

/**
 * 5. BALANCE ENGINE
 * Computes net balances and pairwise relationships across expenses, splits, and settlements.
 *
 * Rule:
 * For each participant:
 * net_balance = amount_paid - amount_owed + settlements_received - settlements_sent
 *
 * @param {Object} params
 * @param {Array} params.expenses List of expenses
 * @param {Array} params.splits List of expense_splits
 * @param {Array} params.settlements List of settlements
 * @param {string} params.currentUserId Current user ID (auth.uid())
 * @param {Array} [params.contacts] Known contacts list
 * @param {Array} [params.members] Known group members list
 * @returns {Object} Comprehensive balance data
 */
export function calculateBalances({
  expenses = [],
  splits = [],
  settlements = [],
  currentUserId,
  contacts = [],
  members = [],
} = {}) {
  const safeExpenses = Array.isArray(expenses)
    ? expenses
    : Array.isArray(expenses?.expenses)
      ? expenses.expenses
      : [];
  const safeSplits = Array.isArray(splits)
    ? splits
    : Array.isArray(splits?.splits)
      ? splits.splits
      : [];
  const safeSettlements = Array.isArray(settlements) ? settlements : [];
  const safeContacts = Array.isArray(contacts) ? contacts : [];
  const safeMembers = Array.isArray(members) ? members : [];

  const currentUserKey = currentUserId
    ? `user_${currentUserId}`
    : "current_user";

  // Map of participantKey -> { key, id, name, isCurrentUser, totalPaid, totalOwed, settlementsSent, settlementsReceived, netBalance }
  const balancesMap = new Map();

  function getOrCreateParticipant(
    key,
    defaultName = "Unknown",
    isUser = false,
    userId = null,
    contactId = null,
  ) {
    if (!balancesMap.has(key)) {
      const isCurrent =
        key === currentUserKey || (userId && userId === currentUserId);
      balancesMap.set(key, {
        key,
        id: contactId || userId || key,
        name: defaultName,
        isCurrentUser: isCurrent,
        userId:
          userId || (key.startsWith("user_") ? key.replace("user_", "") : null),
        contactId:
          contactId ||
          (key.startsWith("contact_") ? key.replace("contact_", "") : null),
        totalPaid: 0,
        totalOwed: 0,
        settlementsSent: 0,
        settlementsReceived: 0,
        netBalance: 0,
      });
    }
    const record = balancesMap.get(key);
    if (
      defaultName &&
      defaultName !== "Unknown" &&
      (record.name === "Unknown" || record.name === "You")
    ) {
      record.name = defaultName;
    }
    return record;
  }

  // Initialize with current user
  getOrCreateParticipant(currentUserKey, "You", true, currentUserId);

  // Initialize known contacts
  safeContacts.forEach((c) => {
    if (!c) return;
    const key = c.user_id ? `user_${c.user_id}` : `contact_${c.id}`;
    getOrCreateParticipant(key, c.name, !!c.user_id, c.user_id, c.id);
  });

  // Initialize known members
  safeMembers.forEach((m) => {
    if (!m) return;
    const key = m.registered_user_id
      ? `user_${m.registered_user_id}`
      : m.contact_id
        ? `contact_${m.contact_id}`
        : `member_${m.id}`;
    getOrCreateParticipant(
      key,
      m.name,
      !!m.registered_user_id,
      m.registered_user_id,
      m.contact_id,
    );
  });

  // Index splits by expense_id
  const splitsByExpense = new Map();
  safeSplits.forEach((s) => {
    if (!s || !s.expense_id) return;
    if (!splitsByExpense.has(s.expense_id)) {
      splitsByExpense.set(s.expense_id, []);
    }
    splitsByExpense.get(s.expense_id).push(s);
  });

  // Pairwise tracking: pairwiseMatrix[debtorKey][creditorKey] = amount debtor owes creditor
  const pairwiseMatrix = {};

  function addDebt(debtorKey, creditorKey, amount) {
    if (debtorKey === creditorKey || amount <= 0) return;
    if (!pairwiseMatrix[debtorKey]) pairwiseMatrix[debtorKey] = {};
    pairwiseMatrix[debtorKey][creditorKey] =
      (pairwiseMatrix[debtorKey][creditorKey] || 0) + toPaise(amount);
  }

  function addSettlement(payerKey, payeeKey, amount) {
    if (payerKey === payeeKey || amount <= 0) return;
    // Settlement reduces debt payer owes payee, or creates credit
    if (!pairwiseMatrix[payerKey]) pairwiseMatrix[payerKey] = {};
    pairwiseMatrix[payerKey][payeeKey] =
      (pairwiseMatrix[payerKey][payeeKey] || 0) - toPaise(amount);
  }

  // 1. Process Expenses & Splits
  safeExpenses.forEach((expense) => {
    if (!expense || !expense.is_split) return;

    // Determine Payer Key
    let payerKey = currentUserKey;
    let payerName = "You";

    if (expense.paid_by_user_id) {
      payerKey = `user_${expense.paid_by_user_id}`;
      payerName = expense.paid_by_name || "User";
    } else if (expense.paid_by_contact_id) {
      payerKey = `contact_${expense.paid_by_contact_id}`;
      payerName = expense.paid_by_name || "Contact";
    } else if (expense.user_id) {
      payerKey = `user_${expense.user_id}`;
      payerName = expense.paid_by_name || "You";
    }

    const payer = getOrCreateParticipant(
      payerKey,
      payerName,
      payerKey.startsWith("user_"),
      expense.paid_by_user_id,
      expense.paid_by_contact_id,
    );
    payer.totalPaid += Number(expense.amount) || 0;

    // Process splits for this expense
    const expenseSplits = splitsByExpense.get(expense.id) || [];
    expenseSplits.forEach((split) => {
      let participantKey = currentUserKey;
      let participantName = split.participant_name || "Unknown";

      if (split.user_id) {
        participantKey = `user_${split.user_id}`;
      } else if (split.contact_id) {
        participantKey = `contact_${split.contact_id}`;
      }

      const participant = getOrCreateParticipant(
        participantKey,
        participantName,
        participantKey.startsWith("user_"),
        split.user_id,
        split.contact_id,
      );

      const share = Number(split.share_amount) || 0;
      participant.totalOwed += share;

      // Participant owes share to payer
      if (participantKey !== payerKey) {
        addDebt(participantKey, payerKey, share);
      }
    });
  });

  // 2. Process Settlements
  safeSettlements.forEach((s) => {
    if (!s) return;
    const payerKey = s.payer_user_id
      ? `user_${s.payer_user_id}`
      : s.payer_contact_id
        ? `contact_${s.payer_contact_id}`
        : `name_${s.payer_name}`;
    const payeeKey = s.payee_user_id
      ? `user_${s.payee_user_id}`
      : s.payee_contact_id
        ? `contact_${s.payee_contact_id}`
        : `name_${s.payee_name}`;

    const payer = getOrCreateParticipant(
      payerKey,
      s.payer_name,
      !!s.payer_user_id,
      s.payer_user_id,
      s.payer_contact_id,
    );
    const payee = getOrCreateParticipant(
      payeeKey,
      s.payee_name,
      !!s.payee_user_id,
      s.payee_user_id,
      s.payee_contact_id,
    );

    const amount = Number(s.amount) || 0;
    payer.settlementsSent += amount;
    payee.settlementsReceived += amount;

    addSettlement(payerKey, payeeKey, amount);
  });

  // 3. Compute Net Balances
  const participants = Array.from(balancesMap.values()).map((p) => {
    const net =
      p.totalPaid - p.totalOwed + p.settlementsReceived - p.settlementsSent;
    return {
      ...p,
      totalPaid: fromPaise(toPaise(p.totalPaid)),
      totalOwed: fromPaise(toPaise(p.totalOwed)),
      settlementsSent: fromPaise(toPaise(p.settlementsSent)),
      settlementsReceived: fromPaise(toPaise(p.settlementsReceived)),
      netBalance: fromPaise(toPaise(net)),
    };
  });

  // 4. Net pairwise relations between Current User and everyone else
  const youAreOwedList = [];
  const youOweList = [];
  let totalYouAreOwed = 0;
  let totalYouOwe = 0;

  participants.forEach((p) => {
    if (p.isCurrentUser) return;

    // Debt p owes current user minus debt current user owes p
    const pOwesUserPaise = pairwiseMatrix[p.key]?.[currentUserKey] || 0;
    const userOwesPPaise = pairwiseMatrix[currentUserKey]?.[p.key] || 0;

    const netPaiseWithUser = pOwesUserPaise - userOwesPPaise;
    const netAmountWithUser = fromPaise(netPaiseWithUser);

    if (netAmountWithUser > 0.009) {
      youAreOwedList.push({
        participant: p,
        amount: netAmountWithUser,
      });
      totalYouAreOwed += netAmountWithUser;
    } else if (netAmountWithUser < -0.009) {
      const positiveOwe = Math.abs(netAmountWithUser);
      youOweList.push({
        participant: p,
        amount: positiveOwe,
      });
      totalYouOwe += positiveOwe;
    }
  });

  const currentUserObj = participants.find((p) => p.isCurrentUser) || {
    netBalance: 0,
    totalPaid: 0,
    totalOwed: 0,
  };

  return {
    currentUser: currentUserObj,
    participants,
    totalYouAreOwed: fromPaise(toPaise(totalYouAreOwed)),
    totalYouOwe: fromPaise(toPaise(totalYouOwe)),
    netBalance: fromPaise(toPaise(totalYouAreOwed - totalYouOwe)),
    youAreOwedList: youAreOwedList.sort((a, b) => b.amount - a.amount),
    youOweList: youOweList.sort((a, b) => b.amount - a.amount),
  };
}

/**
 * 6. SIMPLIFY DEBTS (Greedy Min-Cash-Flow Algorithm)
 * Computes the minimum number of transactions needed to settle all debts in a group.
 * Does NOT modify expenses; provides suggested settlements.
 *
 * @param {Array<{id: string, name: string, netBalance: number}>} participants
 * @returns {Array<{fromId: string, fromName: string, toId: string, toName: string, amount: number}>}
 */
export function calculateSimplifiedDebts(participants = []) {
  // Extract non-zero net balances in paise
  const debtors = []; // owes money (negative net)
  const creditors = []; // is owed money (positive net)

  participants.forEach((p) => {
    const netPaise = toPaise(p.netBalance);
    if (netPaise < -0) {
      debtors.push({
        ...p,
        balancePaise: -netPaise, // positive debt amount
      });
    } else if (netPaise > 0) {
      creditors.push({
        ...p,
        balancePaise: netPaise, // positive credit amount
      });
    }
  });

  // Sort debtors and creditors descending by balance
  debtors.sort((a, b) => b.balancePaise - a.balancePaise);
  creditors.sort((a, b) => b.balancePaise - a.balancePaise);

  const transactions = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settlePaise = Math.min(debtor.balancePaise, creditor.balancePaise);
    if (settlePaise > 0) {
      transactions.push({
        fromId: debtor.id,
        fromKey: debtor.key || debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toKey: creditor.key || creditor.id,
        toName: creditor.name,
        amount: fromPaise(settlePaise),
      });

      debtor.balancePaise -= settlePaise;
      creditor.balancePaise -= settlePaise;
    }

    if (debtor.balancePaise === 0) dIdx++;
    if (creditor.balancePaise === 0) cIdx++;
  }

  return transactions;
}
