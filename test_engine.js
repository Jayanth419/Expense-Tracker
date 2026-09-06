import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateShareSplit,
  calculateBalances,
  calculateSimplifiedDebts,
  formatCurrency,
} from "./src/services/calculationEngine.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log(
  "\n================ RUNNING CALCULATION ENGINE TESTS ================\n",
);

// TEST 1: EQUAL SPLIT
{
  const participants = [
    { id: "1", name: "Jayanth" },
    { id: "2", name: "Rahul" },
    { id: "3", name: "Arun" },
    { id: "4", name: "Kiran" },
  ];
  const res = calculateEqualSplit(1200, participants);
  assert(res.isValid, "TEST 1 - Equal split is valid");
  assert(res.totalAssigned === 1200, "TEST 1 - Total assigned is 1200");
  assert(
    res.splits.every((s) => s.share_amount === 300),
    "TEST 1 - Each share is 300",
  );
}

// TEST 2: UNEQUAL EXACT
{
  const participants = [
    { id: "1", name: "Jayanth" },
    { id: "2", name: "Rahul" },
    { id: "3", name: "Arun" },
  ];
  const exactAmounts = { 1: 500, 2: 700, 3: 800 };
  const res = calculateExactSplit(2000, participants, exactAmounts);
  assert(
    res.isValid,
    "TEST 2 - Exact split valid when sum equals total (2000)",
  );
  assert(res.remaining === 0, "TEST 2 - Remaining is 0");
}

// TEST 3: INVALID EXACT SPLIT
{
  const participants = [
    { id: "1", name: "Jayanth" },
    { id: "2", name: "Rahul" },
    { id: "3", name: "Arun" },
  ];
  const exactAmounts = { 1: 500, 2: 700, 3: 600 };
  const res = calculateExactSplit(2000, participants, exactAmounts);
  assert(!res.isValid, "TEST 3 - Invalid exact split when sum is 1800");
  assert(res.remaining === 200, "TEST 3 - Remaining is 200");
  assert(
    res.error.includes("200.00 short"),
    "TEST 3 - Error message specifies amount short",
  );
}

// TEST 4: PERCENTAGE SPLIT
{
  const participants = [
    { id: "1", name: "Jayanth" },
    { id: "2", name: "Rahul" },
    { id: "3", name: "Arun" },
  ];
  const percentages = { 1: 50, 2: 25, 3: 25 };
  const res = calculatePercentageSplit(2000, participants, percentages);
  assert(res.isValid, "TEST 4 - Percentage split is valid for 100%");
  assert(res.splits[0].share_amount === 1000, "TEST 4 - Jayanth gets 1000");
  assert(res.splits[1].share_amount === 500, "TEST 4 - Rahul gets 500");
  assert(res.splits[2].share_amount === 500, "TEST 4 - Arun gets 500");
}

// TEST 5: INVALID PERCENTAGE
{
  const participants = [
    { id: "1", name: "Jayanth" },
    { id: "2", name: "Rahul" },
    { id: "3", name: "Arun" },
  ];
  const percentages = { 1: 50, 2: 20, 3: 20 }; // 90%
  const res = calculatePercentageSplit(2000, participants, percentages);
  assert(!res.isValid, "TEST 5 - Percentage split fails when sum is 90%");
  assert(
    res.error.includes("Percentages must total 100%"),
    "TEST 5 - Shows percentage error",
  );
}

// TEST 6: SHARES SPLIT
{
  const participants = [
    { id: "1", name: "Jayanth" },
    { id: "2", name: "Rahul" },
    { id: "3", name: "Arun" },
  ];
  const shares = { 1: 2, 2: 1, 3: 1 }; // Total 4 shares
  const res = calculateShareSplit(3000, participants, shares);
  assert(res.isValid, "TEST 6 - Shares split is valid");
  assert(
    res.splits[0].share_amount === 1500,
    "TEST 6 - Jayanth gets 1500 (2 shares)",
  );
  assert(
    res.splits[1].share_amount === 750,
    "TEST 6 - Rahul gets 750 (1 share)",
  );
  assert(
    res.splits[2].share_amount === 750,
    "TEST 6 - Arun gets 750 (1 share)",
  );
}

// TEST 7: ROUNDING (100 / 3)
{
  const participants = [
    { id: "1", name: "P1" },
    { id: "2", name: "P2" },
    { id: "3", name: "P3" },
  ];
  const res = calculateEqualSplit(100, participants);
  assert(res.isValid, "TEST 7 - 100 / 3 equal split is valid");
  assert(
    res.splits[0].share_amount === 33.34,
    "TEST 7 - P1 receives remainder paisa (33.34)",
  );
  assert(res.splits[1].share_amount === 33.33, "TEST 7 - P2 receives 33.33");
  assert(res.splits[2].share_amount === 33.33, "TEST 7 - P3 receives 33.33");
  const sum = res.splits.reduce((acc, s) => acc + s.share_amount, 0);
  assert(
    Number(sum.toFixed(2)) === 100.0,
    "TEST 7 - Sum of shares is exactly 100.00",
  );
}

