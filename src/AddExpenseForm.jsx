import React, { useState, useEffect, useRef, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  CreditCard,
  Layers,
  Plus,
  Split,
  Tag,
  Calendar,
  Image as ImageIcon,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "./supabaseClient";
import { fetchContacts } from "./services/contactService";
import { fetchUserGroups } from "./services/groupService";
import {
  createExpense,
  updateExpense,
  fetchExpenseDetails,
} from "./services/expenseService";
import {
  PAYMENT_METHODS,
  SPLIT_METHODS,
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateShareSplit,
  formatCurrency,
} from "./services/calculationEngine";
import SplitSelector from "./components/splits/SplitSelector";
import QuickAddContactModal from "./components/contacts/QuickAddContactModal";

async function fetchCategories() {
  const { data, error } = await supabase.from("Categories").select("*");
  if (error) throw error;
  return data || [];
}

async function uploadExpenseImage(file) {
  if (!file) return null;

  const ext = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `receipts/${fileName}`;

  const { error } = await supabase.storage
    .from("expense-images")
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  return filePath;
}

export default function AddExpenseForm({ initialData, onCancelEdit }) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const fileRef = useRef(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [expenseDate, setExpenseDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [expenseImage, setExpenseImage] = useState(null);
  const [existingImage, setExistingImage] = useState(null);

  // Split States
  const [isSplit, setIsSplit] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [paidByKey, setPaidByKey] = useState("user_current");
  const [splitMethod, setSplitMethod] = useState(SPLIT_METHODS.EQUAL);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState(
    new Set(["user_current"]),
  );
  const [exactAmounts, setExactAmounts] = useState({});
  const [percentages, setPercentages] = useState({});
  const [shares, setShares] = useState({});
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

  // Fetch Current User
  const { data: user } = useQuery({
    queryKey: ["userSession"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    },
  });

  // Fetch Categories
  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  // Fetch Contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: () => fetchContacts(user.id),
    enabled: !!user?.id,
  });

  // Fetch Groups
  const { data: groups = [] } = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: () => fetchUserGroups(user.id),
    enabled: !!user?.id,
  });

  // Initialize data on edit mode
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setAmount(initialData.amount ? String(initialData.amount) : "");
      setCategoryId(initialData.category_id || "");
      setExpenseDate(
        initialData.expense_date ||
          initialData.created_at?.split("T")[0] ||
          today,
      );
      setPaymentMethod(initialData.payment_method || "Cash");
      setExistingImage(initialData.expense_images || null);
      setIsSplit(Boolean(initialData.is_split));
      setGroupId(initialData.group_id || "");
      setSplitMethod(initialData.split_method || SPLIT_METHODS.EQUAL);

      // Determine who paid
      if (initialData.paid_by_contact_id) {
        setPaidByKey(`contact_${initialData.paid_by_contact_id}`);
      } else if (
        initialData.paid_by_user_id &&
        initialData.paid_by_user_id !== user?.id
      ) {
        setPaidByKey(`user_${initialData.paid_by_user_id}`);
      } else {
        setPaidByKey("user_current");
      }

      // Fetch splits for this expense if editing
      if (initialData.is_split && initialData.id) {
        fetchExpenseDetails(initialData.id).then((details) => {
          if (details?.splits && details.splits.length > 0) {
            const pIds = new Set();
            const exactMap = {};
            const pctMap = {};
            const shareMap = {};

            details.splits.forEach((s) => {
              let pKey;
              if (s.user_id === user?.id) {
                pKey = "user_current";
              } else if (s.user_id) {
                pKey = `user_${s.user_id}`;
              } else if (s.contact_id) {
                pKey = `contact_${s.contact_id}`;
              } else {
                pKey = `name_${s.participant_name}`;
              }

              pIds.add(pKey);
              if (s.share_amount) exactMap[pKey] = s.share_amount;
              if (s.share_percentage) pctMap[pKey] = s.share_percentage;
              if (s.share_count) shareMap[pKey] = s.share_count;
            });

            setSelectedParticipantIds(pIds);
            setExactAmounts(exactMap);
            setPercentages(pctMap);
            setShares(shareMap);
          }
        });
      }
    } else {
      // Reset form
      setTitle("");
      setAmount("");
      setCategoryId("");
      setExpenseDate(today);
      setPaymentMethod("Cash");
      setExpenseImage(null);
      setExistingImage(null);
      setIsSplit(false);
      setGroupId("");
      setPaidByKey("user_current");
      setSplitMethod(SPLIT_METHODS.EQUAL);
      setSelectedParticipantIds(new Set(["user_current"]));
      setExactAmounts({});
      setPercentages({});
      setShares({});
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [initialData, user?.id, today]);

  // Available participants list
  const availableParticipants = useMemo(() => {
    const list = [
      {
        id: "user_current",
        key: "user_current",
        name: user?.user_metadata?.full_name || "You",
        email: user?.email,
        isCurrentUser: true,
        user_id: user?.id,
        contact_id: null,
      },
    ];

    if (groupId) {
      const selectedGroup = groups.find((g) => g.id === groupId);
      if (selectedGroup?.group_members) {
        selectedGroup.group_members.forEach((m) => {
          if (m.registered_user_id === user?.id) return;
          const id = m.registered_user_id
            ? `user_${m.registered_user_id}`
            : m.contact_id
              ? `contact_${m.contact_id}`
              : `member_${m.id}`;

          list.push({
            id,
            key: id,
            name: m.name,
            email: m.email,
            phone: m.phone,
            isCurrentUser: false,
            user_id: m.registered_user_id || null,
            contact_id: m.contact_id || null,
          });
        });
      }
    } else {
      contacts.forEach((c) => {
        const id = `contact_${c.id}`;
        list.push({
          id,
          key: id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          isCurrentUser: false,
          user_id: c.user_id || null,
          contact_id: c.id,
        });
      });
    }

    return list;
  }, [user, contacts, groups, groupId]);

  // Selected participants
  const selectedParticipants = useMemo(() => {
    return availableParticipants.filter((p) =>
      selectedParticipantIds.has(p.id),
    );
  }, [availableParticipants, selectedParticipantIds]);

  // Live split calculation
  const splitCalculation = useMemo(() => {
    const numericAmount = Number(amount) || 0;
    if (numericAmount <= 0 || selectedParticipants.length === 0) {
      return {
        shares: selectedParticipants.map((p) => ({
          participant: p,
          amount: 0,
        })),
        isValid: false,
        totalAssigned: 0,
        remaining: numericAmount,
        error: null,
      };
    }

    switch (splitMethod) {
      case SPLIT_METHODS.EQUAL:
        return calculateEqualSplit(numericAmount, selectedParticipants);
      case SPLIT_METHODS.EXACT:
        return calculateExactSplit(
          numericAmount,
          selectedParticipants,
          exactAmounts,
        );
      case SPLIT_METHODS.PERCENTAGE:
        return calculatePercentageSplit(
          numericAmount,
          selectedParticipants,
          percentages,
        );
      case SPLIT_METHODS.SHARES:
        return calculateShareSplit(numericAmount, selectedParticipants, shares);
      default:
        return calculateEqualSplit(numericAmount, selectedParticipants);
    }
  }, [
    amount,
    splitMethod,
    selectedParticipants,
    exactAmounts,
    percentages,
    shares,
  ]);

  // Participant toggle
  function handleToggleParticipant(participantId) {
    setSelectedParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        if (next.size > 1) {
          next.delete(participantId);
        } else {
          toast.error("At least one participant is required");
        }
      } else {
        next.add(participantId);
      }
      return next;
    });
  }

  function handleSelectAllParticipants() {
    setSelectedParticipantIds(new Set(availableParticipants.map((p) => p.id)));
  }

  function handleDeselectAllExceptMe() {
    setSelectedParticipantIds(new Set(["user_current"]));
  }

  function handleInlineContactCreated(newContact) {
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    const contactKey = `contact_${newContact.id}`;
    setSelectedParticipantIds((prev) => new Set([...prev, contactKey]));
  }

  // Submit Mutation
  const mutation = useMutation({
    mutationFn: async () => {
      let imagePath = existingImage;

      if (expenseImage) {
        imagePath = await uploadExpenseImage(expenseImage);
      }

      // Determine who paid
      const payer = availableParticipants.find((p) => p.id === paidByKey);
      const paidByUserId = payer?.isCurrentUser
        ? user.id
        : payer?.user_id || null;
      const paidByContactId = payer?.contact_id || null;
      const paidByName = payer?.name || user?.user_metadata?.full_name || "You";

      const expenseData = {
        title: title.trim(),
        amount: Number(amount),
        category_id: categoryId,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        expense_images: imagePath,
        user_id: user.id,
        is_split: isSplit,
        group_id: isSplit && groupId ? groupId : null,
        split_method: isSplit ? splitMethod : null,
        paid_by_user_id: isSplit ? paidByUserId : user.id,
        paid_by_contact_id: isSplit ? paidByContactId : null,
        paid_by_name: isSplit
          ? paidByName
          : user?.user_metadata?.full_name || "You",
      };

      const splitsData =
        isSplit && splitCalculation.isValid
          ? splitCalculation.shares.map((s) => ({
              user_id: s.participant.user_id || null,
              contact_id: s.participant.contact_id || null,
              participant_name: s.participant.name,
              share_amount: s.amount,
              share_percentage: s.percentage || null,
              share_count: s.shares || null,
            }))
          : [];
      let splitsData = [];
      if (isSplit && splitCalculation?.isValid) {
        const calculatedList =
          splitCalculation?.splits || splitCalculation?.shares || [];

        splitsData = calculatedList.map((s) => {
          const participantObj =
            s.participant ||
            availableParticipants.find(
              (p) => p.id === s.id || p.key === s.id || p.id === s.key,
            ) ||
            {};

          const pUserId = participantObj.isCurrentUser
            ? user.id
            : participantObj.user_id || s.user_id || null;
          const pContactId = participantObj.contact_id || s.contact_id || null;
          const pName =
            participantObj.name ||
            s.participant_name ||
            s.name ||
            "Participant";
          const pAmount = Number(s.share_amount ?? s.amount ?? 0);
          const pPercentage =
            s.share_percentage !== undefined && s.share_percentage !== null
              ? Number(s.share_percentage)
              : s.percentage !== undefined && s.percentage !== null
                ? Number(s.percentage)
                : null;
          const pShares =
            s.share_count !== undefined && s.share_count !== null
              ? Number(s.share_count)
              : s.shares !== undefined && s.shares !== null
                ? Number(s.shares)
                : null;

          return {
            user_id: pUserId,
            contact_id: pContactId,
            participant_name: pName,
            share_amount: pAmount,
            share_percentage: pPercentage,
            share_count: pShares,
          };
        });
      }

      if (initialData?.id) {
        return await updateExpense(initialData.id, expenseData, splitsData);
      } else {
        return await createExpense(expenseData, splitsData);
      }
    },
    onSuccess: () => {
      toast.success(
        initialData
          ? "Expense updated successfully!"
          : "Expense added successfully!",
      );
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });

      if (onCancelEdit) {
        onCancelEdit();
      } else {
        setTitle("");
        setAmount("");
        setCategoryId("");
        setExpenseDate(today);
        setPaymentMethod("Cash");
        setExpenseImage(null);
        setExistingImage(null);
        setIsSplit(false);
        setGroupId("");
        setPaidByKey("user_current");
        setSelectedParticipantIds(new Set(["user_current"]));
        setExactAmounts({});
        setPercentages({});
        setShares({});
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    onError: (err) => {
      toast.error("Failed to save expense: " + err.message);
    },
  });

  function handleSubmit(e) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter an expense title");
      return;
    }

    if (Number(amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }

    if (isSplit) {
      if (selectedParticipants.length === 0) {
        toast.error("Please select at least one participant to split with");
        return;
      }
      if (!splitCalculation.isValid) {
        toast.error(
          splitCalculation.error ||
            "Please adjust splits to match the total amount.",
        );
        return;
      }
    }

    mutation.mutate();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Expense Title */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Expense Title
          </label>
          <input
            type="text"
            placeholder="e.g. Grocery Shopping"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 font-medium placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition bg-white text-sm sm:text-base"
            required
          />
        </div>

        {/* Amount & Expense Date Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Amount (₹ )
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 font-bold placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition bg-white text-sm sm:text-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Expense Date
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition bg-white text-sm sm:text-base"
              required
            />
          </div>
        </div>

        {/* Category & Payment Method Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-sm sm:text-base"
              required
            >
              <option value="">Select Category</option>
              {catLoading ? (
                <option>Loading categories...</option>
              ) : (
                categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-sm sm:text-base"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expense Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Expense Image
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setExpenseImage(e.target.files[0])}
            className="w-full file:border file:rounded-lg file:px-3 file:py-1 file:border-slate-300 file:bg-slate-50 file:text-slate-700 file:font-semibold text-xs sm:text-sm text-slate-500 border border-slate-300 rounded-xl p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Split Expense Toggle Switch */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-2xs">
                <Split className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                  Split this expense
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Share this cost with friends, roommates, or a group.
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSplit}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsSplit(checked);
                  if (checked && selectedParticipantIds.size === 0) {
                    setSelectedParticipantIds(new Set(["user_current"]));
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* EXPANDED SPLIT FORM CONTROLS */}
        {isSplit && (
          <div className="space-y-4 pt-1 animate-fadeIn">
            {/* Group & Payer Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Group (Optional)
                </label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900 font-medium text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Direct Split (No Group)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.category || "Group"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Who Paid?
                </label>
                <select
                  value={paidByKey}
                  onChange={(e) => setPaidByKey(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900 font-medium text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {availableParticipants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isCurrentUser ? "(You)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Participant Checkbox Pills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Participants ({selectedParticipants.length})
                </span>
                <div className="flex gap-2 text-[11px] font-bold text-blue-600">
                  <button
                    type="button"
                    onClick={handleSelectAllParticipants}
                    className="hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllExceptMe}
                    className="hover:underline cursor-pointer"
                  >
                    Only Me
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setIsAddContactModalOpen(true)}
                    className="hover:underline text-indigo-600 cursor-pointer font-bold"
                  >
                    + Contact
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50">
                {availableParticipants.map((p) => {
                  const isSelected = selectedParticipantIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleToggleParticipant(p.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{p.name}</span>
                      {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Method Tabs & Calculations */}
            <SplitSelector
              splitMethod={splitMethod}
              onSplitMethodChange={(method) => setSplitMethod(method)}
              totalAmount={Number(amount) || 0}
              participants={selectedParticipants}
              exactAmounts={exactAmounts}
              onExactAmountsChange={setExactAmounts}
              percentages={percentages}
              onPercentagesChange={setPercentages}
              shares={shares}
              onSharesChange={setShares}
              splitCalculation={splitCalculation}
            />
          </div>
        )}

        {/* Primary Submit Button matching Screenshot */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 rounded-xl transition transform active:scale-[0.99] disabled:opacity-50 shadow-sm cursor-pointer text-sm sm:text-base"
          >
            {mutation.isPending
              ? "Saving Expense..."
              : initialData
                ? "Update Expense"
                : "+ Add Expense"}
          </button>

          {initialData && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="w-full mt-2 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition cursor-pointer text-xs"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* Inline Quick Add Contact Modal */}
      <QuickAddContactModal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        userId={user?.id}
        onContactCreated={handleInlineContactCreated}
      />
    </>
  );
}
