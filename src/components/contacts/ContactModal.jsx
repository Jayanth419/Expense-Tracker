import React, { useState, useRef } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  UserPlus,
  Smartphone,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import toast from "react-hot-toast";
import { createContact, updateContact } from "../../services/contactService";
import {
  isContactPickerSupported,
  pickMobileContacts,
  parseVCF,
  bulkCreateContacts,
} from "../../services/mobileContactService";

export default function ContactModal({
  isOpen,
  onClose,
  initialContact = null,
  ownerId,
  onContactSaved,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const isMobileSupported = isContactPickerSupported();

  React.useEffect(() => {
    if (isOpen) {
      if (initialContact) {
        setName(initialContact.name || "");
        setEmail(initialContact.email || "");
        setPhone(initialContact.phone || "");
      } else {
        setName("");
        setEmail("");
        setPhone("");
      }
    }
  }, [isOpen, initialContact]);

  if (!isOpen) return null;

  // Handle Device Contact Picker
  async function handlePickDeviceContacts() {
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
        toast.success(`Loaded "${picked[0].name}" from device contacts`);
      } else {
        // Bulk import
        await bulkCreateContacts(ownerId, picked);
        toast.success(`Imported ${picked.length} contacts from device!`);
        if (onContactSaved) onContactSaved();
        onClose();
      }
    } catch (err) {
      toast.error("Contact selection: " + (err.message || "Failed to access contacts"));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle .vcf File Upload (vCard)
  async function handleVCFFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSubmitting(true);
      const text = await file.text();
      const parsed = parseVCF(text);

      if (parsed.length === 0) {
        toast.error("No valid contacts found in the selected file");
        return;
      }

      if (parsed.length === 1 && !initialContact) {
        setName(parsed[0].name || "");
        setEmail(parsed[0].email || "");
        setPhone(parsed[0].phone || "");
        toast.success(`Loaded "${parsed[0].name}" from file`);
      } else {
        await bulkCreateContacts(ownerId, parsed);
        toast.success(`Imported ${parsed.length} contacts from vCard!`);
        if (onContactSaved) onContactSaved();
        onClose();
      }
    } catch (err) {
      toast.error("Failed to parse contacts file: " + err.message);
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      if (initialContact) {
        await updateContact(initialContact.id, {
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
        });
        toast.success("Contact updated!");
      } else {
        await createContact({
          owner_id: ownerId,
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
        });
        toast.success(`Contact "${name.trim()}" added!`);
      }

      if (onContactSaved) onContactSaved();
      onClose();
    } catch (err) {
      toast.error("Failed to save contact: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2 font-bold text-lg">
            <UserPlus className="w-5 h-5" />
            {initialContact ? "Edit Contact" : "Add New Contact"}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Import Options (Only on creation) */}
        {!initialContact && (
          <div className="px-6 pt-5 pb-1 space-y-2 bg-slate-50 border-b border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Quick Mobile & File Import
            </span>
            <div className="grid grid-cols-2 gap-2 pb-3">
              {isMobileSupported ? (
                <button
                  type="button"
                  onClick={handlePickDeviceContacts}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  Phone Contacts
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  Import .VCF file
                </button>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                Upload vCard
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".vcf,text/vcard"
                onChange={handleVCFFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mobile / Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Address (optional)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rahul@example.com"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

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
              className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isSubmitting
                ? "Saving..."
                : initialContact
                ? "Update Contact"
                : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
