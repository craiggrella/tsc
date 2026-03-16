// ============================================
// CORE ENTITIES
// ============================================

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  org_id: string;
  full_name: string;
  email: string;
  role: "admin" | "manager" | "assistant";
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  org_id: string;
  name: string;
  types: string[];
  outlet: string[];
  department: string[];
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CompanyType =
  | "studio"
  | "network"
  | "production_company"
  | "agency"
  | "management"
  | "law_firm"
  | "distributor"
  | "guild"
  | "publisher"
  | "publicity"
  | "theatre"
  | "financer"
  | "hedge_fund"
  | "business_management"
  | "financial_consultant"
  | "news"
  | "video_game_publisher";

export type CompanyOutlet =
  | "broadcast"
  | "cable"
  | "digital"
  | "independent"
  | "major"
  | "pod";

export interface Person {
  id: string;
  org_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  type: PersonType | null;
  exec_level: ExecLevel | null;
  company_id: string | null;
  department: string[];
  phone_cell: string | null;
  phone_office: string | null;
  phone_home: string | null;
  phone_other: string | null;
  preferred_phone: "cell" | "office" | "home" | "other" | null;
  email_office: string | null;
  email_home: string | null;
  email_other: string | null;
  preferred_email: "office" | "home" | "other" | null;
  website: string | null;
  linkedin: string | null;
  instagram: string | null;
  assistant_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PersonType =
  | "contact"
  | "potential_client"
  | "vendor"
  | "assistant"
  | "executive";

export type ExecLevel =
  | "intern"
  | "assistant"
  | "coordinator"
  | "manager"
  | "director"
  | "vice_president"
  | "senior_vice_president"
  | "executive_vice_president"
  | "president"
  | "chair";

export interface Client {
  id: string;
  org_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  staff_level: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus =
  | "rumored"
  | "development"
  | "pilot"
  | "picked_up"
  | "current"
  | "on_the_bubble"
  | "completed"
  | "cancelled";

// ============================================
// ACTIVITY ENTITIES
// ============================================

export interface Call {
  id: string;
  org_id: string;
  about: string;
  contact_id: string | null;
  client_id: string | null;
  user_id: string;
  call_status: CallStatus;
  priority: "high" | "medium" | "low" | null;
  preferred_phone: "cell" | "office" | "home" | "other" | "custom" | null;
  phone_custom: string | null;
  quick_connect: boolean;
  log_time: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CallStatus =
  | "to_call"
  | "incoming"
  | "left_word"
  | "returning"
  | "connected";

export interface Submission {
  id: string;
  org_id: string;
  description: string;
  status: SubmissionStatus;
  reason: string[];
  response: "love" | "like" | "meh" | "hate" | null;
  responsible_user_id: string | null;
  submission_date: string | null;
  set_meeting: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SubmissionStatus = "need_to_send" | "sent" | "connected";

export type SubmissionReason =
  | "general"
  | "meeting"
  | "staffing"
  | "at_their_request"
  | "spec_script"
  | "development";

export interface Meeting {
  id: string;
  org_id: string;
  title: string;
  meeting_status: MeetingStatus;
  meeting_at: string | null;
  location_link: string | null;
  response: "love" | "like" | "meh" | "hate" | null;
  responsible_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MeetingStatus =
  | "need_to_set"
  | "need_to_reschedule"
  | "scheduled"
  | "completed"
  | "cancelled";

// ============================================
// ASSET ENTITIES
// ============================================

export interface ClientMaterial {
  id: string;
  org_id: string;
  title: string;
  client_id: string;
  status: ClientMaterialStatus;
  format: string | null;
  genre: string | null;
  sub_genre: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientMaterialStatus =
  | "not_yet_reviewed"
  | "in_review"
  | "coverage_available"
  | "notes_given"
  | "editing"
  | "final_draft";

export interface Contract {
  id: string;
  org_id: string;
  contract_name: string;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientCredit {
  id: string;
  org_id: string;
  project_name: string;
  project_id: string | null;
  client_id: string;
  level: string | null;
  year: number | null;
  created_at: string;
}

// ============================================
// FILE MANAGEMENT (Box-backed)
// ============================================

export interface FileAttachment {
  id: string;
  org_id: string;
  file_name: string;
  file_path: string;
  bucket: string;
  file_size: number | null;
  mime_type: string | null;
  category: FileCategory | null;
  box_file_id: string | null;
  box_url: string | null;
  client_id: string | null;
  person_id: string | null;
  project_id: string | null;
  company_id: string | null;
  contract_id: string | null;
  client_material_id: string | null;
  submission_id: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export type FileCategory =
  | "script"
  | "contract"
  | "reel"
  | "headshot"
  | "bio"
  | "press"
  | "coverage"
  | "other";

// Box API types (client-side)
export interface BoxItem {
  id: string;
  type: "file" | "folder";
  name: string;
  size?: number;
  modified_at?: string;
  parent?: { id: string; name: string };
}

export interface BoxFolder extends BoxItem {
  type: "folder";
  item_collection?: {
    entries: BoxItem[];
    total_count: number;
  };
}

export interface BoxFile extends BoxItem {
  type: "file";
  extension?: string;
  shared_link?: { download_url: string; url: string } | null;
}
