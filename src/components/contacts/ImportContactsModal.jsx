import React, { useState, useRef } from "react";
import {
  X,
  Smartphone,
  Upload,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  isContactPickerSupported,
  pickMobileContacts,
  parseVCF,
  parseCSVContacts,
  parsePastedContacts,
  bulkCreateContacts,
} from "../../services/mobileContactService";

export default function ImportContactsModal({
  isOpen,
  onClose,
  ownerId,
  onImportComplete,
}) {
  const [activeTab, setActiveTab] = useState("device"); // 'device' | 'file' | 'paste'
  const [pastedText, setPastedText] = useState("");
  const [parsedPreview, setParsedPreview] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const isNativeSupported = isContactPickerSupported();

  React.useEffect(() => {
    if (isOpen) {
      if (isNativeSupported) {
        setActiveTab("device");
      } else {
        setActiveTab("file");
      }
      setPastedText("");
      setParsedPreview([]);
    }
  }, [isOpen, isNativeSupported]);

  if (!isOpen) return null;

  // 1. Native Mobile Contacts Picker Handler
  async function handleNativePick() {
    try {
      setIsProcessing(true);
      const picked = await pickMobileContacts();
      if (!picked || picked.length === 0) {
        setIsProcessing(false);
        return;
      }

      setParsedPreview(picked);
      toast.success(`Loaded ${picked.length} contacts from your phone!`);
    } catch (err) {
      toast.error(err.message || "Could not access mobile contacts");
    } finally {
      setIsProcessing(false);
    }
  }

  // 2. File Upload Handler (.vcf or .csv)
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const text = await file.text();
      let contacts = [];

      if (file.name.endsWith(".vcf") || text.includes("BEGIN:VCARD")) {
        contacts = parseVCF(text);
      } else if (file.name.endsWith(".csv") || text.includes(",")) {
        contacts = parseCSVContacts(text);
      } else {
        contacts = parsePastedContacts(text);
      }

      if (contacts.length === 0) {
        toast.error("No valid contacts could be read from this file.");
        return;
      }

      setParsedPreview(contacts);
      toast.success(`Found ${contacts.length} contacts in file!`);
    } catch (err) {
      toast.error("Failed to read contacts file: " + err.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // 3. Parse Pasted Text
  function handlePreviewPaste() {
    if (!pastedText.trim()) {
      toast.error("Please paste some contact details first");
      return;
    }

    const contacts = parsePastedContacts(pastedText);
    if (contacts.length === 0) {
      toast.error("Could not find any contacts in the pasted text.");
      return;
    }

    setParsedPreview(contacts);
    toast.success(`Parsed ${contacts.length} contacts! Review below.`);
  }

  // 4. Save Parsed Contacts to Database
  async function handleSaveAll() {
    if (parsedPreview.length === 0) return;

    try {
      setIsProcessing(true);
      await bulkCreateContacts(ownerId, parsedPreview);
      toast.success(`Successfully imported ${parsedPreview.length} contacts!`);
      if (onImportComplete) onImportComplete();
      onClose();
    } catch (err) {
      toast.error("Failed to save contacts: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  function handleRemovePreviewItem(index) {
    setParsedPreview((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2.5 font-bold text-lg">
            <Smartphone className="w-5 h-5" />
            Import Mobile Contacts
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("device")}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === "device"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Phone Picker
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("file")}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === "file"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload className="w-4 h-4" />
            vCard / CSV File
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("paste")}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === "paste"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            Paste List
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: NATIVE PHONE PICKER */}
          {activeTab === "device" && (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                <Smartphone className="w-7 h-7" />
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Direct Mobile Address Book Sync
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Access your phone's contact list securely to select friends,
                  roommates, and family members.
                </p>
              </div>

              {isNativeSupported ? (
                <button
                  type="button"
                  onClick={handleNativePick}
                  disabled={isProcessing}
                  className="w-full max-w-xs mx-auto py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  {isProcessing ? "Opening Contacts..." : "Open Phone Contacts"}
                </button>
              ) : (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-left space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    Device Picker Note
                  </div>
                  <p className="text-xs text-amber-700">
                    The direct browser contact picker is native to Android
                    Chrome and mobile Chromium browsers.
                  </p>
                  <p className="text-xs text-amber-800 font-medium">
                    👉 On iPhone / iOS or Desktop: Use the{" "}
                    <b>"vCard / CSV File"</b> or <b>"Paste List"</b> tabs above
                    to import contacts in seconds.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FILE UPLOAD (vCard / CSV) */}
          {activeTab === "file" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition"
              >
                <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 text-sm">
                  Click to Upload .VCF or .CSV Contact File
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Supports Apple Contacts vCard (.vcf), Google Contacts (.csv),
                  and Outlook
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vcf,.csv,text/vcard,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-700">
                  How to export on iPhone / iOS:
                </p>
                <p>
                  1. Open the <b>Contacts app</b> on your iPhone.
                </p>
                <p>
                  2. Tap "Lists", long press "All Contacts", and tap{" "}
                  <b>"Export"</b>.
                </p>
                <p>
                  3. Select the exported <code>.vcf</code> file here.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PASTE TEXT */}
          {activeTab === "paste" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Paste contact names and phone numbers
                </label>
                <textarea
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Rahul Sharma, 9876543210\nPriya, priya@example.com\nAnand: +91 9123456780`}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handlePreviewPaste}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Parse & Preview Contacts
              </button>
            </div>
          )}

          {/* PREVIEW & CONFIRMATION LIST */}
          {parsedPreview.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-200 animate-slideUp">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  Ready to Import ({parsedPreview.length} contacts)
                </span>
                <button
                  type="button"
                  onClick={() => setParsedPreview([])}
                  className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
                {parsedPreview.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 flex items-center justify-between hover:bg-white text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {c.phone || c.email || "No phone/email"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePreviewItem(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={parsedPreview.length === 0 || isProcessing}
              className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition disabled:opacity-50 cursor-pointer shadow-sm text-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isProcessing
                ? "Saving..."
                : `Save ${parsedPreview.length} Contacts`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
