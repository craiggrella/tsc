"use client";

import { useState } from "react";
import { Plus, Star, X } from "lucide-react";
import { cn, formatPhone } from "@/lib/utils";

// ─── Types ──────────────────────────────────────

export interface PhoneRecord {
  id?: string; // undefined = new unsaved record
  designation: string;
  number: string;
  is_primary: boolean;
}

export interface EmailRecord {
  id?: string;
  designation: string;
  address: string;
  is_primary: boolean;
}

export interface AddressRecord {
  id?: string;
  designation: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  is_primary: boolean;
}

export interface SocialRecord {
  id?: string;
  platform: string;
  url: string;
}

const PHONE_DESIGNATIONS = ["Cell", "Office", "Home", "Assistant", "Fax", "Other"];
const EMAIL_DESIGNATIONS = ["Work", "Personal", "Assistant", "Other"];
const ADDRESS_DESIGNATIONS = ["Office", "Home", "Mailing", "Other"];
const SOCIAL_PLATFORMS = ["Facebook", "Instagram", "YouTube", "LinkedIn", "Twitter/X", "TikTok", "IMDb", "Website", "Other"];

// ─── Phone Section ──────────────────────────────

export function PhoneSection({
  phones,
  onChange,
}: {
  phones: PhoneRecord[];
  onChange: (phones: PhoneRecord[]) => void;
}) {
  function setPrimary(index: number) {
    onChange(
      phones.map((p, i) => ({ ...p, is_primary: i === index }))
    );
  }

  function update(index: number, patch: Partial<PhoneRecord>) {
    onChange(phones.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function remove(index: number) {
    const removed = phones[index];
    const next = phones.filter((_, i) => i !== index);
    // If we removed the primary, make the first one primary
    if (removed.is_primary && next.length > 0) {
      next[0] = { ...next[0], is_primary: true };
    }
    onChange(next);
  }

  function add() {
    onChange([
      ...phones,
      { designation: "Cell", number: "", is_primary: phones.length === 0 },
    ]);
  }

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        Phones
      </p>
      <div className="space-y-1">
        {phones.map((phone, i) => (
          <div
            key={phone.id || `new-${i}`}
            className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-zinc-50 transition-colors"
          >
            <button
              type="button"
              onClick={() => setPrimary(i)}
              className="flex-shrink-0"
              title={phone.is_primary ? "Primary" : "Set as primary"}
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5 transition-colors",
                  phone.is_primary
                    ? "fill-amber-400 text-amber-400"
                    : "text-zinc-300 hover:text-amber-300"
                )}
              />
            </button>
            <select
              value={phone.designation}
              onChange={(e) => update(i, { designation: e.target.value })}
              className="w-20 flex-shrink-0 appearance-none bg-transparent text-xs font-medium text-zinc-500 outline-none cursor-pointer hover:text-black transition-colors"
            >
              {PHONE_DESIGNATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <input
              value={phone.number}
              onChange={(e) => update(i, { number: e.target.value })}
              placeholder="Phone number"
              className="flex-1 bg-transparent text-sm font-mono text-zinc-700 outline-none placeholder:text-zinc-300"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500 transition-colors" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-1 inline-flex items-center gap-1 px-1.5 py-1 text-xs text-zinc-400 hover:text-black transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add Phone
      </button>
    </div>
  );
}

// ─── Email Section ──────────────────────────────

export function EmailSection({
  emails,
  onChange,
}: {
  emails: EmailRecord[];
  onChange: (emails: EmailRecord[]) => void;
}) {
  function setPrimary(index: number) {
    onChange(emails.map((e, i) => ({ ...e, is_primary: i === index })));
  }

  function update(index: number, patch: Partial<EmailRecord>) {
    onChange(emails.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function remove(index: number) {
    const removed = emails[index];
    const next = emails.filter((_, i) => i !== index);
    if (removed.is_primary && next.length > 0) {
      next[0] = { ...next[0], is_primary: true };
    }
    onChange(next);
  }

  function add() {
    onChange([
      ...emails,
      { designation: "Work", address: "", is_primary: emails.length === 0 },
    ]);
  }

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        Emails
      </p>
      <div className="space-y-1">
        {emails.map((email, i) => (
          <div
            key={email.id || `new-${i}`}
            className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-zinc-50 transition-colors"
          >
            <button
              type="button"
              onClick={() => setPrimary(i)}
              className="flex-shrink-0"
              title={email.is_primary ? "Primary" : "Set as primary"}
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5 transition-colors",
                  email.is_primary
                    ? "fill-amber-400 text-amber-400"
                    : "text-zinc-300 hover:text-amber-300"
                )}
              />
            </button>
            <select
              value={email.designation}
              onChange={(e) => update(i, { designation: e.target.value })}
              className="w-20 flex-shrink-0 appearance-none bg-transparent text-xs font-medium text-zinc-500 outline-none cursor-pointer hover:text-black transition-colors"
            >
              {EMAIL_DESIGNATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <input
              value={email.address}
              onChange={(e) => update(i, { address: e.target.value })}
              placeholder="Email address"
              className="flex-1 bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-300"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500 transition-colors" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-1 inline-flex items-center gap-1 px-1.5 py-1 text-xs text-zinc-400 hover:text-black transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add Email
      </button>
    </div>
  );
}

// ─── Address Section ────────────────────────────

export function AddressSection({
  addresses,
  onChange,
}: {
  addresses: AddressRecord[];
  onChange: (addresses: AddressRecord[]) => void;
}) {
  function setPrimary(index: number) {
    onChange(addresses.map((a, i) => ({ ...a, is_primary: i === index })));
  }

  function update(index: number, patch: Partial<AddressRecord>) {
    onChange(addresses.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function remove(index: number) {
    const removed = addresses[index];
    const next = addresses.filter((_, i) => i !== index);
    if (removed.is_primary && next.length > 0) {
      next[0] = { ...next[0], is_primary: true };
    }
    onChange(next);
  }

  function add() {
    onChange([
      ...addresses,
      {
        designation: "Office",
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        is_primary: addresses.length === 0,
      },
    ]);
  }

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        Addresses
      </p>
      <div className="space-y-2">
        {addresses.map((addr, i) => (
          <div
            key={addr.id || `new-${i}`}
            className="group rounded-md px-1.5 py-1.5 hover:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPrimary(i)}
                className="flex-shrink-0"
                title={addr.is_primary ? "Primary" : "Set as primary"}
              >
                <Star
                  className={cn(
                    "h-3.5 w-3.5 transition-colors",
                    addr.is_primary
                      ? "fill-amber-400 text-amber-400"
                      : "text-zinc-300 hover:text-amber-300"
                  )}
                />
              </button>
              <select
                value={addr.designation}
                onChange={(e) => update(i, { designation: e.target.value })}
                className="w-20 flex-shrink-0 appearance-none bg-transparent text-xs font-medium text-zinc-500 outline-none cursor-pointer hover:text-black transition-colors"
              >
                {ADDRESS_DESIGNATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500 transition-colors" />
              </button>
            </div>
            <div className="ml-7 mt-1 space-y-1">
              <input
                value={addr.street}
                onChange={(e) => update(i, { street: e.target.value })}
                placeholder="Street"
                className="w-full bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-300"
              />
              <div className="flex gap-2">
                <input
                  value={addr.city}
                  onChange={(e) => update(i, { city: e.target.value })}
                  placeholder="City"
                  className="flex-1 bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-300"
                />
                <input
                  value={addr.state}
                  onChange={(e) => update(i, { state: e.target.value })}
                  placeholder="State"
                  className="w-12 bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-300"
                />
                <input
                  value={addr.zip}
                  onChange={(e) => update(i, { zip: e.target.value })}
                  placeholder="Zip"
                  className="w-16 bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-300"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-1 inline-flex items-center gap-1 px-1.5 py-1 text-xs text-zinc-400 hover:text-black transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add Address
      </button>
    </div>
  );
}

// ─── Social Section ─────────────────────────────

export function SocialSection({
  socials,
  onChange,
}: {
  socials: SocialRecord[];
  onChange: (socials: SocialRecord[]) => void;
}) {
  function update(index: number, patch: Partial<SocialRecord>) {
    onChange(socials.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function remove(index: number) {
    onChange(socials.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...socials, { platform: "Website", url: "" }]);
  }

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        Social Links
      </p>
      <div className="space-y-1">
        {socials.map((social, i) => (
          <div
            key={social.id || `new-${i}`}
            className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-zinc-50 transition-colors"
          >
            <select
              value={social.platform}
              onChange={(e) => update(i, { platform: e.target.value })}
              className="w-24 flex-shrink-0 appearance-none bg-transparent text-xs font-medium text-zinc-500 outline-none cursor-pointer hover:text-black transition-colors"
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              value={social.url}
              onChange={(e) => update(i, { url: e.target.value })}
              placeholder="URL or handle"
              className="flex-1 bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-300"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500 transition-colors" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-1 inline-flex items-center gap-1 px-1.5 py-1 text-xs text-zinc-400 hover:text-black transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add Social Link
      </button>
    </div>
  );
}

// ─── Helpers for syncing sub-records with DB ────

import { createClient } from "@/lib/supabase/client";

export async function syncPhones(
  entityType: "person" | "client",
  entityId: string,
  phones: PhoneRecord[],
  originalIds: Set<string>
) {
  const supabase = createClient();

  // Delete removed records
  const currentIds = new Set(phones.filter((p) => p.id).map((p) => p.id!));
  const toDelete = [...originalIds].filter((id) => !currentIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("contact_phones").delete().in("id", toDelete);
  }

  // Upsert existing + insert new
  for (const phone of phones) {
    if (!phone.number.trim()) continue;
    if (phone.id) {
      await supabase
        .from("contact_phones")
        .update({
          designation: phone.designation,
          number: phone.number,
          is_primary: phone.is_primary,
        })
        .eq("id", phone.id);
    } else {
      await supabase.from("contact_phones").insert({
        entity_type: entityType,
        entity_id: entityId,
        designation: phone.designation,
        number: phone.number,
        is_primary: phone.is_primary,
      });
    }
  }
}

export async function syncEmails(
  entityType: "person" | "client",
  entityId: string,
  emails: EmailRecord[],
  originalIds: Set<string>
) {
  const supabase = createClient();

  const currentIds = new Set(emails.filter((e) => e.id).map((e) => e.id!));
  const toDelete = [...originalIds].filter((id) => !currentIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("contact_emails").delete().in("id", toDelete);
  }

  for (const email of emails) {
    if (!email.address.trim()) continue;
    if (email.id) {
      await supabase
        .from("contact_emails")
        .update({
          designation: email.designation,
          address: email.address,
          is_primary: email.is_primary,
        })
        .eq("id", email.id);
    } else {
      await supabase.from("contact_emails").insert({
        entity_type: entityType,
        entity_id: entityId,
        designation: email.designation,
        address: email.address,
        is_primary: email.is_primary,
      });
    }
  }
}

export async function syncAddresses(
  entityType: "person" | "client",
  entityId: string,
  addresses: AddressRecord[],
  originalIds: Set<string>
) {
  const supabase = createClient();

  const currentIds = new Set(addresses.filter((a) => a.id).map((a) => a.id!));
  const toDelete = [...originalIds].filter((id) => !currentIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("contact_addresses").delete().in("id", toDelete);
  }

  for (const addr of addresses) {
    if (!addr.street?.trim() && !addr.city?.trim()) continue;
    if (addr.id) {
      await supabase
        .from("contact_addresses")
        .update({
          designation: addr.designation,
          street: addr.street || null,
          city: addr.city || null,
          state: addr.state || null,
          zip: addr.zip || null,
          country: addr.country || null,
          is_primary: addr.is_primary,
        })
        .eq("id", addr.id);
    } else {
      await supabase.from("contact_addresses").insert({
        entity_type: entityType,
        entity_id: entityId,
        designation: addr.designation,
        street: addr.street || null,
        city: addr.city || null,
        state: addr.state || null,
        zip: addr.zip || null,
        country: addr.country || null,
        is_primary: addr.is_primary,
      });
    }
  }
}

export async function syncSocials(
  entityType: "person" | "client",
  entityId: string,
  socials: SocialRecord[],
  originalIds: Set<string>
) {
  const supabase = createClient();

  const currentIds = new Set(socials.filter((s) => s.id).map((s) => s.id!));
  const toDelete = [...originalIds].filter((id) => !currentIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("contact_socials").delete().in("id", toDelete);
  }

  for (const social of socials) {
    if (!social.url.trim()) continue;
    if (social.id) {
      await supabase
        .from("contact_socials")
        .update({ platform: social.platform, url: social.url })
        .eq("id", social.id);
    } else {
      await supabase.from("contact_socials").insert({
        entity_type: entityType,
        entity_id: entityId,
        platform: social.platform,
        url: social.url,
      });
    }
  }
}
