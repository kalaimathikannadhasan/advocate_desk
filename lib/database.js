
import { supabase } from "./supabase";

// Generate unique text IDs
function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// Get logged-in user
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user) throw new Error("Please login first.");

  return data.user;
}

// Common functions
async function getRecords(table) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function addRecord(table, record, prefix) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from(table)
    .insert({
      ...record,
      id: generateId(prefix),
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateRecord(table, id, changes) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from(table)
    .update(changes)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteRecord(table, id) {
  const user = await getCurrentUser();

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}

// CLIENTS
export const getClients = () =>
  getRecords("client_details");

export const addClient = (client) =>
  addRecord("client_details", client, "CL");

export const updateClient = (id, changes) =>
  updateRecord("client_details", id, changes);

export const deleteClient = (id) =>
  deleteRecord("client_details", id);

// CASES
export const getCases = () =>
  getRecords("cases");

export const addCase = (caseData) =>
  addRecord("cases", caseData, "CASE");

export const updateCase = (id, changes) =>
  updateRecord("cases", id, changes);

export const deleteCase = (id) =>
  deleteRecord("cases", id);

// PAYMENTS
export const getPayments = () =>
  getRecords("payments");

export const addPayment = (payment) =>
  addRecord("payments", payment, "PAY");

export const updatePayment = (id, changes) =>
  updateRecord("payments", id, changes);

export const deletePayment = (id) =>
  deleteRecord("payments", id);

// ADVOCATE PROFILE
export async function getAdvocateProfile() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("advocates")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveAdvocateProfile(profile) {
  const user = await getCurrentUser();

  const { data: existing, error: findError } = await supabase
    .from("advocates")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) throw findError;

  if (existing) {
    const { data, error } = await supabase
      .from("advocates")
      .update(profile)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  return addRecord("advocates", profile, "ADV");
}
