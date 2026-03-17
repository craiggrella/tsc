export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ContactsClient } from "./contacts-client";

const PAGE_SIZE = 50;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string; open?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const search = params.q || "";
  const typeFilter = params.type || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Build query with server-side search and pagination
  let query = supabase
    .from("people")
    .select("*, company:companies!company_id(id, name)", { count: "exact" });

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,title.ilike.%${search}%`
    );
  }
  if (typeFilter) {
    query = query.eq("type", typeFilter);
  }

  const { data: contacts, count } = await query
    .order("full_name")
    .range(offset, offset + PAGE_SIZE - 1);

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  return (
    <ContactsClient
      initialContacts={contacts || []}
      companies={companies || []}
      totalCount={count || 0}
      currentPage={page}
      pageSize={PAGE_SIZE}
      initialSearch={search}
      initialTypeFilter={typeFilter}
      openContactId={params.open || null}
    />
  );
}
