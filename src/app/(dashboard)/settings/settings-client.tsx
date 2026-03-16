"use client";

import { useState } from "react";
import { User, Users, HardDrive, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
}

interface SettingsClientProps {
  profile: ProfileData | null;
  userEmail: string;
  teamMembers: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url: string | null;
  }[];
}

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "team", label: "Team", icon: Users },
  { id: "integrations", label: "Integrations", icon: HardDrive },
];

export function SettingsClient({
  profile,
  userEmail,
  teamMembers,
}: SettingsClientProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile form
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  async function handleSaveProfile() {
    setSaving(true);
    setSaved(false);
    await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", profile!.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordError(error.message);
    } else {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2000);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-black">
        Settings
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Account and organization settings.
      </p>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-zinc-200">
        {tabs.map((tab) => (
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

      <div className="mt-6 max-w-lg">
        {/* ── Profile Tab ── */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-black">Profile</h2>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-500">
                  Email
                </label>
                <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500">
                  {userEmail}
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-500">
                  Full Name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-black outline-none hover:border-zinc-300 focus:border-zinc-400 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-500">
                  Role
                </label>
                <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500 capitalize">
                  {profile?.role || "—"}
                </p>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {saved ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Saved
                  </>
                ) : saving ? (
                  "Saving..."
                ) : (
                  "Save Profile"
                )}
              </button>
            </div>

            {/* Password */}
            <div className="space-y-4 border-t border-zinc-200 pt-6">
              <h2 className="text-sm font-semibold text-black">
                Change Password
              </h2>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-500">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-black outline-none hover:border-zinc-300 focus:border-zinc-400 transition-colors"
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-500">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-black outline-none hover:border-zinc-300 focus:border-zinc-400 transition-colors"
                  placeholder="Confirm new password"
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-500">{passwordError}</p>
              )}

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
            <h2 className="text-sm font-semibold text-black">Team Members</h2>
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-md border border-zinc-200 px-4 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600">
                    {member.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">
                      {member.full_name}
                    </p>
                    <p className="text-xs text-zinc-500">{member.email}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600 capitalize">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Integrations Tab ── */}
        {activeTab === "integrations" && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-black">Integrations</h2>

            {/* Box */}
            <div className="rounded-md border border-zinc-200 px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">Box</p>
                  <p className="text-xs text-zinc-500">
                    File storage and document management
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Connected
                </span>
              </div>
            </div>

            {/* Microsoft 365 */}
            <div className="rounded-md border border-zinc-200 px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">
                    Microsoft 365
                  </p>
                  <p className="text-xs text-zinc-500">
                    Outlook calendar sync
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