// TEST 8: MULTIPLE EXPENSES & NET BALANCES
{
  const currentUserId = "u_jayanth";
  const expenses = [
    {
      id: 1,
      is_split: true,
      amount: 1200,
      user_id: "u_jayanth",
      paid_by_user_id: "u_jayanth",
      paid_by_name: "Jayanth",
    },
    {
      id: 2,
      is_split: true,
      amount: 800,
      paid_by_contact_id: "c_rahul",
      paid_by_name: "Rahul",
    },
  ];

  const splits = [
    // Exp 1: Jayanth paid 1200, Jayanth 900, Rahul 300
    {
      expense_id: 1,
      user_id: "u_jayanth",
      participant_name: "Jayanth",
      share_amount: 900,
    },
    {
      expense_id: 1,
      contact_id: "c_rahul",
      participant_name: "Rahul",
      share_amount: 300,
    },
    // Exp 2: Rahul paid 800, Jayanth 200, Rahul 600
    {
      expense_id: 2,
      user_id: "u_jayanth",
      participant_name: "Jayanth",
      share_amount: 200,
    },
    {
      expense_id: 2,
      contact_id: "c_rahul",
      participant_name: "Rahul",
      share_amount: 600,
    },
  ];

  const balances = calculateBalances({
    expenses,
    splits,
    settlements: [],
    currentUserId,
    contacts: [{ id: "c_rahul", name: "Rahul" }],
  });

  // Net: Rahul owed Jayanth 300, Jayanth owed Rahul 200 -> Net: Rahul owes Jayanth 100
  const rahulBalance = balances.youAreOwedList.find(
    (i) => i.participant.name === "Rahul",
  );
  assert(
    rahulBalance && rahulBalance.amount === 100,
    "TEST 8 - Rahul net owes Jayanth 100",
  );
  assert(
    balances.totalYouAreOwed === 100,
    "TEST 8 - Total you are owed is 100",
  );
  assert(balances.totalYouOwe === 0, "TEST 8 - Total you owe is 0");
}

// TEST 9 & 10: SETTLEMENTS (Full and Partial)
{
  const currentUserId = "u_jayanth";
  const expenses = [
    {
      id: 1,
      is_split: true,
      amount: 1000,
      paid_by_user_id: "u_jayanth",
      paid_by_name: "Jayanth",
    },
  ];
  const splits = [
    {
      expense_id: 1,
      user_id: "u_jayanth",
      participant_name: "Jayanth",
      share_amount: 500,
    },
    {
      expense_id: 1,
      contact_id: "c_rahul",
      participant_name: "Rahul",
      share_amount: 500,
    },
  ];

  // Partial Settlement of 200 from Rahul to Jayanth
  const partialSettlement = [
    {
      id: "s1",
      payer_contact_id: "c_rahul",
      payer_name: "Rahul",
      payee_user_id: "u_jayanth",
      payee_name: "Jayanth",
      amount: 200,
    },
  ];

  const partialBal = calculateBalances({
    expenses,
    splits,
    settlements: partialSettlement,
    currentUserId,
    contacts: [{ id: "c_rahul", name: "Rahul" }],
  });

  const rahulPartial = partialBal.youAreOwedList.find(
    (i) => i.participant.name === "Rahul",
  );
  assert(
    rahulPartial && rahulPartial.amount === 300,
    "TEST 10 - Partial settlement: remaining balance is 300",
  );

  // Full Settlement: Additional 300
  const fullSettlement = [
    ...partialSettlement,
    {
      id: "s2",
      payer_contact_id: "c_rahul",
      payer_name: "Rahul",
      payee_user_id: "u_jayanth",
      payee_name: "Jayanth",
      amount: 300,
    },
  ];

  const fullBal = calculateBalances({
    expenses,
    splits,
    settlements: fullSettlement,
    currentUserId,
    contacts: [{ id: "c_rahul", name: "Rahul" }],
  });

  assert(
    fullBal.youAreOwedList.length === 0,
    "TEST 9 - Full settlement: Outstanding is 0",
  );
  assert(fullBal.netBalance === 0, "TEST 9 - Overall net balance is 0");
}

// TEST 11: DEBT SIMPLIFICATION (Min Cash Flow)
{
  // A owes B 500, B owes C 500, C owes A 500 -> Everyone's net balance is 0
  const participants = [
    { id: "A", name: "Alice", netBalance: 0 },
    { id: "B", name: "Bob", netBalance: 0 },
    { id: "C", name: "Charlie", netBalance: 0 },
  ];
  const simplified = calculateSimplifiedDebts(participants);
  assert(
    simplified.length === 0,
    "TEST 11 - Debt Simplification: 0 transactions needed when cyclic net balance is 0",
  );

  // A owes 500, B owes 300, C is owed 800
  const p2 = [
    { id: "A", name: "Alice", netBalance: -500 },
    { id: "B", name: "Bob", netBalance: -300 },
    { id: "C", name: "Charlie", netBalance: 800 },
  ];
  const s2 = calculateSimplifiedDebts(p2);
  assert(s2.length === 2, "TEST 11 - 2 transactions to settle 3 people");
  assert(
    s2.some(
      (t) =>
        t.fromName === "Alice" && t.toName === "Charlie" && t.amount === 500,
    ),
    "TEST 11 - Alice pays Charlie 500",
  );
  assert(
    s2.some(
      (t) => t.fromName === "Bob" && t.toName === "Charlie" && t.amount === 300,
    ),
    "TEST 11 - Bob pays Charlie 300",
  );
}

console.log(
  `\n================ TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ================\n`,
);
if (failed > 0) process.exit(1);
