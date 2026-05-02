"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { User, Users, HardDrive, List, Check, Plus, ChevronDown, ChevronRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  DetailPanel,
  Field,
  Input,
  Select,
} from "@/components/shared/detail-panel";
import {
  PhoneSection,
  EmailSection,
  AddressSection,
  syncPhones,
  syncEmails,
  syncAddresses,
  type PhoneRecord,
  type EmailRecord,
  type AddressRecord,
} from "@/components/shared/contact-info-editor";
import { PICKLIST_TABLES, invalidatePicklistCache } from "@/lib/picklists";
import { useAutoSave } from "@/hooks/use-auto-save";
import { SavedIndicator } from "@/components/shared/saved-indicator";

interface PicklistRow {
  id: string;
  value: string;
  label: string;
  sort_order: number;
}

interface ProfileRow {
  id: string;
  org_id: string | null;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  avatar_url: string | null;
}

interface SettingsClientProps {
  userId: string;
}

const mainTabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "team", label: "Team", icon: Users },
  { id: "integrations", label: "Integrations", icon: HardDrive },
  { id: "picklists", label: "Picklists", icon: List },
];

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "assistant", label: "Assistant" },
];

export function SettingsClient({ userId }: SettingsClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  // Current user profile
  const [myProfile, setMyProfile] = useState<ProfileRow | null>(null);
  const myRole = myProfile?.role || "manager";
  const canManageTeam = myRole === "super_admin" || myRole === "admin";
  const canDelete = myRole === "super_admin";

  // Team members
  const [teamMembers, setTeamMembers] = useState<ProfileRow[]>([]);

  // ── Profile tab state ──
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profilePhones, setProfilePhones] = useState<PhoneRecord[]>([]);
  const [profileEmails, setProfileEmails] = useState<EmailRecord[]>([]);
  const [profileAddresses, setProfileAddresses] = useState<AddressRecord[]>([]);
  const [origProfilePhoneIds, setOrigProfilePhoneIds] = useState<Set<string>>(new Set());
  const [origProfileEmailIds, setOrigProfileEmailIds] = useState<Set<string>>(new Set());
  const [origProfileAddressIds, setOrigProfileAddressIds] = useState<Set<string>>(new Set());

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  // ── Team detail panel state ──
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNewMember, setIsNewMember] = useState(false);
  const [teamForm, setTeamForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "manager",
  });
  const [teamPhones, setTeamPhones] = useState<PhoneRecord[]>([]);
  const [teamEmails, setTeamEmails] = useState<EmailRecord[]>([]);
  const [teamAddresses, setTeamAddresses] = useState<AddressRecord[]>([]);
  const [origTeamPhoneIds, setOrigTeamPhoneIds] = useState<Set<string>>(new Set());
  const [origTeamEmailIds, setOrigTeamEmailIds] = useState<Set<string>>(new Set());
  const [origTeamAddressIds, setOrigTeamAddressIds] = useState<Set<string>>(new Set());
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamSaved, setTeamSaved] = useState(false);
  const [teamDeleting, setTeamDeleting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // ── Picklists tab state ──
  const [picklistData, setPicklistData] = useState<Record<string, PicklistRow[]>>({});
  const [expandedPicklists, setExpandedPicklists] = useState<Set<string>>(new Set());
  const [editingPicklistCell, setEditingPicklistCell] = useState<{ table: string; id: string } | null>(null);
  const [editingPicklistValue, setEditingPicklistValue] = useState("");
  const [addingToTable, setAddingToTable] = useState<string | null>(null);
  const [newItemLabel, setNewItemLabel] = useState("");

  // ── Load picklists when tab is active ──
  useEffect(() => {
    if (activeTab !== "picklists") return;
    async function loadPicklists() {
      const result: Record<string, PicklistRow[]> = {};
      for (const pl of PICKLIST_TABLES) {
        const { data } = await supabase.from(pl.table).select("id, value, label, sort_order").order("sort_order");
        result[pl.table] = (data || []) as PicklistRow[];
      }
      setPicklistData(result);
    }
    loadPicklists();
  }, [activeTab]);

  function togglePicklistSection(table: string) {
    setExpandedPicklists((prev) => {
      const next = new Set(prev);
      if (next.has(table)) next.delete(table);
      else next.add(table);
      return next;
    });
  }

  async function handleAddPicklistItem(table: string) {
    if (!newItemLabel.trim()) return;
    const label = newItemLabel.trim();
    const value = label.toLowerCase().replace(/\s+/g, "_");
    const existing = picklistData[table] || [];
    const sort_order = existing.length > 0 ? Math.max(...existing.map((r) => r.sort_order)) + 1 : 0;
    const { data, error } = await supabase.from(table).insert({ value, label, sort_order }).select("id, value, label, sort_order").single();
    if (error) {
      console.error("Add picklist error:", error);
      return;
    }
    invalidatePicklistCache(table);
    setPicklistData((prev) => ({ ...prev, [table]: [...(prev[table] || []), data as PicklistRow] }));
    setNewItemLabel("");
    setAddingToTable(null);
  }

  async function handleDeletePicklistItem(table: string, id: string) {
    if (!confirm("Delete this picklist item?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      alert("Failed to delete: " + error.message);
      return;
    }
    invalidatePicklistCache(table);
    setPicklistData((prev) => ({ ...prev, [table]: (prev[table] || []).filter((r) => r.id !== id) }));
  }

  async function handleSavePicklistLabel(table: string, id: string, newLabel: string) {
    setEditingPicklistCell(null);
    if (!newLabel.trim()) return;
    const { error } = await supabase.from(table).update({ label: newLabel.trim() }).eq("id", id);
    if (error) {
      alert("Failed to save: " + error.message);
      return;
    }
    invalidatePicklistCache(table);
    setPicklistData((prev) => ({
      ...prev,
      [table]: (prev[table] || []).map((r) => (r.id === id ? { ...r, label: newLabel.trim() } : r)),
    }));
  }

  // ── Load data on mount ──
  useEffect(() => {
    async function load() {
      const [{ data: profile }, { data: members }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("profiles").select("*").order("full_name"),
      ]);

      if (profile) {
        setMyProfile(profile as ProfileRow);
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
      }
      setTeamMembers((members || []) as ProfileRow[]);

      // Load profile sub-records
      if (profile) {
        const [{ data: phones }, { data: emails }, { data: addrs }] = await Promise.all([
          supabase
            .from("contact_phones")
            .select("id, designation, number, is_primary")
            .eq("entity_type", "profile")
            .eq("entity_id", profile.id)
            .order("is_primary", { ascending: false }),
          supabase
            .from("contact_emails")
            .select("id, designation, address, is_primary")
            .eq("entity_type", "profile")
            .eq("entity_id", profile.id)
            .order("is_primary", { ascending: false }),
          supabase
            .from("contact_addresses")
            .select("id, designation, street, city, state, zip, country, is_primary")
            .eq("entity_type", "profile")
            .eq("entity_id", profile.id)
            .order("is_primary", { ascending: false }),
        ]);

        const pList = (phones || []) as PhoneRecord[];
        const eList = (emails || []) as EmailRecord[];
        const aList = (addrs || []).map((a: Record<string, unknown>) => ({
          ...a,
          street: (a.street as string) || "",
          city: (a.city as string) || "",
          state: (a.state as string) || "",
          zip: (a.zip as string) || "",
          country: (a.country as string) || "",
        })) as AddressRecord[];

        setProfilePhones(pList);
        setProfileEmails(eList);
        setProfileAddresses(aList);
        setOrigProfilePhoneIds(new Set(pList.filter((p) => p.id).map((p) => p.id!)));
        setOrigProfileEmailIds(new Set(eList.filter((e) => e.id).map((e) => e.id!)));
        setOrigProfileAddressIds(new Set(aList.filter((a) => a.id).map((a) => a.id!)));
      }

      setLoading(false);
    }
    load();
  }, []);

  // ── Profile auto-save ──
  type ProfileAutoSaveSnapshot = {
    firstName: string;
    lastName: string;
    profilePhones: PhoneRecord[];
    profileEmails: EmailRecord[];
    profileAddresses: AddressRecord[];
  };

  const profileAutoSaveState: ProfileAutoSaveSnapshot = useMemo(
    () => ({ firstName, lastName, profilePhones, profileEmails, profileAddresses }),
    [firstName, lastName, profilePhones, profileEmails, profileAddresses]
  );

  const profileAutoSaveRestore = useCallback((snap: unknown) => {
    const s = snap as Partial<ProfileAutoSaveSnapshot> & Record<string, unknown>;
    if (s && typeof s === "object" && "firstName" in s) {
      setFirstName((s.firstName as string) ?? "");
      setLastName((s.lastName as string) ?? "");
      if (s.profilePhones) setProfilePhones(s.profilePhones as PhoneRecord[]);
      if (s.profileEmails) setProfileEmails(s.profileEmails as EmailRecord[]);
      if (s.profileAddresses) setProfileAddresses(s.profileAddresses as AddressRecord[]);
    } else if (s && typeof s === "object") {
      const row = s as Record<string, unknown>;
      setFirstName((row.first_name as string) ?? "");
      setLastName((row.last_name as string) ?? "");
    }
  }, []);

  const profileAutoSave = useAutoSave<ProfileAutoSaveSnapshot>({
    recordId: myProfile?.id ?? "",
    tableName: "profiles",
    state: profileAutoSaveState,
    restore: profileAutoSaveRestore,
    enabled: !loading && !!myProfile,
    save: async (snap) => {
      if (!myProfile) return;
      const full_name = [snap.firstName, snap.lastName].filter(Boolean).join(" ");
      await supabase
        .from("profiles")
        .update({ first_name: snap.firstName || null, last_name: snap.lastName || null, full_name })
        .eq("id", myProfile.id);
      await Promise.all([
        syncPhones("profile", myProfile.id, snap.profilePhones, origProfilePhoneIds),
        syncEmails("profile", myProfile.id, snap.profileEmails, origProfileEmailIds),
        syncAddresses("profile", myProfile.id, snap.profileAddresses, origProfileAddressIds),
      ]);
      setOrigProfilePhoneIds(new Set(snap.profilePhones.filter((p) => p.id).map((p) => p.id!)));
      setOrigProfileEmailIds(new Set(snap.profileEmails.filter((e) => e.id).map((e) => e.id!)));
      setOrigProfileAddressIds(new Set(snap.profileAddresses.filter((a) => a.id).map((a) => a.id!)));
      setMyProfile({ ...myProfile, first_name: snap.firstName || null, last_name: snap.lastName || null, full_name });
    },
  });

  // ── Password change ──
  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
    } else {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2000);
    }
  }

  // ── Team: open member detail ──
  async function openTeamMember(member: ProfileRow) {
    if (!canManageTeam && member.id !== userId) return;

    setEditingId(member.id);
    setIsNewMember(false);
    setTempPassword(null);
    setTeamForm({
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      email: member.email,
      role: member.role || "manager",
    });
    setPanelOpen(true);

    // Load sub-records
    const [{ data: phones }, { data: emails }, { data: addrs }] = await Promise.all([
      supabase
        .from("contact_phones")
        .select("id, designation, number, is_primary")
        .eq("entity_type", "profile")
        .eq("entity_id", member.id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("contact_emails")
        .select("id, designation, address, is_primary")
        .eq("entity_type", "profile")
        .eq("entity_id", member.id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("contact_addresses")
        .select("id, designation, street, city, state, zip, country, is_primary")
        .eq("entity_type", "profile")
        .eq("entity_id", member.id)
        .order("is_primary", { ascending: false }),
    ]);

    const pList = (phones || []) as PhoneRecord[];
    const eList = (emails || []) as EmailRecord[];
    const aList = (addrs || []).map((a: Record<string, unknown>) => ({
      ...a,
      street: (a.street as string) || "",
      city: (a.city as string) || "",
      state: (a.state as string) || "",
      zip: (a.zip as string) || "",
      country: (a.country as string) || "",
    })) as AddressRecord[];

    setTeamPhones(pList);
    setTeamEmails(eList);
    setTeamAddresses(aList);
    setOrigTeamPhoneIds(new Set(pList.filter((p) => p.id).map((p) => p.id!)));
    setOrigTeamEmailIds(new Set(eList.filter((e) => e.id).map((e) => e.id!)));
    setOrigTeamAddressIds(new Set(aList.filter((a) => a.id).map((a) => a.id!)));
  }

  // ── Team: open new member form ──
  function openNewMember() {
    setEditingId(null);
    setIsNewMember(true);
    setTempPassword(null);
    setTeamForm({ first_name: "", last_name: "", email: "", role: "manager" });
    setTeamPhones([]);
    setTeamEmails([]);
    setTeamAddresses([]);
    setOrigTeamPhoneIds(new Set());
    setOrigTeamEmailIds(new Set());
    setOrigTeamAddressIds(new Set());
    setPanelOpen(true);
  }

  // ── Team: save member ──
  const handleTeamSave = useCallback(async () => {
    setTeamSaving(true);
    setTeamSaved(false);

    try {
      if (isNewMember) {
        // Create via API route
        const res = await fetch("/api/team/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: teamForm.email,
            first_name: teamForm.first_name,
            last_name: teamForm.last_name,
            role: teamForm.role,
            org_id: myProfile?.org_id,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Failed to create team member");
          return;
        }

        setTempPassword(data.tempPassword);
        setEditingId(data.id);
        setIsNewMember(false);

        // Sync sub-records for the new member
        await Promise.all([
          syncPhones("profile", data.id, teamPhones, origTeamPhoneIds),
          syncEmails("profile", data.id, teamEmails, origTeamEmailIds),
          syncAddresses("profile", data.id, teamAddresses, origTeamAddressIds),
        ]);

        // Refresh team list
        const { data: members } = await supabase.from("profiles").select("*").order("full_name");
        setTeamMembers((members || []) as ProfileRow[]);
      } else if (editingId) {
        // Update existing member
        const full_name = [teamForm.first_name, teamForm.last_name].filter(Boolean).join(" ");
        await supabase
          .from("profiles")
          .update({
            first_name: teamForm.first_name || null,
            last_name: teamForm.last_name || null,
            full_name,
            role: teamForm.role,
          })
          .eq("id", editingId);

        await Promise.all([
          syncPhones("profile", editingId, teamPhones, origTeamPhoneIds),
          syncEmails("profile", editingId, teamEmails, origTeamEmailIds),
          syncAddresses("profile", editingId, teamAddresses, origTeamAddressIds),
        ]);

        // Update orig IDs
        setOrigTeamPhoneIds(new Set(teamPhones.filter((p) => p.id).map((p) => p.id!)));
        setOrigTeamEmailIds(new Set(teamEmails.filter((e) => e.id).map((e) => e.id!)));
        setOrigTeamAddressIds(new Set(teamAddresses.filter((a) => a.id).map((a) => a.id!)));

        // Refresh team list
        setTeamMembers((prev) =>
          prev.map((m) =>
            m.id === editingId
              ? { ...m, first_name: teamForm.first_name || null, last_name: teamForm.last_name || null, full_name, role: teamForm.role }
              : m
          )
        );
      }

      setTeamSaved(true);
      setTimeout(() => setTeamSaved(false), 1500);
    } finally {
      setTeamSaving(false);
    }
  }, [isNewMember, editingId, teamForm, myProfile, supabase, teamPhones, teamEmails, teamAddresses, origTeamPhoneIds, origTeamEmailIds, origTeamAddressIds]);

  // ── Team: delete member ──
  const handleTeamDelete = useCallback(async () => {
    if (!editingId || !confirm("Delete this team member? This cannot be undone.")) return;
    setTeamDeleting(true);
    try {
      const res = await fetch(`/api/team/${editingId}`, { method: "DELETE" });
      if (res.ok) {
        setTeamMembers((prev) => prev.filter((m) => m.id !== editingId));
        setPanelOpen(false);
      }
    } finally {
      setTeamDeleting(false);
    }
  }, [editingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  const teamPanelTitle = isNewMember
    ? "Add Teammate"
    : [teamForm.first_name, teamForm.last_name].filter(Boolean).join(" ") || "Edit Member";

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-black">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">Account and organization settings.</p>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-zinc-200">
        {mainTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-black text-black"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className={cn("mt-6", activeTab === "picklists" ? "max-w-2xl" : "max-w-lg")}>
        {/* ── Profile Tab ── */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-black">Profile</h2>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-500">Email</label>
                <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500">
                  {myProfile?.email || ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-500">First Name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-black outline-none hover:border-zinc-300 focus:border-zinc-400 transition-colors"
                    placeholder="First"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-500">Last Name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-black outline-none hover:border-zinc-300 focus:border-zinc-400 transition-colors"
                    placeholder="Last"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-500">Role</label>
                <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500 capitalize">
                  {myProfile?.role?.replace(/_/g, " ") || "---"}
                </p>
              </div>

              <PhoneSection phones={profilePhones} onChange={setProfilePhones} />
              <EmailSection emails={profileEmails} onChange={setProfileEmails} />
              <AddressSection addresses={profileAddresses} onChange={setProfileAddresses} />

              <SavedIndicator
                saving={profileAutoSave.saving}
                savedAt={profileAutoSave.savedAt}
                error={profileAutoSave.error}
                hasUndo={profileAutoSave.hasUndo}
                onUndo={profileAutoSave.undo}
              />
            </div>

            {/* Password */}
            <div className="space-y-4 border-t border-zinc-200 pt-6">
              <h2 className="text-sm font-semibold text-black">Change Password</h2>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-500">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-black outline-none hover:border-zinc-300 focus:border-zinc-400 transition-colors"
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-500">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-black outline-none hover:border-zinc-300 focus:border-zinc-400 transition-colors"
                  placeholder="Confirm new password"
                />
              </div>

              {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}

              <button
                onClick={handleChangePassword}
                className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                {passwordSaved ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Updated
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Team Tab ── */}
        {activeTab === "team" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-black">Team Members</h2>
              {canManageTeam && (
                <button
                  onClick={openNewMember}
                  className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Teammate
                </button>
              )}
            </div>
            <div className="space-y-2">
              {teamMembers.map((member) => {
                const initials = (member.full_name || "?")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const clickable = canManageTeam || member.id === userId;

                return (
                  <div
                    key={member.id}
                    onClick={() => clickable && openTeamMember(member)}
                    className={cn(
                      "flex items-center gap-3 rounded-md border border-zinc-200 px-4 py-3",
                      clickable && "cursor-pointer hover:bg-zinc-50 transition-colors"
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600">
                      {initials}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black">{member.full_name}</p>
                      <p className="text-xs text-zinc-500">{member.email}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600 capitalize">
                      {member.role?.replace(/_/g, " ") || "member"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Integrations Tab ── */}
        {activeTab === "integrations" && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-black">Integrations</h2>

            <div className="rounded-md border border-zinc-200 px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">Box</p>
                  <p className="text-xs text-zinc-500">File storage and document management</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Connected
                </span>
              </div>
            </div>

            <div className="rounded-md border border-zinc-200 px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">Microsoft 365</p>
                  <p className="text-xs text-zinc-500">Outlook calendar sync</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Picklists Tab ── */}
        {activeTab === "picklists" && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-black">Picklists</h2>
            <p className="text-xs text-zinc-500">Manage lookup values used throughout the app.</p>

            {PICKLIST_TABLES.map((pl) => {
              const isOpen = expandedPicklists.has(pl.table);
              const rows = picklistData[pl.table] || [];

              return (
                <div key={pl.table} className="rounded-md border border-zinc-200">
                  <button
                    onClick={() => togglePicklistSection(pl.table)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-black">{pl.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-400">{rows.length}</span>
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-zinc-200">
                      {rows.length === 0 && (
                        <p className="px-4 py-3 text-xs text-zinc-400">No items yet.</p>
                      )}
                      {rows.map((row) => (
                        <div key={row.id} className="flex items-center gap-2 border-b border-zinc-100 px-4 py-1.5 last:border-b-0">
                          <div className="flex-1 min-w-0">
                            {editingPicklistCell?.table === pl.table && editingPicklistCell?.id === row.id ? (
                              <input
                                autoFocus
                                value={editingPicklistValue}
                                onChange={(e) => setEditingPicklistValue(e.target.value)}
                                onBlur={() => handleSavePicklistLabel(pl.table, row.id, editingPicklistValue)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSavePicklistLabel(pl.table, row.id, editingPicklistValue);
                                  if (e.key === "Escape") setEditingPicklistCell(null);
                                }}
                                className="w-full rounded border border-zinc-300 px-2 py-0.5 text-sm text-black outline-none focus:border-zinc-400"
                              />
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingPicklistCell({ table: pl.table, id: row.id });
                                  setEditingPicklistValue(row.label);
                                }}
                                className="cursor-text"
                              >
                                <span className="text-sm text-black">{row.label}</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeletePicklistItem(pl.table, row.id)}
                            className="flex-shrink-0 text-zinc-300 hover:text-red-500 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {addingToTable === pl.table ? (
                        <div className="flex items-center gap-2 px-4 py-2">
                          <input
                            autoFocus
                            value={newItemLabel}
                            onChange={(e) => setNewItemLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddPicklistItem(pl.table);
                              if (e.key === "Escape") { setAddingToTable(null); setNewItemLabel(""); }
                            }}
                            placeholder="New item label..."
                            className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs outline-none focus:border-black"
                          />
                          <button
                            onClick={() => handleAddPicklistItem(pl.table)}
                            className="rounded bg-black px-2 py-1 text-xs text-white hover:bg-zinc-800"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => { setAddingToTable(null); setNewItemLabel(""); }}
                            className="text-xs text-zinc-400 hover:text-zinc-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingToTable(pl.table); setNewItemLabel(""); }}
                          className="flex w-full items-center gap-1.5 px-4 py-2 text-xs font-medium text-zinc-500 hover:text-black hover:bg-zinc-50 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Team Member Detail Panel ── */}
      <DetailPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={teamPanelTitle}
        footer={
          <div className="flex items-center justify-between">
            <div>
              {!isNewMember && editingId && canDelete && editingId !== userId && (
                <button
                  onClick={handleTeamDelete}
                  disabled={teamDeleting}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  {teamDeleting ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPanelOpen(false)}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleTeamSave}
                disabled={teamSaving}
                className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {teamSaving ? "Saving..." : teamSaved ? "Saved \u2713" : "Save"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Temp password banner */}
          {tempPassword && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-medium text-amber-800">Temporary Password</p>
              <p className="mt-0.5 font-mono text-sm text-amber-900 select-all">{tempPassword}</p>
              <p className="mt-1 text-[11px] text-amber-600">Share this with the new team member. They should change it on first login.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name">
              <Input
                value={teamForm.first_name}
                onChange={(e) => setTeamForm({ ...teamForm, first_name: e.target.value })}
                placeholder="First"
              />
            </Field>
            <Field label="Last Name">
              <Input
                value={teamForm.last_name}
                onChange={(e) => setTeamForm({ ...teamForm, last_name: e.target.value })}
                placeholder="Last"
              />
            </Field>
          </div>

          <Field label="Email">
            {isNewMember ? (
              <Input
                type="email"
                value={teamForm.email}
                onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                placeholder="email@example.com"
              />
            ) : (
              <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500">
                {teamForm.email}
              </p>
            )}
          </Field>

          <Field label="Role">
            <Select
              value={teamForm.role}
              onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value })}
              options={ROLE_OPTIONS}
            />
          </Field>

          <PhoneSection phones={teamPhones} onChange={setTeamPhones} />
          <EmailSection emails={teamEmails} onChange={setTeamEmails} />
          <AddressSection addresses={teamAddresses} onChange={setTeamAddresses} />
        </div>
      </DetailPanel>
    </div>
  );
}
