import { supabase } from "../supabaseClient";

/**
 * Check if the browser supports the native Web Contacts Picker API (available on Android Chrome & supported mobile browsers)
 */
export function isContactPickerSupported() {
  return typeof navigator !== "undefined" && "contacts" in navigator && "select" in navigator.contacts;
}

/**
 * Pick contacts directly from mobile device contacts address book
 * @returns {Promise<Array<{name: string, email: string|null, phone: string|null}>>}
 */
export async function pickMobileContacts() {
  if (!isContactPickerSupported()) {
    throw new Error("Device Contact Picker is not supported on this browser.");
  }

  const props = ["name", "email", "tel"];
  const opts = { multiple: true };

  try {
    const selected = await navigator.contacts.select(props, opts);
    if (!selected || selected.length === 0) return [];

    return selected.map((item) => {
      const name = Array.isArray(item.name) ? item.name[0] : item.name || "Contact";
      const email = Array.isArray(item.email) ? item.email[0] : item.email || null;
      const phone = Array.isArray(item.tel) ? item.tel[0] : item.tel || null;

      return {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
      };
    });
  } catch (err) {
    if (err.name === "AbortError" || err.name === "SecurityError") {
      return [];
    }
    throw err;
  }
}

/**
 * Parse a standard vCard (.vcf) file content exported from iPhone or Android into contacts list
 * @param {string} vcfContent
 * @returns {Array<{name: string, email: string|null, phone: string|null}>}
 */
export function parseVCF(vcfContent) {
  if (!vcfContent) return [];

  const cards = vcfContent.split(/BEGIN:VCARD/i).filter(Boolean);
  const contacts = [];

  cards.forEach((card) => {
    let name = "";
    let email = null;
    let phone = null;

    const lines = card.split(/\r?\n/);
    lines.forEach((line) => {
      const trimmed = line.trim();

      // FN (Full Name)
      if (trimmed.startsWith("FN:") || trimmed.startsWith("FN;")) {
        name = trimmed.replace(/^FN[^:]*:/i, "").trim();
      } else if (!name && (trimmed.startsWith("N:") || trimmed.startsWith("N;"))) {
        const parts = trimmed.replace(/^N[^:]*:/i, "").split(";");
        const familyName = parts[0] || "";
        const givenName = parts[1] || "";
        name = `${givenName} ${familyName}`.trim();
      }

      // TEL (Phone Number)
      if (trimmed.startsWith("TEL:") || trimmed.startsWith("TEL;")) {
        const telVal = trimmed.replace(/^TEL[^:]*:/i, "").trim();
        if (!phone) phone = telVal;
      }

      // EMAIL
      if (trimmed.startsWith("EMAIL:") || trimmed.startsWith("EMAIL;")) {
        const emailVal = trimmed.replace(/^EMAIL[^:]*:/i, "").trim();
        if (!email) email = emailVal;
      }
    });

    if (name) {
      contacts.push({
        name,
        email,
        phone,
      });
    }
  });

  return contacts;
}

/**
 * Parse standard CSV exported from Google Contacts, Outlook, or Excel
 * @param {string} csvText
 * @returns {Array<{name: string, email: string|null, phone: string|null}>}
 */
export function parseCSVContacts(csvText) {
  if (!csvText) return [];

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(",").map((h) => h.replace(/["']/g, "").trim());

  let nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("first"));
  let phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("tel"));
  let emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));

  if (nameIdx === -1) nameIdx = 0;
  if (phoneIdx === -1 && headers.length > 1) phoneIdx = 1;
  if (emailIdx === -1 && headers.length > 2) emailIdx = 2;

  const contacts = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(",");
    const name = rawCols[nameIdx]?.replace(/["']/g, "").trim();
    const phone = phoneIdx !== -1 ? rawCols[phoneIdx]?.replace(/["']/g, "").trim() : null;
    const email = emailIdx !== -1 ? rawCols[emailIdx]?.replace(/["']/g, "").trim() : null;

    if (name) {
      contacts.push({
        name,
        phone: phone || null,
        email: email || null,
      });
    }
  }

  return contacts;
}

/**
 * Parse raw text pasted by user (e.g. from WhatsApp, Notes, or SMS)
 */
export function parsePastedContacts(text) {
  if (!text) return [];

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const contacts = [];

  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
  const phoneRegex = /(\+?[0-9\s-]{7,15})/;

  lines.forEach((line) => {
    let cleanLine = line.trim();
    if (!cleanLine) return;

    let email = null;
    let phone = null;

    // Extract email
    const emailMatch = cleanLine.match(emailRegex);
    if (emailMatch) {
      email = emailMatch[0].trim();
      cleanLine = cleanLine.replace(emailMatch[0], "").trim();
    }

    // Extract phone
    const phoneMatch = cleanLine.match(phoneRegex);
    if (phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 7) {
      phone = phoneMatch[0].trim();
      cleanLine = cleanLine.replace(phoneMatch[0], "").trim();
    }

    // Clean up name
    let name = cleanLine
      .replace(/^[-*•:,;|]+/, "")
      .replace(/[-*•:,;|]+$/, "")
      .replace(/[,;|:]+/g, " ")
      .trim();

    if (!name && email) {
      name = email.split("@")[0];
    } else if (!name && phone) {
      name = `Contact ${phone.slice(-4)}`;
    }

    if (name) {
      contacts.push({
        name,
        phone: phone || null,
        email: email || null,
      });
    }
  });

  return contacts;
}

/**
 * Save multiple contacts in batch to Supabase
 */
export async function bulkCreateContacts(ownerId, contactsList = []) {
  if (!ownerId || contactsList.length === 0) return [];

  const records = contactsList.map((c) => ({
    owner_id: ownerId,
    name: c.name.trim(),
    email: c.email?.trim() || null,
    phone: c.phone?.trim() || null,
  }));

  const { data, error } = await supabase
    .from("contacts")
    .insert(records)
    .select();

  if (error) {
    console.error("Error saving bulk contacts:", error);
    throw error;
  }

  return data || [];
}
