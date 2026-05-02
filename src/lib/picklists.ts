"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PicklistItem {
  id: string;
  value: string;
  label: string;
  sort_order: number;
}

const cache: Record<string, PicklistItem[]> = {};

export function usePicklist(tableName: string): PicklistItem[] {
  const [items, setItems] = useState<PicklistItem[]>(cache[tableName] || []);
  const supabase = createClient();

  useEffect(() => {
    if (cache[tableName]) {
      setItems(cache[tableName]);
      return;
    }
    supabase
      .from(tableName)
      .select("id, value, label, sort_order")
      .order("sort_order")
      .then(({ data }) => {
        const result = (data || []) as PicklistItem[];
        cache[tableName] = result;
        setItems(result);
      });
  }, [tableName]);

  return items;
}

// Helper: convert picklist to { value, label } array for Select components
export function toSelectOptions(items: PicklistItem[]): { value: string; label: string }[] {
  return items.map((i) => ({ value: i.value, label: i.label }));
}

// Helper: convert picklist to RelationOption array for MultiRelationPicker
export function toRelationOptions(items: PicklistItem[]): { id: string; label: string }[] {
  return items.map((i) => ({ id: i.value, label: i.label }));
}

// Invalidate cache for a specific table (after settings edit)
export function invalidatePicklistCache(tableName: string) {
  delete cache[tableName];
}

// All picklist table names for the settings page
export const PICKLIST_TABLES = [
  { table: "list_contact_types", label: "Contact Types" },
  { table: "list_contact_levels", label: "Contact Levels" },
  { table: "list_company_types", label: "Company Types" },
  { table: "list_location_types", label: "Location Types" },
  { table: "list_departments", label: "Departments" },
  { table: "list_buyer_types", label: "Buyer Types" },
  { table: "list_outlets", label: "Outlets" },
  { table: "list_material_types", label: "Material Types" },
  { table: "list_statuses", label: "Material Statuses" },
  { table: "list_formats", label: "Formats" },
  { table: "list_genres", label: "Genres" },
  { table: "list_sub_genres", label: "Sub-Genres" },
  { table: "list_project_statuses", label: "Project Statuses" },
  { table: "list_credit_statuses", label: "Credit Statuses" },
];
