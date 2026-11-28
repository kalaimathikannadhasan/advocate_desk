
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, Modal,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from "react-native";
import { StatusBar } from "expo-status-bar";

import {
  signUp, signIn, signOut, getSession, onAuthChange
} from "./lib/auth";

import {
  getClients, addClient, deleteClient,
  getCases, addCase, deleteCase,
  getPayments, addPayment, deletePayment,
  getAdvocateProfile, saveAdvocateProfile
} from "./lib/database";

// ---------------- FIELD COMPONENT ----------------

function Field({ label, value, onChangeText, placeholder, keyboardType = "default" }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

// ---------------- BUTTON COMPONENT ----------------

function Button({ title, onPress, secondary = false, disabled = false }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        s.button,
        secondary && s.secondaryButton,
        disabled && { opacity: 0.5 }
      ]}
    >
      <Text style={[s.buttonText, secondary && s.secondaryButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------- STAT COMPONENT ----------------

function Stat({ title, value, color }) {
  return (
    <View style={[s.stat, { borderLeftColor: color }]}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.muted}>{title}</Text>
    </View>
  );
}

// ---------------- MAIN APPLICATION ----------------

export default function App() {

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState("Dashboard");
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [profile, setProfile] = useState(null);

  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [modal, setModal] = useState("");
  const [search, setSearch] = useState("");

  const [clientForm, setClientForm] = useState({
    name: "", phone: "", email: "", address: "", notes: ""
  });

  const [caseForm, setCaseForm] = useState({
    number: "", type: "Civil", client: "",
    court: "", next: "", petitioner: "",
    respondent: "", judge: "", notes: ""
  });

  const [paymentForm, setPaymentForm] = useState({
    client: "", caseNo: "", total: "",
    paid: "", date: "", mode: "UPI"
  });

  const [profileForm, setProfileForm] = useState({
    advocate_name: "",
    enrollment_number: "",
    office_address: "",
    mobile_number: "",
    email: "",
    specialization: "",
    courts_handled: ""
  });

  // ---------------- AUTH SESSION ----------------

  useEffect(() => {
    const subscription = onAuthChange((event, currentSession) => {
      setSession(currentSession);
    });

    async function initializeAuth() {
      try {
        const currentSession = await getSession();
        setSession(currentSession);
      } catch (error) {
        Alert.alert("Authentication Error", error.message);
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  // ---------------- LOAD DATABASE ----------------

  async function loadData() {
    try {
      const [
        clientData,
        caseData,
        paymentData,
        profileData
      ] = await Promise.all([
        getClients(),
        getCases(),
        getPayments(),
        getAdvocateProfile()
      ]);

      setClients(clientData);
      setCases(caseData);
      setPayments(paymentData);

      setProfile(profileData);

      if (profileData) {
        setProfileForm({
          advocate_name: profileData.advocate_name || "",
          enrollment_number: profileData.enrollment_number || "",
          office_address: profileData.office_address || "",
          mobile_number: profileData.mobile_number || "",
          email: profileData.email || "",
          specialization: profileData.specialization || "",
          courts_handled: profileData.courts_handled || ""
        });
      }
    } catch (error) {
      Alert.alert("Database Error", error.message);
    }
  }

  useEffect(() => {
    if (session) {
      loadData();
    } else {
      setClients([]);
      setCases([]);
      setPayments([]);
      setProfile(null);
    }
  }, [session]);

  // ---------------- LOGIN ----------------

  async function handleLogin() {
    if (!email.trim() || !password) {
      return Alert.alert("Required", "Enter email and password.");
    }

    try {
      setSaving(true);
      await signIn(email.trim(), password);
      Alert.alert("Success", "Login successful!");
    } catch (error) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setSaving(false);
    }
  }

  // ---------------- SIGNUP ----------------

  async function handleSignup() {
    if (!email.trim() || password.length < 6) {
      return Alert.alert(
        "Required",
        "Enter a valid email and password with at least 6 characters."
      );
    }

    try {
      setSaving(true);

      const result = await signUp(email.trim(), password);

      if (result.session) {
        Alert.alert("Success", "Account created successfully!");
      } else {
        Alert.alert(
          "Verify Email",
          "Account created. Please verify your email, then login."
        );
        setAuthMode("login");
      }
    } catch (error) {
      Alert.alert("Signup Failed", error.message);
    } finally {
      setSaving(false);
    }
  }

  // ---------------- LOGOUT ----------------

  async function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert("Logout Error", error.message);
          }
        }
      }
    ]);
  }

  // ---------------- CLIENTS ----------------

  async function handleAddClient() {
    if (!clientForm.name.trim() || !clientForm.phone.trim()) {
      return Alert.alert("Required", "Enter client name and phone.");
    }

    try {
      setSaving(true);

      await addClient({
        name: clientForm.name.trim(),
        phone: clientForm.phone.trim(),
        email: clientForm.email.trim() || null,
        address: clientForm.address.trim() || null,
        notes: clientForm.notes.trim() || null
      });

      setClientForm({
        name: "", phone: "", email: "", address: "", notes: ""
      });

      setModal("");
      await loadData();

      Alert.alert("Success", "Client saved to Supabase.");
    } catch (error) {
      Alert.alert("Client Error", error.message);
    } finally {
      setSaving(false);
    }
  }

  // ---------------- CASES ----------------

  async function handleAddCase() {
    if (!caseForm.number.trim() || !caseForm.client.trim()) {
      return Alert.alert("Required", "Enter case number and client name.");
    }

    const selectedClient = clients.find(
      c => c.name.trim().toLowerCase() ===
      caseForm.client.trim().toLowerCase()
    );

    if (!selectedClient) {
      return Alert.alert(
        "Client Not Found",
        "Please enter the name of an existing client."
      );
    }

    try {
      setSaving(true);

      await addCase({
        case_number: caseForm.number.trim(),
        case_type: caseForm.type.trim() || null,
        client_id: selectedClient.id,
        court_name: caseForm.court.trim() || null,
        next_hearing: caseForm.next.trim() || null,
        status: "Active",
        petitioner: caseForm.petitioner.trim() || null,
        respondent: caseForm.respondent.trim() || null,
        judge_name: caseForm.judge.trim() || null,
        notes: caseForm.notes.trim() || null
      });

      setCaseForm({
        number: "", type: "Civil", client: "",
        court: "", next: "", petitioner: "",
        respondent: "", judge: "", notes: ""
      });

      setModal("");
      await loadData();

      Alert.alert("Success", "Case saved to Supabase.");
    } catch (error) {
      Alert.alert("Case Error", error.message);
    } finally {
      setSaving(false);
    }
  }

  // ---------------- PAYMENTS ----------------

  async function handleAddPayment() {
    if (!paymentForm.client.trim() || !paymentForm.total.trim()) {
      return Alert.alert("Required", "Enter client and total fee.");
    }

    const total = Number(paymentForm.total);
    const paid = Number(paymentForm.paid || 0);

    if (!Number.isFinite(total) || total < 0 ||
        !Number.isFinite(paid) || paid < 0 || paid > total) {
      return Alert.alert("Invalid Amount", "Check total fee and paid amount.");
    }

    const selectedClient = clients.find(
      c => c.name.trim().toLowerCase() ===
      paymentForm.client.trim().toLowerCase()
    );

    if (!selectedClient) {
      return Alert.alert("Client Not Found", "Enter an existing client name.");
    }

    const selectedCase = paymentForm.caseNo.trim()
      ? cases.find(
          c => c.case_number.trim().toLowerCase() ===
          paymentForm.caseNo.trim().toLowerCase() &&
          c.client_id === selectedClient.id
        )
      : null;

    if (paymentForm.caseNo.trim() && !selectedCase) {
      return Alert.alert(
        "Case Not Found",
        "Enter an existing case number belonging to this client."
      );
    }

    try {
      setSaving(true);

      await addPayment({
        client_id: selectedClient.id,
        case_id: selectedCase?.id || null,
        total_fee: total,
        paid_amount: paid,
        payment_date: paymentForm.date.trim() || null,
        payment_mode: paymentForm.mode.trim() || null
      });

      setPaymentForm({
        client: "", caseNo: "", total: "",
        paid: "", date: "", mode: "UPI"
      });

      setModal("");
      await loadData();

      Alert.alert("Success", "Payment saved to Supabase.");
    } catch (error) {
      Alert.alert("Payment Error", error.message);
    } finally {
      setSaving(false);
    }
  }

  // ---------------- DELETE ----------------

  function confirmDelete(kind, id) {
    Alert.alert("Delete Record", "Are you sure you want to delete?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (kind === "client") await deleteClient(id);
            if (kind === "case") await deleteCase(id);
            if (kind === "payment") await deletePayment(id);

            await loadData();
            Alert.alert("Success", "Record deleted successfully.");
          } catch (error) {
            Alert.alert("Delete Error", error.message);
          }
        }
      }
    ]);
  }

  // ---------------- ADVOCATE PROFILE ----------------

  async function handleSaveProfile() {
    if (!profileForm.advocate_name.trim()) {
      return Alert.alert("Required", "Enter advocate name.");
    }

    try {
      setSaving(true);

      const savedProfile = await saveAdvocateProfile({
        ...profileForm,
        advocate_name: profileForm.advocate_name.trim()
      });

      setProfile(savedProfile);

      Alert.alert("Success", "Advocate profile saved successfully.");
    } catch (error) {
      Alert.alert("Profile Error", error.message);
    } finally {
      setSaving(false);
    }
  }

  // ---------------- CALCULATIONS ----------------

  const activeCases = cases.filter(
    c => c.status === "Active"
  ).length;

  const pending = payments.reduce(
    (sum, p) => sum + Math.max(
      0,
      Number(p.total_fee || 0) - Number(p.paid_amount || 0)
    ),
    0
  );

  const money = n => "₹" + Number(n || 0).toLocaleString("en-IN");

  const getClientName = id =>
    clients.find(c => c.id === id)?.name || "Unknown Client";

  const getCaseNumber = id =>
    cases.find(c => c.id === id)?.case_number || "—";

  const upcoming = useMemo(
    () => [...cases]
      .filter(c => c.next_hearing)
      .sort((a, b) => a.next_hearing.localeCompare(b.next_hearing)),
    [cases]
  );

  const filteredClients = clients.filter(c =>
    (c.name + " " + c.phone).toLowerCase().includes(search.toLowerCase())
  );

  const filteredCases = cases.filter(c =>
    (c.case_number + " " + getClientName(c.client_id) + " " + c.case_type)
      .toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    "Dashboard", "Clients", "Cases", "Hearings", "Fees", "Advocate"
  ];

  // ---------------- LOADING ----------------

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color="#1F4F9C" />
        <Text style={s.muted}>Checking authentication...</Text>
      </SafeAreaView>
    );
  }

  // ---------------- LOGIN / SIGNUP SCREEN ----------------

  if (!session) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar style="dark" />

        <View style={s.authContainer}>
          <Text style={s.brand}>ADVOCATE DESK</Text>
          <Text style={s.subtitle}>Case & Client Management</Text>

          <View style={s.authCard}>
            <Text style={s.heading}>
              {authMode === "login" ? "Welcome Back" : "Create Account"}
            </Text>

            <Text style={s.muted}>
              {authMode === "login"
                ? "Login to manage your legal practice."
                : "Register your Advocate Desk account."}
            </Text>

            <Field
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 characters"
            />

            <Button
              title={
                saving ? "Please wait..." :
                authMode === "login" ? "Login" : "Create Account"
              }
              onPress={authMode === "login" ? handleLogin : handleSignup}
              disabled={saving}
            />

            <TouchableOpacity
              onPress={() =>
                setAuthMode(authMode === "login" ? "signup" : "login")
              }
              style={{ marginTop: 20 }}
            >
              <Text style={s.link}>
                {authMode === "login"
                  ? "New user? Create an account"
                  : "Already registered? Login"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------- MAIN APPLICATION UI ----------------

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />

      <View style={s.header}>
        <View>
          <Text style={s.brand}>ADVOCATE DESK</Text>
          <Text style={s.subtitle}>Case & Client Management</Text>
        </View>

        <TouchableOpacity onPress={handleLogout} style={s.avatar}>
          <Text style={s.avatarText}>OUT</Text>
        </TouchableOpacity>
      </View>

      <View style={s.navWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map(t => (
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

        {tab === "Dashboard" && <>
          <Text style={s.heading}>
            Good day, {profile?.advocate_name || "Advocate"}
          </Text>
          <Text style={s.muted}>Here is your office overview.</Text>

          <View style={s.statsGrid}>
            <Stat title="Total cases" value={cases.length} color="#3267D6" />
            <Stat title="Active cases" value={activeCases} color="#169B70" />
            <Stat title="Clients" value={clients.length} color="#D58A19" />
            <Stat title="Pending fees" value={money(pending)} color="#8757C7" />
          </View>

          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Upcoming hearings</Text>
            <Text style={s.muted}>{upcoming.length} scheduled</Text>
          </View>

          {upcoming.length === 0
            ? <Text style={s.empty}>No hearing dates added.</Text>
            : upcoming.map(c => (
              <View key={c.id} style={s.card}>
                <Text style={s.cardTitle}>{c.case_number}</Text>
                <Text style={s.body}>
                  {getClientName(c.client_id)} · {c.court_name || "—"}
                </Text>
                <Text style={s.date}>
                  Hearing: {c.next_hearing}
                </Text>
              </View>
            ))
          }
        </>}

        {/* CLIENTS */}

        {tab === "Clients" && <>
          <Text style={s.heading}>Clients</Text>
          <Button title="+ Add Client" onPress={() => setModal("client")} />

          <TextInput
            style={s.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by client name or phone"
          />

          {filteredClients.map(c => (
            <View style={s.card} key={c.id}>
              <View style={s.rowBetween}>
                <Text style={s.cardTitle}>{c.name}</Text>
                <Text style={s.tag}>{c.id}</Text>
              </View>

              <Text style={s.body}>Phone: {c.phone}</Text>
              <Text style={s.body}>Email: {c.email || "—"}</Text>
              <Text style={s.body}>Address: {c.address || "—"}</Text>
              <Text style={s.muted}>{c.notes}</Text>

              <Button
                title="Delete"
                secondary
                onPress={() => confirmDelete("client", c.id)}
              />
            </View>
          ))}

          {filteredClients.length === 0 &&
            <Text style={s.empty}>No clients found.</Text>}
        </>}

        {/* CASES */}

        {tab === "Cases" && <>
          <Text style={s.heading}>Case Management</Text>
          <Button title="+ Add Case" onPress={() => setModal("case")} />

          <TextInput
            style={s.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search case number, client or type"
          />

          {filteredCases.map(c => (
            <View style={s.card} key={c.id}>
              <View style={s.rowBetween}>
                <Text style={s.cardTitle}>{c.case_number}</Text>
                <Text style={s.tag}>{c.status}</Text>
              </View>

              <Text style={s.body}>
                {c.case_type} · Client: {getClientName(c.client_id)}
              </Text>
              <Text style={s.body}>Court: {c.court_name || "—"}</Text>
              <Text style={s.body}>
                Petitioner: {c.petitioner || "—"} |
                Respondent: {c.respondent || "—"}
              </Text>
              <Text style={s.date}>
                Next hearing: {c.next_hearing || "Not set"}
              </Text>
              <Text style={s.muted}>{c.notes}</Text>

              <Button
                title="Delete"
                secondary
                onPress={() => confirmDelete("case", c.id)}
              />
            </View>
          ))}

          {filteredCases.length === 0 &&
            <Text style={s.empty}>No cases found.</Text>}
        </>}

        {/* HEARINGS */}

        {tab === "Hearings" && <>
          <Text style={s.heading}>Hearing Calendar</Text>
          <Text style={s.muted}>Hearing dates are sorted by date.</Text>

          {upcoming.map(c => (
            <View style={s.card} key={c.id}>
              <Text style={s.date}>{c.next_hearing}</Text>
              <Text style={s.cardTitle}>{c.case_number}</Text>
              <Text style={s.body}>
                {getClientName(c.client_id)} · {c.court_name || "—"}
              </Text>
              <Text style={s.body}>
                Purpose / notes: {c.notes || "—"}
              </Text>
            </View>
          ))}

          {upcoming.length === 0 &&
            <Text style={s.empty}>No hearings scheduled.</Text>}
        </>}

        {/* PAYMENTS */}

        {tab === "Fees" && <>
          <Text style={s.heading}>Fees & Payments</Text>

          <View style={s.card}>
            <Text style={s.muted}>Total pending amount</Text>
            <Text style={s.statValue}>{money(pending)}</Text>
          </View>

          <Button
            title="+ Add Payment Record"
            onPress={() => setModal("payment")}
          />

          {payments.map(p => (
            <View style={s.card} key={p.id}>
              <Text style={s.cardTitle}>{getClientName(p.client_id)}</Text>

              <Text style={s.body}>
                Case: {getCaseNumber(p.case_id)}
              </Text>
              <Text style={s.body}>
                Total: {money(p.total_fee)} · Paid: {money(p.paid_amount)}
              </Text>
              <Text style={s.date}>
                Balance: {money(
                  Math.max(0, Number(p.total_fee || 0) -
                  Number(p.paid_amount || 0))
                )}
              </Text>
              <Text style={s.muted}>
                {p.payment_date || "—"} · {p.payment_mode || "—"}
              </Text>

              <Button
                title="Delete"
                secondary
                onPress={() => confirmDelete("payment", p.id)}
              />
            </View>
          ))}
        </>}

        {/* ADVOCATE PROFILE */}

        {tab === "Advocate" && <>
          <Text style={s.heading}>Advocate Profile</Text>
          <Text style={s.muted}>
            Update your professional information.
          </Text>

          <View style={s.card}>
            <Field
              label="Advocate name *"
              value={profileForm.advocate_name}
              onChangeText={v => setProfileForm({
                ...profileForm, advocate_name: v
              })}
            />

            <Field
              label="Bar Council enrollment number"
              value={profileForm.enrollment_number}
              onChangeText={v => setProfileForm({
                ...profileForm, enrollment_number: v
              })}
            />

            <Field
              label="Office address"
              value={profileForm.office_address}
              onChangeText={v => setProfileForm({
                ...profileForm, office_address: v
              })}
            />

            <Field
              label="Mobile number"
              value={profileForm.mobile_number}
              onChangeText={v => setProfileForm({
                ...profileForm, mobile_number: v
              })}
              keyboardType="phone-pad"
            />

            <Field
              label="Email address"
              value={profileForm.email}
              onChangeText={v => setProfileForm({
                ...profileForm, email: v
              })}
              keyboardType="email-address"
            />

            <Field
              label="Practice areas / specialization"
              value={profileForm.specialization}
              onChangeText={v => setProfileForm({
                ...profileForm, specialization: v
              })}
            />

            <Field
              label="Courts handled"
              value={profileForm.courts_handled}
              onChangeText={v => setProfileForm({
                ...profileForm, courts_handled: v
              })}
            />

            <Button
              title={saving ? "Saving..." : "Save Profile"}
              disabled={saving}
              onPress={handleSaveProfile}
            />
          </View>
        </>}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ADD RECORD MODAL */}

      <Modal
        visible={!!modal}
        animationType="slide"
        onRequestClose={() => setModal("")}
      >
        <SafeAreaView style={s.modalSafe}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <View style={s.modalHeader}>
              <Text style={s.heading}>
                Add {modal === "client" ? "Client" :
                  modal === "case" ? "Case" : "Payment"}
              </Text>

              <TouchableOpacity onPress={() => setModal("")}>
                <Text style={s.close}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 18 }}
            >

              {modal === "client" && <>
                <Field
                  label="Client name *"
                  value={clientForm.name}
                  onChangeText={v => setClientForm({
                    ...clientForm, name: v
                  })}
                />

                <Field
                  label="Mobile number *"
                  value={clientForm.phone}
                  onChangeText={v => setClientForm({
                    ...clientForm, phone: v
                  })}
                  keyboardType="phone-pad"
                />

                <Field
                  label="Email"
                  value={clientForm.email}
                  onChangeText={v => setClientForm({
                    ...clientForm, email: v
                  })}
                />

                <Field
                  label="Address"
                  value={clientForm.address}
                  onChangeText={v => setClientForm({
                    ...clientForm, address: v
                  })}
                />

                <Field
                  label="Notes"
                  value={clientForm.notes}
                  onChangeText={v => setClientForm({
                    ...clientForm, notes: v
                  })}
                />

                <Button
                  title={saving ? "Saving..." : "Save Client"}
                  disabled={saving}
                  onPress={handleAddClient}
                />
              </>}

              {modal === "case" && <>
                <Field
                  label="Case number *"
                  value={caseForm.number}
                  onChangeText={v => setCaseForm({
                    ...caseForm, number: v
                  })}
                />

                <Field
                  label="Case type"
                  value={caseForm.type}
                  onChangeText={v => setCaseForm({
                    ...caseForm, type: v
                  })}
                />

                <Field
                  label="Client name * (existing client)"
                  value={caseForm.client}
                  onChangeText={v => setCaseForm({
                    ...caseForm, client: v
                  })}
                />

                <Field
                  label="Court name"
                  value={caseForm.court}
                  onChangeText={v => setCaseForm({
                    ...caseForm, court: v
                  })}
                />

                <Field
                  label="Next hearing (YYYY-MM-DD)"
                  value={caseForm.next}
                  onChangeText={v => setCaseForm({
                    ...caseForm, next: v
                  })}
                />

                <Field
                  label="Petitioner"
                  value={caseForm.petitioner}
                  onChangeText={v => setCaseForm({
                    ...caseForm, petitioner: v
                  })}
                />

                <Field
                  label="Respondent"
                  value={caseForm.respondent}
                  onChangeText={v => setCaseForm({
                    ...caseForm, respondent: v
                  })}
                />

                <Field
                  label="Judge name"
                  value={caseForm.judge}
                  onChangeText={v => setCaseForm({
                    ...caseForm, judge: v
                  })}
                />

                <Field
                  label="Case notes"
                  value={caseForm.notes}
                  onChangeText={v => setCaseForm({
                    ...caseForm, notes: v
                  })}
                />

                <Button
                  title={saving ? "Saving..." : "Save Case"}
                  disabled={saving}
                  onPress={handleAddCase}
                />
              </>}

              {modal === "payment" && <>
                <Field
                  label="Client name * (existing client)"
                  value={paymentForm.client}
                  onChangeText={v => setPaymentForm({
                    ...paymentForm, client: v
                  })}
                />

                <Field
                  label="Case number (optional)"
                  value={paymentForm.caseNo}
                  onChangeText={v => setPaymentForm({
                    ...paymentForm, caseNo: v
                  })}
                />

                <Field
                  label="Total fee (₹) *"
                  value={paymentForm.total}
                  onChangeText={v => setPaymentForm({
                    ...paymentForm, total: v
                  })}
                  keyboardType="numeric"
                />

                <Field
                  label="Paid amount (₹)"
                  value={paymentForm.paid}
                  onChangeText={v => setPaymentForm({
                    ...paymentForm, paid: v
                  })}
                  keyboardType="numeric"
                />

                <Field
                  label="Payment date (YYYY-MM-DD)"
                  value={paymentForm.date}
                  onChangeText={v => setPaymentForm({
                    ...paymentForm, date: v
                  })}
                />

                <Field
                  label="Payment mode"
                  value={paymentForm.mode}
                  onChangeText={v => setPaymentForm({
                    ...paymentForm, mode: v
                  })}
                />

                <Button
                  title={saving ? "Saving..." : "Save Payment"}
                  disabled={saving}
                  onPress={handleAddPayment}
                />
              </>}

            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------- STYLES ----------------

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6FA" },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F6FA"
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF"
  },

  brand: {
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#182B4D"
  },

  subtitle: { fontSize: 12, color: "#77839A", marginTop: 3 },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E6EDFC",
    alignItems: "center",
    justifyContent: "center"
  },

  avatarText: { fontWeight: "800", color: "#2858B8" },

  navWrap: { backgroundColor: "#FFF", paddingBottom: 10 },

  navItem: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: "#F1F3F7"
  },

  navActive: { backgroundColor: "#1F4F9C" },
  navText: { fontSize: 12, color: "#536078", fontWeight: "600" },
  navTextActive: { color: "#FFF" },

  content: { padding: 18 },

  heading: {
    fontSize: 23,
    fontWeight: "800",
    color: "#1A2A45",
    marginBottom: 6
  },

  muted: { fontSize: 12, color: "#77839A", marginTop: 3 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 18
  },

  stat: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 1
  },

  statValue: {
    fontSize: 23,
    fontWeight: "800",
    color: "#1C2E4D"
  },

  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 10
  },

  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#263854" },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 13,
    padding: 15,
    marginTop: 12,
    elevation: 1
  },

  cardTitle: { fontSize: 16, fontWeight: "800", color: "#213451" },

  body: { fontSize: 13, color: "#526078", marginTop: 6 },

  date: {
    fontSize: 13,
    color: "#1E66B5",
    fontWeight: "700",
    marginTop: 8
  },

  tag: {
    fontSize: 11,
    color: "#237A5A",
    backgroundColor: "#E6F6EF",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  button: {
    backgroundColor: "#1F4F9C",
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12
  },

  buttonText: { color: "#FFF", fontWeight: "800" },

  secondaryButton: {
    backgroundColor: "#F0F2F6",
    padding: 9,
    alignSelf: "flex-start"
  },

  secondaryButtonText: { color: "#536078", fontSize: 12 },

  search: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E1E6EF"
  },

  empty: { color: "#78849A", textAlign: "center", padding: 24 },

  field: { marginBottom: 13 },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#45536B",
    marginBottom: 6
  },

  input: {
    borderWidth: 1,
    borderColor: "#DCE2EC",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#FFF",
    fontSize: 14,
    color: "#24334D"
  },

  modalSafe: { flex: 1, backgroundColor: "#F4F6FA" },

  modalHeader: {
    padding: 18,
    backgroundColor: "#FFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  close: { color: "#1F4F9C", fontWeight: "800" },

  authContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 22
  },

  authCard: {
    backgroundColor: "#FFF",
    padding: 22,
    borderRadius: 15,
    marginTop: 25,
    elevation: 2
  },

  link: {
    textAlign: "center",
    color: "#1F4F9C",
    fontWeight: "700"
  }
});
