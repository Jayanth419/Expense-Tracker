import React, { useState } from "react";
import { X, UserPlus, Phone, Mail, User, Smartphone } from "lucide-react";
import toast from "react-hot-toast";
import { createContact } from "../../services/contactService";
import {
  isContactPickerSupported,
  pickMobileContacts,
  bulkCreateContacts,
} from "../../services/mobileContactService";

export default function QuickAddContactModal({
  isOpen,
  onClose,
  userId,
  onContactCreated,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isMobileSupported = isContactPickerSupported();

  async function handlePickDeviceContact() {
    try {
      setIsSubmitting(true);
      const picked = await pickMobileContacts();
      if (!picked || picked.length === 0) {
        setIsSubmitting(false);
        return;
      }

      if (picked.length === 1) {
        setName(picked[0].name || "");
        setEmail(picked[0].email || "");
        setPhone(picked[0].phone || "");
        toast.success(`Loaded "${picked[0].name}" from device`);
      } else {
        const created = await bulkCreateContacts(userId, picked);
        toast.success(`Imported ${created.length} contacts!`);
        if (created.length > 0) {
          onContactCreated(created[0]);
        }
        onClose();
      }
    } catch (err) {
      toast.error("Contact selection: " + (err.message || "Failed to pick contact"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Contact name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const newContact = await createContact({
        owner_id: userId,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
      });

      toast.success(`Contact "${newContact.name}" added!`);
      setName("");
      setEmail("");
      setPhone("");
      onContactCreated(newContact);
      onClose();
    } catch (err) {
      toast.error("Failed to add contact: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2 font-bold text-lg">
            <UserPlus className="w-5 h-5" />
            Add New Contact
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isMobileSupported && (
          <div className="px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-200">
            <button
              type="button"
              onClick={handlePickDeviceContact}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-blue-600" />
              Pick from Phone Contacts
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 font-medium"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone / Mobile (optional)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address (optional)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rahul@example.com"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isSubmitting ? "Adding..." : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
