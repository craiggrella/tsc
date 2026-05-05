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
  buyer_type: BuyerType | null;
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
  assistant_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type BuyerType =
  | "Pod"
  | "Studio"
  | "Network"
  | "Streamer"
  | "Production Company"
  | "Other";

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
  imdb_id: string | null;
  poster_url: string | null;
  poster_fetched_at: string | null;
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
// CONTACT INFO SUB-RECORDS
// ============================================

export type PhoneDesignation = "Cell" | "Office" | "Home" | "Assistant" | "Fax" | "INTL" | "Other";
export type EmailDesignation = "Work" | "Personal" | "Assistant" | "Other";
export type AddressDesignation = "Office" | "Home" | "Mailing" | "Other";

export interface ContactPhone {
  id: string;
  org_id: string;
  entity_type: "person" | "client";
  entity_id: string;
  designation: PhoneDesignation;
  number: string;
  is_primary: boolean;
  created_at: string;
}

export interface ContactEmail {
  id: string;
  org_id: string;
  entity_type: "person" | "client";
  entity_id: string;
  designation: EmailDesignation;
  address: string;
  is_primary: boolean;
  created_at: string;
}

export interface ContactAddress {
  id: string;
  org_id: string;
  entity_type: "person" | "client";
  entity_id: string;
  designation: AddressDesignation;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  is_primary: boolean;
  created_at: string;
}

export type SocialPlatform = "Facebook" | "Instagram" | "YouTube" | "LinkedIn" | "Twitter/X" | "TikTok" | "IMDb" | "Website" | "Other";

export interface ContactSocial {
  id: string;
  org_id: string;
  entity_type: "person" | "client";
  entity_id: string;
  platform: SocialPlatform;
  url: string;
  created_at: string;
}

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
  subject: string | null;
  preferred_phone: string | null; // UUID of contact_phones record, or "custom"
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
  | "completed";

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
  client_id: string | null;
  material_type: string | null;
  status: ClientMaterialStatus;
  format: string | null;
  genre: string | null;
  sub_genre: string | null;
  file_url: string | null;
  box_file_id: string | null;
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

export type MaterialType = "Pilot" | "Movie" | "Episode" | "Treatment" | "Script" | "Other";

export interface MaterialResponse {
  id: string;
  org_id: string;
  material_id: string;
  person_id: string;
  response: "love" | "like" | "meh" | "hate" | null;
  created_at: string;
}

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
