import React, { useState, useEffect } from "react";
import { X, Users, Plus, Trash2, Check, Tag, UserPlus, Search } from "lucide-react";
import toast from "react-hot-toast";
import { createGroup, updateGroup, addGroupMember, removeGroupMember } from "../../services/groupService";

const GROUP_CATEGORIES = [
  "Trip",
  "Roommates",
  "Office",
  "Family",
  "Dining",
  "Event",
  "Other",
];

export default function GroupModal({
  isOpen,
  onClose,
  initialGroup = null,
  currentUserId,
  currentUserName = "You",
  currentUserEmail = null,
  contacts = [],
  onGroupSaved,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Trip");
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  const [customMembers, setCustomMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialGroup) {
        setName(initialGroup.name || "");
        setDescription(initialGroup.description || "");
        setCategory(initialGroup.category || "Trip");
        const contactSet = new Set(
          (initialGroup.group_members || [])
            .map((m) => m.contact_id)
            .filter(Boolean)
        );
        setSelectedContactIds(contactSet);
        setCustomMembers([]);
      } else {
        setName("");
        setDescription("");
        setCategory("Trip");
        setSelectedContactIds(new Set());
        setCustomMembers([]);
      }
      setNewMemberName("");
      setContactSearch("");
    }
  }, [isOpen, initialGroup]);

  if (!isOpen) return null;

  function toggleContact(contactId) {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }

  function handleAddCustomMember() {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    if (customMembers.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Member already added");
      return;
    }
    setCustomMembers((prev) => [...prev, { name: trimmed }]);
    setNewMemberName("");
  }

  function handleRemoveCustomMember(index) {
    setCustomMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }

    try {
      setIsSubmitting(true);

      if (initialGroup) {
        // 1. Update group basic info
        await updateGroup(initialGroup.id, {
          name: name.trim(),
          description: description.trim() || null,
          category,
        });

        // 2. Add any newly selected contacts that aren't already members
        const existingContactIds = new Set(
          (initialGroup.group_members || []).map((m) => m.contact_id).filter(Boolean)
        );

        for (const contactId of selectedContactIds) {
          if (!existingContactIds.has(contactId)) {
            const contact = contacts.find((c) => c.id === contactId);
            if (contact) {
              await addGroupMember(initialGroup.id, {
                contact_id: contact.id,
                user_id: contact.user_id || null,
                name: contact.name,
                email: contact.email || null,
                phone: contact.phone || null,
              });
            }
          }
        }

        // 3. Add any newly added custom members
        for (const m of customMembers) {
          await addGroupMember(initialGroup.id, {
            name: m.name,
          });
        }

        toast.success("Group updated!");
      } else {
        // Create new group with selected contacts + custom members
        const selectedContactsList = contacts.filter((c) =>
          selectedContactIds.has(c.id)
        );

        const initialMembers = [
          ...selectedContactsList.map((c) => ({
            contact_id: c.id,
            user_id: c.user_id || null,
            name: c.name,
            email: c.email || null,
            phone: c.phone || null,
          })),
          ...customMembers.map((m) => ({
            name: m.name,
          })),
        ];

        await createGroup({
          name: name.trim(),
          description: description.trim() || null,
          category,
          createdBy: currentUserId,
          creatorName: currentUserName,
          creatorEmail: currentUserEmail,
          initialMembers,
        });

        toast.success(`Group "${name.trim()}" created!`);
      }

      if (onGroupSaved) onGroupSaved();
      onClose();
    } catch (err) {
      toast.error("Failed to save group: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Users className="w-5 h-5" />
            {initialGroup ? "Edit Group & Members" : "Create New Group"}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Goa Trip, Roommates 2026, Office Lunch"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 font-medium"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {GROUP_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Shared expenses for the trip"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Group Members Selection (for both create and edit) */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              {initialGroup ? "Add More Group Members" : "Add Group Members"}
            </label>

            {/* Select from Contacts */}
            {contacts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Choose from your contacts:</span>
                  <span className="text-[11px] text-blue-600 font-bold">
                    {selectedContactIds.size} selected
                  </span>
                </div>

                {contacts.length > 5 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50">
                  {filteredContacts.map((c) => {
                    const isSelected = selectedContactIds.has(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleContact(c.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs font-medium ${
                          isSelected
                            ? "bg-blue-100/70 text-blue-900 border border-blue-200"
                            : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{c.name}</span>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add Custom/New Member by Name */}
            <div className="space-y-2">
              <span className="text-xs text-slate-500 font-medium">
                Or type a person's name:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomMember();
                    }
                  }}
                  placeholder="Enter name (e.g. Suresh)"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomMember}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 border border-slate-300 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {customMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customMembers.map((m, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-xs font-medium"
                    >
                      {m.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomMember(idx)}
                        className="text-indigo-400 hover:text-indigo-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100">
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
              className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isSubmitting
                ? "Saving..."
                : initialGroup
                ? "Update Group"
                : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
