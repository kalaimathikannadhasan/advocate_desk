
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "./lib/supabase";
import LoginScreen from "./screens/login";


const tabs = ["Dashboard", "Clients", "Cases", "Hearings", "Fees", "Advocate"];

const emptyClient = { name: "", phone: "", email: "", address: "", notes: "" };
const emptyCase = {
  number: "", type: "Civil", client: "", court: "",
  next: "", petitioner: "", respondent: "", judge: "", notes: ""
};
const emptyPayment = {
  client: "", caseNo: "", total: "", paid: "", date: "", mode: "UPI"
};

const makeId = (prefix) => `${prefix}-${Date.now()}`;

function Field({ label, value, onChangeText, placeholder, keyboardType = "default" }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={String(value ?? "")}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function Button({ title, onPress, secondary = false, disabled = false }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[s.button, secondary && s.secondaryButton, disabled && { opacity: 0.5 }]}
    >
      <Text style={[s.buttonText, secondary && s.secondaryButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function Stat({ title, value, color }) {
  return (
    <View style={[s.stat, { borderLeftColor: color }]}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.muted}>{title}</Text>
    </View>
  );
}

export default function App() {

    const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) console.log("Session Error:", error.message);

      setSession(data?.session ?? null);
      setAuthLoading(false);
    }).catch((error) => {
      if (!mounted) return;
      console.error("Session Error:", error.message);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  const [tab, setTab] = useState("Dashboard");

  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState("");
  const [search, setSearch] = useState("");

  const [clientForm, setClientForm] = useState({ ...emptyClient });
  const [caseForm, setCaseForm] = useState({ ...emptyCase });
  const [paymentForm, setPaymentForm] = useState({ ...emptyPayment });

  // Get logged-in user
  const getCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error) throw error;
    if (!data.user) throw new Error("Please login again.");

    return data.user;
  };

  const userId = session?.user?.id;
  const requestId = useRef(0);

  // Fetch each table independently after authentication is ready.
  const fetchAllData = useCallback(async () => {
    if (!userId) return;
    const currentRequest = ++requestId.current;
    setLoading(true);

    try {
      const tables = [
        ["client_details", setClients],
        ["cases", setCases],
        ["payments", setPayments],
      ];
      const results = await Promise.allSettled(tables.map(async ([table]) => {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data ?? [];
      }));

      if (currentRequest !== requestId.current) return;
      const errors = [];
      results.forEach((result, index) => {
        const [table, setData] = tables[index];
        if (result.status === "fulfilled") {
          setData(result.value);
          console.log(`${table}: ${result.value.length} rows loaded`);
        } else {
          const error = result.reason;
          console.error(`Supabase ${table}:`, error?.code, error?.message);
          errors.push(`${table}: ${error?.message || String(error)}`);
        }
      });
      if (errors.length) Alert.alert("Database Error", errors.join("\n"));
    } catch (error) {
      if (currentRequest === requestId.current) {
        console.error("Fetch Error:", error?.message);
        Alert.alert("Database Error", error?.message || String(error));
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    setClients([]);
    setCases([]);
    setPayments([]);
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchAllData();
    return () => { requestId.current += 1; };
  }, [authLoading, userId, fetchAllData]);

  // Find client name using client_id
  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || "Unknown Client";
  };

  // Find case number using case_id
  const getCaseNumber = (caseId) => {
    const item = cases.find((c) => c.id === caseId);
    return item?.case_number || "—";
  };

  // ADD CLIENT
  const addClient = async () => {
    if (!clientForm.name.trim() || !clientForm.phone.trim()) {
      Alert.alert("Required", "Enter client name and phone number.");
      return;
    }

    try {
      setSaving(true);
      const user = await getCurrentUser();

      const newClient = {
        id: makeId("CL"),
        name: clientForm.name.trim(),
        phone: clientForm.phone.trim(),
        email: clientForm.email.trim() || null,
        address: clientForm.address.trim() || null,
        notes: clientForm.notes.trim() || null,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from("client_details")
        .insert([newClient])
        .select()
        .single();

      if (error) throw error;

      setClients((prev) => [data, ...prev]);
      setClientForm({ ...emptyClient });
      setModal("");

      Alert.alert("Success", "Client added successfully!");
    } catch (error) {
      Alert.alert("Client Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  // ADD CASE
  const addCase = async () => {
    if (!caseForm.number.trim() || !caseForm.client.trim()) {
      Alert.alert("Required", "Enter case number and client name.");
      return;
    }

    try {
      setSaving(true);

      const user = await getCurrentUser();

      const selectedClient = clients.find(
        (c) => c.name.trim().toLowerCase() === caseForm.client.trim().toLowerCase()
      );

      if (!selectedClient) {
        throw new Error("Client not found. Please add the client first or enter the exact client name.");
      }

      const newCase = {
        id: makeId("CASE"),
        case_number: caseForm.number.trim(),
        case_type: caseForm.type.trim() || "Civil",
        client_id: selectedClient.id,
        court_name: caseForm.court.trim() || null,
        next_hearing: caseForm.next.trim() || null,
        status: "Active",
        petitioner: caseForm.petitioner.trim() || null,
        respondent: caseForm.respondent.trim() || null,
        judge_name: caseForm.judge.trim() || null,
        notes: caseForm.notes.trim() || null,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from("cases")
        .insert([newCase])
        .select()
        .single();

      if (error) throw error;

      setCases((prev) => [data, ...prev]);
      setCaseForm({ ...emptyCase });
      setModal("");

      Alert.alert("Success", "Case saved to Supabase!");
    } catch (error) {
      Alert.alert("Case Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  // ADD PAYMENT
  const addPayment = async () => {
    if (!paymentForm.client.trim() || !paymentForm.total.trim()) {
      Alert.alert("Required", "Enter client name and total fee.");
      return;
    }

    const total = Number(paymentForm.total);
    const paid = Number(paymentForm.paid || 0);

    if (!Number.isFinite(total) || !Number.isFinite(paid) || total < 0 || paid < 0) {
      Alert.alert("Invalid Amount", "Enter valid payment amounts.");
      return;
    }

    if (paid > total) {
      Alert.alert("Invalid Amount", "Paid amount cannot exceed total fee.");
      return;
    }

    try {
      setSaving(true);

      const user = await getCurrentUser();

      const selectedClient = clients.find(
        (c) => c.name.trim().toLowerCase() === paymentForm.client.trim().toLowerCase()
      );

      if (!selectedClient) {
        throw new Error("Client not found. Please enter an existing client name.");
      }

      let selectedCase = null;

      if (paymentForm.caseNo.trim()) {
        selectedCase = cases.find(
          (c) => c.case_number.trim().toLowerCase() === paymentForm.caseNo.trim().toLowerCase()
        );

        if (!selectedCase) {
          throw new Error("Case number not found. Enter an existing case number.");
        }

        if (selectedCase.client_id !== selectedClient.id) {
          throw new Error("The selected case does not belong to this client.");
        }
      }

      const newPayment = {
        id: makeId("PAY"),
        client_id: selectedClient.id,
        case_id: selectedCase?.id || null,
        total_fee: total,
        paid_amount: paid,
        payment_date: paymentForm.date.trim() || new Date().toISOString().slice(0, 10),
        payment_mode: paymentForm.mode.trim() || "UPI",
        user_id: user.id
      };

      const { data, error } = await supabase
        .from("payments")
        .insert([newPayment])
        .select()
        .single();

      if (error) throw error;

      setPayments((prev) => [data, ...prev]);
      setPaymentForm({ ...emptyPayment });
      setModal("");

      Alert.alert("Success", "Payment saved to Supabase!");
    } catch (error) {
      Alert.alert("Payment Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  // Dashboard calculations
  const activeCases = cases.filter(
    (c) => c.status === "Active"
  ).length;

  const pending = payments.reduce(
    (sum, p) =>
      sum + Math.max(0, Number(p.total_fee || 0) - Number(p.paid_amount || 0)),
    0
  );

  const totalPaid = payments.reduce(
    (sum, p) => sum + Number(p.paid_amount || 0),
    0
  );

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return [...cases]
      .filter((c) => c.next_hearing && c.next_hearing >= today)
      .sort((a, b) => a.next_hearing.localeCompare(b.next_hearing));
  }, [cases]);

  const filteredClients = clients.filter((c) =>
    `${c.name || ""} ${c.phone || ""}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const filteredCases = cases.filter((c) =>
    `${c.case_number || ""} ${getClientName(c.client_id)} ${c.case_type || ""}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const money = (value) =>
    "₹" + Number(value || 0).toLocaleString("en-IN");

  // const closeModal = () => {
  //   setModal("");
  // };

  const closeModal = () => {
  setModal("");
};

// LOGIN SESSION CHECK
if (authLoading) {
  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.empty}>Checking login session...</Text>
    </SafeAreaView>
  );
}

// SHOW LOGIN PAGE
if (!session) {
  return <LoginScreen />;
}

// SHOW DASHBOARD AFTER LOGIN
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />

      <View style={s.header}>
        <View>
          <Text style={s.brand}>ADVOCATE DESK</Text>
          <Text style={s.subtitle}>Case & Client Management</Text>
        </View>
        <View style={s.avatar}>
          <Text style={s.avatarText}>AD</Text>
        </View>
      </View>

      <View style={s.navWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => {
                setTab(t);
                setSearch("");
              }}
              style={[s.navItem, tab === t && s.navActive]}
            >
              <Text style={[s.navText, tab === t && s.navTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={s.content} keyboardShouldPersistTaps="handled">

        {/* DASHBOARD */}
        {tab === "Dashboard" && (
          <>
            <Text style={s.heading}>Good day, Advocate</Text>
            <Text style={s.muted}>Your office overview.</Text>

            <Button title="↻ Refresh All Data" secondary onPress={fetchAllData} disabled={loading} />

            {loading ? (
              <Text style={s.empty}>Loading dashboard...</Text>
            ) : (
              <>
                <View style={s.statsGrid}>
                  <Stat title="Total Cases" value={cases.length} color="#3267D6" />
                  <Stat title="Active Cases" value={activeCases} color="#169B70" />
                  <Stat title="Total Clients" value={clients.length} color="#D58A19" />
                  <Stat title="Pending Fees" value={money(pending)} color="#8757C7" />
                  <Stat title="Total Payments Received" value={money(totalPaid)} color="#169B70" />
                </View>

                <View style={s.sectionHead}>
                  <Text style={s.sectionTitle}>Upcoming Hearings</Text>
                  <Text style={s.muted}>{upcoming.length} scheduled</Text>
                </View>

                {upcoming.length === 0 ? (
                  <Text style={s.empty}>No upcoming hearing dates.</Text>
                ) : (
                  upcoming.map((c) => (
                    <View key={c.id} style={s.card}>
                      <Text style={s.cardTitle}>{c.case_number}</Text>
                      <Text style={s.body}>{getClientName(c.client_id)} · {c.court_name || "Court not set"}</Text>
                      <Text style={s.date}>Hearing: {c.next_hearing}</Text>
                    </View>
                  ))
                )}
              </>
            )}
          </>
        )}

        {/* CLIENTS */}
        {tab === "Clients" && (
          <>
            <Text style={s.heading}>Clients</Text>
            <Button title="+ Add Client" onPress={() => setModal("client")} />

            <TextInput
              style={s.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search client name or phone"
            />

            <Button title="Refresh Clients" secondary onPress={fetchAllData} disabled={loading} />

            {loading ? (
              <Text style={s.empty}>Loading clients...</Text>
            ) : filteredClients.length === 0 ? (
              <Text style={s.empty}>No clients found.</Text>
            ) : filteredClients.map((c) => (
              <View style={s.card} key={c.id}>
                <View style={s.rowBetween}>
                  <Text style={s.cardTitle}>{c.name}</Text>
                  <Text style={s.tag}>{c.id}</Text>
                </View>
                <Text style={s.body}>Phone: {c.phone || "—"}</Text>
                <Text style={s.body}>Email: {c.email || "—"}</Text>
                <Text style={s.body}>Address: {c.address || "—"}</Text>
                <Text style={s.muted}>{c.notes || ""}</Text>
              </View>
            ))}
          </>
        )}

        {/* CASES */}
        {tab === "Cases" && (
          <>
            <Text style={s.heading}>Case Management</Text>
            <Button title="+ Add Case" onPress={() => setModal("case")} />

            <TextInput
              style={s.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search case number, client or type"
            />

            {loading ? (
              <Text style={s.empty}>Loading cases...</Text>
            ) : filteredCases.length === 0 ? (
              <Text style={s.empty}>No cases found.</Text>
            ) : filteredCases.map((c) => (
              <View style={s.card} key={c.id}>
                <View style={s.rowBetween}>
                  <Text style={s.cardTitle}>{c.case_number}</Text>
                  <Text style={s.tag}>{c.status || "Active"}</Text>
                </View>
                <Text style={s.body}>{c.case_type} · Client: {getClientName(c.client_id)}</Text>
                <Text style={s.body}>Court: {c.court_name || "—"}</Text>
                <Text style={s.body}>Petitioner: {c.petitioner || "—"}</Text>
                <Text style={s.body}>Respondent: {c.respondent || "—"}</Text>
                <Text style={s.body}>Judge: {c.judge_name || "—"}</Text>
                <Text style={s.date}>Next hearing: {c.next_hearing || "Not set"}</Text>
                <Text style={s.muted}>{c.notes || ""}</Text>
              </View>
            ))}
          </>
        )}

        {/* HEARINGS */}
        {tab === "Hearings" && (
          <>
            <Text style={s.heading}>Hearing Calendar</Text>
            <Text style={s.muted}>Upcoming hearings sorted by date.</Text>

            {loading ? (
              <Text style={s.empty}>Loading hearings...</Text>
            ) : upcoming.length === 0 ? (
              <Text style={s.empty}>No upcoming hearings.</Text>
            ) : upcoming.map((c) => (
              <View style={s.card} key={c.id}>
                <Text style={s.date}>{c.next_hearing}</Text>
                <Text style={s.cardTitle}>{c.case_number}</Text>
                <Text style={s.body}>{getClientName(c.client_id)} · {c.court_name || "—"}</Text>
                <Text style={s.body}>Purpose / notes: {c.notes || "—"}</Text>
              </View>
            ))}
          </>
        )}

        {/* FEES */}
        {tab === "Fees" && (
          <>
            <Text style={s.heading}>Fees & Payments</Text>

            <View style={s.card}>
              <Text style={s.muted}>Total Pending Amount</Text>
              <Text style={s.statValue}>{money(pending)}</Text>
              <Text style={s.muted}>Total Received: {money(totalPaid)}</Text>
            </View>

            <Button title="+ Add Payment Record" onPress={() => setModal("payment")} />
            <Button title="Refresh Payments" secondary onPress={fetchAllData} disabled={loading} />

            {loading ? (
              <Text style={s.empty}>Loading payments...</Text>
            ) : payments.length === 0 ? (
              <Text style={s.empty}>No payment records found.</Text>
            ) : payments.map((p) => (
              <View style={s.card} key={p.id}>
                <Text style={s.cardTitle}>{getClientName(p.client_id)}</Text>
                <Text style={s.body}>Case: {getCaseNumber(p.case_id)}</Text>
                <Text style={s.body}>Total: {money(p.total_fee)}</Text>
                <Text style={s.body}>Paid: {money(p.paid_amount)}</Text>
                <Text style={s.date}>
                  Balance: {money(Math.max(0, Number(p.total_fee || 0) - Number(p.paid_amount || 0)))}
                </Text>
                <Text style={s.muted}>{p.payment_date || "—"} · {p.payment_mode || "—"}</Text>
              </View>
            ))}
          </>
        )}

        {/* ADVOCATE */}
        {tab === "Advocate" && (
          <>
            <Text style={s.heading}>Advocate Profile</Text>
            <Text style={s.muted}>Profile storage is not connected yet.</Text>
            <View style={s.card}>
              <Text style={s.body}>Your Clients: {clients.length}</Text>
              <Text style={s.body}>Your Cases: {cases.length}</Text>
              <Text style={s.body}>Your Payments: {payments.length}</Text>
            </View>
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ADD MODAL */}
      <Modal
        visible={!!modal}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={s.modalSafe}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <View style={s.modalHeader}>
              <Text style={s.heading}>
                Add {modal === "client" ? "Client" : modal === "case" ? "Case" : "Payment"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Text style={s.close}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 18 }}
            >
              {modal === "client" && (
                <>
                  <Field label="Client name *" value={clientForm.name} onChangeText={(v) => setClientForm({ ...clientForm, name: v })} />
                  <Field label="Mobile number *" value={clientForm.phone} onChangeText={(v) => setClientForm({ ...clientForm, phone: v })} keyboardType="phone-pad" />
                  <Field label="Email" value={clientForm.email} onChangeText={(v) => setClientForm({ ...clientForm, email: v })} />
                  <Field label="Address" value={clientForm.address} onChangeText={(v) => setClientForm({ ...clientForm, address: v })} />
                  <Field label="Notes" value={clientForm.notes} onChangeText={(v) => setClientForm({ ...clientForm, notes: v })} />
                  <Button title={saving ? "Saving..." : "Save Client"} onPress={addClient} disabled={saving} />
                </>
              )}

              {modal === "case" && (
                <>
                  <Text style={s.muted}>Enter an existing client name exactly as saved in Clients.</Text>
                  <Field label="Case number *" value={caseForm.number} onChangeText={(v) => setCaseForm({ ...caseForm, number: v })} />
                  <Field label="Case type" value={caseForm.type} onChangeText={(v) => setCaseForm({ ...caseForm, type: v })} />
                  <Field label="Client name *" value={caseForm.client} onChangeText={(v) => setCaseForm({ ...caseForm, client: v })} />
                  <Field label="Court name" value={caseForm.court} onChangeText={(v) => setCaseForm({ ...caseForm, court: v })} />
                  <Field label="Next hearing (YYYY-MM-DD)" value={caseForm.next} onChangeText={(v) => setCaseForm({ ...caseForm, next: v })} />
                  <Field label="Petitioner" value={caseForm.petitioner} onChangeText={(v) => setCaseForm({ ...caseForm, petitioner: v })} />
                  <Field label="Respondent" value={caseForm.respondent} onChangeText={(v) => setCaseForm({ ...caseForm, respondent: v })} />
                  <Field label="Judge name" value={caseForm.judge} onChangeText={(v) => setCaseForm({ ...caseForm, judge: v })} />
                  <Field label="Case notes" value={caseForm.notes} onChangeText={(v) => setCaseForm({ ...caseForm, notes: v })} />
                  <Button title={saving ? "Saving..." : "Save Case"} onPress={addCase} disabled={saving} />
                </>
              )}

              {modal === "payment" && (
                <>
                  <Text style={s.muted}>Enter an existing client name and, optionally, an existing case number.</Text>
                  <Field label="Client name *" value={paymentForm.client} onChangeText={(v) => setPaymentForm({ ...paymentForm, client: v })} />
                  <Field label="Case number" value={paymentForm.caseNo} onChangeText={(v) => setPaymentForm({ ...paymentForm, caseNo: v })} />
                  <Field label="Total fee (₹) *" value={paymentForm.total} onChangeText={(v) => setPaymentForm({ ...paymentForm, total: v })} keyboardType="numeric" />
                  <Field label="Paid amount (₹)" value={paymentForm.paid} onChangeText={(v) => setPaymentForm({ ...paymentForm, paid: v })} keyboardType="numeric" />
                  <Field label="Payment date (YYYY-MM-DD)" value={paymentForm.date} onChangeText={(v) => setPaymentForm({ ...paymentForm, date: v })} />
                  <Field label="Payment mode" value={paymentForm.mode} onChangeText={(v) => setPaymentForm({ ...paymentForm, mode: v })} />
                  <Button title={saving ? "Saving..." : "Save Payment"} onPress={addPayment} disabled={saving} />
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6FA" },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFFFFF" },
  brand: { fontSize: 19, fontWeight: "900", letterSpacing: 1.2, color: "#182B4D" },
  subtitle: { fontSize: 12, color: "#77839A", marginTop: 3 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E6EDFC", alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "800", color: "#2858B8" },
  navWrap: { backgroundColor: "#FFF", paddingBottom: 10 },
  navItem: { paddingHorizontal: 14, paddingVertical: 9, marginHorizontal: 4, borderRadius: 20, backgroundColor: "#F1F3F7" },
  navActive: { backgroundColor: "#1F4F9C" },
  navText: { fontSize: 12, color: "#536078", fontWeight: "600" },
  navTextActive: { color: "#FFF" },
  content: { padding: 18 },
  heading: { fontSize: 23, fontWeight: "800", color: "#1A2A45", marginBottom: 6 },
  muted: { fontSize: 12, color: "#77839A", marginTop: 3 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 18 },
  stat: { width: "48%", backgroundColor: "#FFF", borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 4, elevation: 1 },
  statValue: { fontSize: 23, fontWeight: "800", color: "#1C2E4D" },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#263854" },
  card: { backgroundColor: "#FFF", borderRadius: 13, padding: 15, marginTop: 12, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#213451" },
  body: { fontSize: 13, color: "#526078", marginTop: 6 },
  date: { fontSize: 13, color: "#1E66B5", fontWeight: "700", marginTop: 8 },
  tag: { fontSize: 11, color: "#237A5A", backgroundColor: "#E6F6EF", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  button: { backgroundColor: "#1F4F9C", padding: 13, borderRadius: 10, alignItems: "center", marginTop: 12 },
  buttonText: { color: "#FFF", fontWeight: "800" },
  secondaryButton: { backgroundColor: "#F0F2F6", padding: 9, alignSelf: "flex-start" },
  secondaryButtonText: { color: "#536078", fontSize: 12 },
  search: { backgroundColor: "#FFF", borderRadius: 10, padding: 12, marginTop: 14, borderWidth: 1, borderColor: "#E1E6EF" },
  empty: { color: "#78849A", textAlign: "center", padding: 24 },
  field: { marginBottom: 13 },
  label: { fontSize: 12, fontWeight: "700", color: "#45536B", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#DCE2EC", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: "#FFF", fontSize: 14, color: "#24334D" },
  modalSafe: { flex: 1, backgroundColor: "#F4F6FA" },
  modalHeader: { padding: 18, backgroundColor: "#FFF", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  close: { color: "#1F4F9C", fontWeight: "800" }
});
