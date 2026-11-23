import React, { useMemo, useState } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform
} from "react-native";
import { StatusBar } from "expo-status-bar";

const initialCases = [
  { id:"C-1001", number:"O.S. 45/2025", type:"Civil", client:"Kalaimathi Kannadhasan", court:"District Court, Trichy", next:"2026-12-02", status:"Active", petitioner:"Kalaimathi Kannadhasan", respondent:"Mohan", judge:"To be updated", notes:"Property boundary dispute" },
  { id:"C-1002", number:"C.C. 18/2025", type:"Criminal", client:"Kalaiyarasi", court:"Judicial Magistrate Court", next:"2026-12-05", status:"Active", petitioner:"State", respondent:"Arun", judge:"To be updated", notes:"Bail hearing follow-up" }
];
const initialClients = [
  { id:"CL-001", name:"Kalaimathi Kannadhasan", phone:"9876543210", email:"ravi@example.com", address:"Trichy", notes:"Property matter" },
  { id:"CL-002", name:"Kalaiyarasi", phone:"9876501234", email:"Kalaiyarasi@example.com", address:"Lalgudi", notes:"Criminal matter" }
];
const initialPayments = [
  { id:"P-001", client:"Kalaimathi Kannadhasan", caseNo:"O.S. 45/2025", total:"50000", paid:"20000", date:"2026-11-20", mode:"UPI" }
];

const tabs = ["Dashboard","Clients","Cases","Hearings","Fees","Advocate"];

function Field({ label, value, onChangeText, placeholder, keyboardType="default" }) {
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput style={s.input} value={value} onChangeText={onChangeText}
      placeholder={placeholder || label} keyboardType={keyboardType} />
  </View>;
}
function Button({ title, onPress, secondary=false }) {
  return <TouchableOpacity onPress={onPress} style={[s.button, secondary && s.secondaryButton]}>
    <Text style={[s.buttonText, secondary && s.secondaryButtonText]}>{title}</Text>
  </TouchableOpacity>;
}
function Stat({ title, value, color }) {
  return <View style={[s.stat,{borderLeftColor:color}]}>
    <Text style={s.statValue}>{value}</Text><Text style={s.muted}>{title}</Text>
  </View>;
}

export default function App() {
  const [tab,setTab] = useState("Dashboard");
  const [clients,setClients] = useState(initialClients);
  const [cases,setCases] = useState(initialCases);
  const [payments,setPayments] = useState(initialPayments);
  const [modal,setModal] = useState("");
  const [search,setSearch] = useState("");
  const [clientForm,setClientForm] = useState({name:"",phone:"",email:"",address:"",notes:""});
  const [caseForm,setCaseForm] = useState({number:"",type:"Civil",client:"",court:"",next:"",petitioner:"",respondent:"",judge:"",notes:""});
  const [paymentForm,setPaymentForm] = useState({client:"",caseNo:"",total:"",paid:"",date:"",mode:"UPI"});

  const activeCases = cases.filter(c=>c.status==="Active").length;
  const pending = payments.reduce((sum,p)=>sum+Math.max(0,Number(p.total||0)-Number(p.paid||0)),0);
  const upcoming = useMemo(()=>[...cases].filter(c=>c.next).sort((a,b)=>a.next.localeCompare(b.next)),[cases]);
  const filteredClients = clients.filter(c=>(c.name+" "+c.phone).toLowerCase().includes(search.toLowerCase()));
  const filteredCases = cases.filter(c=>(c.number+" "+c.client+" "+c.type).toLowerCase().includes(search.toLowerCase()));

  function addClient() {
    if(!clientForm.name.trim() || !clientForm.phone.trim()) return Alert.alert("Required","Enter client name and phone number.");
    setClients([...clients,{...clientForm,id:"CL-"+String(Date.now()).slice(-5)}]);
    setClientForm({name:"",phone:"",email:"",address:"",notes:""}); setModal("");
  }
  function addCase() {
    if(!caseForm.number.trim() || !caseForm.client.trim()) return Alert.alert("Required","Enter case number and client name.");
    setCases([...cases,{...caseForm,id:"C-"+String(Date.now()).slice(-5),status:"Active"}]);
    setCaseForm({number:"",type:"Civil",client:"",court:"",next:"",petitioner:"",respondent:"",judge:"",notes:""}); setModal("");
  }
  function addPayment() {
    if(!paymentForm.client.trim() || !paymentForm.total.trim()) return Alert.alert("Required","Enter client and total fee.");
    setPayments([...payments,{...paymentForm,id:"P-"+String(Date.now()).slice(-5)}]);
    setPaymentForm({client:"",caseNo:"",total:"",paid:"",date:"",mode:"UPI"}); setModal("");
  }
  function removeItem(kind,id) {
    Alert.alert("Delete record?","This sample app deletes the selected record from current app memory.",[
      {text:"Cancel",style:"cancel"},
      {text:"Delete",style:"destructive",onPress:()=>{
        if(kind==="client") setClients(clients.filter(x=>x.id!==id));
        if(kind==="case") setCases(cases.filter(x=>x.id!==id));
        if(kind==="payment") setPayments(payments.filter(x=>x.id!==id));
      }}
    ]);
  }
  const money = n => "₹"+Number(n||0).toLocaleString("en-IN");

  return <SafeAreaView style={s.safe}>
    <StatusBar style="dark" />
    <View style={s.header}>
      <View><Text style={s.brand}>ADVOCATE DESK</Text><Text style={s.subtitle}>Case & Client Management</Text></View>
      <View style={s.avatar}><Text style={s.avatarText}>AD</Text></View>
    </View>
    <View style={s.navWrap}><ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {tabs.map(t=><TouchableOpacity key={t} onPress={()=>{setTab(t);setSearch("");}} style={[s.navItem,tab===t&&s.navActive]}>
        <Text style={[s.navText,tab===t&&s.navTextActive]}>{t}</Text>
      </TouchableOpacity>)}
    </ScrollView></View>

    <ScrollView style={s.content} keyboardShouldPersistTaps="handled">
      {tab==="Dashboard" && <>
        <Text style={s.heading}>Good day, Advocate</Text><Text style={s.muted}>Here is your office overview.</Text>
        <View style={s.statsGrid}>
          <Stat title="Total cases" value={cases.length} color="#3267D6"/>
          <Stat title="Active cases" value={activeCases} color="#169B70"/>
          <Stat title="Clients" value={clients.length} color="#D58A19"/>
          <Stat title="Pending fees" value={money(pending)} color="#8757C7"/>
        </View>
        <View style={s.sectionHead}><Text style={s.sectionTitle}>Upcoming hearings</Text><Text style={s.muted}>{upcoming.length} scheduled</Text></View>
        {upcoming.length===0?<Text style={s.empty}>No hearing dates added.</Text>:upcoming.map(c=><View key={c.id} style={s.card}>
          <Text style={s.cardTitle}>{c.number}</Text><Text style={s.body}>{c.client} · {c.court}</Text>
          <Text style={s.date}>Hearing: {c.next}</Text>
        </View>)}
        <Text style={s.note}>Demo data only. Add your own records using the tabs.</Text>
      </>}

      {tab==="Clients" && <>
        <Text style={s.heading}>Clients</Text>
        <Button title="+ Add Client" onPress={()=>setModal("client")}/>
        <TextInput style={s.search} value={search} onChangeText={setSearch} placeholder="Search by client name or phone"/>
        {filteredClients.map(c=><View style={s.card} key={c.id}>
          <View style={s.rowBetween}><Text style={s.cardTitle}>{c.name}</Text><Text style={s.tag}>{c.id}</Text></View>
          <Text style={s.body}>Phone: {c.phone}</Text><Text style={s.body}>Email: {c.email||"—"}</Text>
          <Text style={s.body}>Address: {c.address||"—"}</Text><Text style={s.muted}>{c.notes}</Text>
          <Button title="Delete" secondary onPress={()=>removeItem("client",c.id)}/>
        </View>)}
        {filteredClients.length===0&&<Text style={s.empty}>No clients found.</Text>}
      </>}

      {tab==="Cases" && <>
        <Text style={s.heading}>Case Management</Text>
        <Button title="+ Add Case" onPress={()=>setModal("case")}/>
        <TextInput style={s.search} value={search} onChangeText={setSearch} placeholder="Search case number, client or type"/>
        {filteredCases.map(c=><View style={s.card} key={c.id}>
          <View style={s.rowBetween}><Text style={s.cardTitle}>{c.number}</Text><Text style={s.tag}>{c.status}</Text></View>
          <Text style={s.body}>{c.type} · Client: {c.client}</Text><Text style={s.body}>Court: {c.court||"—"}</Text>
          <Text style={s.body}>Petitioner: {c.petitioner||"—"} | Respondent: {c.respondent||"—"}</Text>
          <Text style={s.date}>Next hearing: {c.next||"Not set"}</Text><Text style={s.muted}>{c.notes}</Text>
          <Button title="Delete" secondary onPress={()=>removeItem("case",c.id)}/>
        </View>)}
        {filteredCases.length===0&&<Text style={s.empty}>No cases found.</Text>}
      </>}

      {tab==="Hearings" && <>
        <Text style={s.heading}>Hearing Calendar</Text>
        <Text style={s.muted}>Hearing dates are sorted by date.</Text>
        {upcoming.map(c=><View style={s.card} key={c.id}>
          <Text style={s.date}>{c.next}</Text><Text style={s.cardTitle}>{c.number}</Text>
          <Text style={s.body}>{c.client} · {c.court}</Text><Text style={s.body}>Purpose / notes: {c.notes||"—"}</Text>
        </View>)}
        {upcoming.length===0&&<Text style={s.empty}>Add a case with a hearing date to see it here.</Text>}
      </>}

      {tab==="Fees" && <>
        <Text style={s.heading}>Fees & Payments</Text>
        <View style={s.card}><Text style={s.muted}>Total pending amount</Text><Text style={s.statValue}>{money(pending)}</Text></View>
        <Button title="+ Add Payment Record" onPress={()=>setModal("payment")}/>
        {payments.map(p=><View style={s.card} key={p.id}>
          <Text style={s.cardTitle}>{p.client}</Text><Text style={s.body}>Case: {p.caseNo||"—"}</Text>
          <Text style={s.body}>Total: {money(p.total)} · Paid: {money(p.paid)}</Text>
          <Text style={s.date}>Balance: {money(Math.max(0,Number(p.total||0)-Number(p.paid||0)))}</Text>
          <Text style={s.muted}>{p.date} · {p.mode}</Text>
          <Button title="Delete" secondary onPress={()=>removeItem("payment",p.id)}/>
        </View>)}
      </>}

      {tab==="Advocate" && <>
        <Text style={s.heading}>Advocate Profile</Text>
        <Text style={s.muted}>Enter your professional details. This demo keeps profile details on this screen only.</Text>
        <View style={s.card}>
          {["Advocate name","Bar Council enrollment number","Office address","Mobile number","Email address","Practice areas / specialization","Courts handled"].map(x=><Field key={x} label={x} placeholder={x}/>)}
          <Button title="Save profile (demo)" onPress={()=>Alert.alert("Demo","Profile form UI is ready. Persistent secure storage will be added with the backend.")}/>
        </View>
      </>}
      <View style={{height:30}}/>
    </ScrollView>

    <Modal visible={!!modal} animationType="slide" onRequestClose={()=>setModal("")}>
      <SafeAreaView style={s.modalSafe}>
        <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={{flex:1}}>
          <View style={s.modalHeader}><Text style={s.heading}>Add {modal==="client"?"Client":modal==="case"?"Case":"Payment"}</Text>
            <TouchableOpacity onPress={()=>setModal("")}><Text style={s.close}>Close</Text></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:18}}>
            {modal==="client"&&<>
              <Field label="Client name *" value={clientForm.name} onChangeText={v=>setClientForm({...clientForm,name:v})}/>
              <Field label="Mobile number *" value={clientForm.phone} onChangeText={v=>setClientForm({...clientForm,phone:v})} keyboardType="phone-pad"/>
              <Field label="Email" value={clientForm.email} onChangeText={v=>setClientForm({...clientForm,email:v})}/>
              <Field label="Address" value={clientForm.address} onChangeText={v=>setClientForm({...clientForm,address:v})}/>
              <Field label="Notes" value={clientForm.notes} onChangeText={v=>setClientForm({...clientForm,notes:v})}/>
              <Button title="Save Client" onPress={addClient}/>
            </>}
            {modal==="case"&&<>
              <Field label="Case number *" value={caseForm.number} onChangeText={v=>setCaseForm({...caseForm,number:v})}/>
              <Field label="Case type (Civil / Criminal / Family / Property)" value={caseForm.type} onChangeText={v=>setCaseForm({...caseForm,type:v})}/>
              <Field label="Client name *" value={caseForm.client} onChangeText={v=>setCaseForm({...caseForm,client:v})}/>
              <Field label="Court name" value={caseForm.court} onChangeText={v=>setCaseForm({...caseForm,court:v})}/>
              <Field label="Next hearing (YYYY-MM-DD)" value={caseForm.next} onChangeText={v=>setCaseForm({...caseForm,next:v})}/>
              <Field label="Petitioner" value={caseForm.petitioner} onChangeText={v=>setCaseForm({...caseForm,petitioner:v})}/>
              <Field label="Respondent" value={caseForm.respondent} onChangeText={v=>setCaseForm({...caseForm,respondent:v})}/>
              <Field label="Judge name" value={caseForm.judge} onChangeText={v=>setCaseForm({...caseForm,judge:v})}/>
              <Field label="Case notes / next action" value={caseForm.notes} onChangeText={v=>setCaseForm({...caseForm,notes:v})}/>
              <Button title="Save Case" onPress={addCase}/>
            </>}
            {modal==="payment"&&<>
              <Field label="Client name *" value={paymentForm.client} onChangeText={v=>setPaymentForm({...paymentForm,client:v})}/>
              <Field label="Case number" value={paymentForm.caseNo} onChangeText={v=>setPaymentForm({...paymentForm,caseNo:v})}/>
              <Field label="Total fee (₹) *" value={paymentForm.total} onChangeText={v=>setPaymentForm({...paymentForm,total:v})} keyboardType="numeric"/>
              <Field label="Paid amount (₹)" value={paymentForm.paid} onChangeText={v=>setPaymentForm({...paymentForm,paid:v})} keyboardType="numeric"/>
              <Field label="Payment date (YYYY-MM-DD)" value={paymentForm.date} onChangeText={v=>setPaymentForm({...paymentForm,date:v})}/>
              <Field label="Payment mode (Cash / UPI / Bank)" value={paymentForm.mode} onChangeText={v=>setPaymentForm({...paymentForm,mode:v})}/>
              <Button title="Save Payment" onPress={addPayment}/>
            </>}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:"#F4F6FA"},header:{paddingHorizontal:18,paddingTop:12,paddingBottom:14,flexDirection:"row",justifyContent:"space-between",alignItems:"center",backgroundColor:"#FFFFFF"},
  brand:{fontSize:19,fontWeight:"900",letterSpacing:1.2,color:"#182B4D"},subtitle:{fontSize:12,color:"#77839A",marginTop:3},
  avatar:{width:40,height:40,borderRadius:20,backgroundColor:"#E6EDFC",alignItems:"center",justifyContent:"center"},avatarText:{fontWeight:"800",color:"#2858B8"},
  navWrap:{backgroundColor:"#FFF",paddingBottom:10},navItem:{paddingHorizontal:14,paddingVertical:9,marginHorizontal:4,borderRadius:20,backgroundColor:"#F1F3F7"},navActive:{backgroundColor:"#1F4F9C"},navText:{fontSize:12,color:"#536078",fontWeight:"600"},navTextActive:{color:"#FFF"},
  content:{padding:18},heading:{fontSize:23,fontWeight:"800",color:"#1A2A45",marginBottom:6},muted:{fontSize:12,color:"#77839A",marginTop:3},statsGrid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",marginTop:18},
  stat:{width:"48%",backgroundColor:"#FFF",borderRadius:12,padding:14,marginBottom:12,borderLeftWidth:4,elevation:1},statValue:{fontSize:23,fontWeight:"800",color:"#1C2E4D"},sectionHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:14,marginBottom:10},sectionTitle:{fontSize:16,fontWeight:"800",color:"#263854"},
  card:{backgroundColor:"#FFF",borderRadius:13,padding:15,marginTop:12,elevation:1},cardTitle:{fontSize:16,fontWeight:"800",color:"#213451"},body:{fontSize:13,color:"#526078",marginTop:6},date:{fontSize:13,color:"#1E66B5",fontWeight:"700",marginTop:8},tag:{fontSize:11,color:"#237A5A",backgroundColor:"#E6F6EF",paddingHorizontal:9,paddingVertical:5,borderRadius:12},
  rowBetween:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},button:{backgroundColor:"#1F4F9C",padding:13,borderRadius:10,alignItems:"center",marginTop:12},buttonText:{color:"#FFF",fontWeight:"800"},secondaryButton:{backgroundColor:"#F0F2F6",padding:9,alignSelf:"flex-start"},secondaryButtonText:{color:"#536078",fontSize:12},
  search:{backgroundColor:"#FFF",borderRadius:10,padding:12,marginTop:14,borderWidth:1,borderColor:"#E1E6EF"},empty:{color:"#78849A",textAlign:"center",padding:24},note:{fontSize:11,color:"#8A94A6",marginTop:18},
  field:{marginBottom:13},label:{fontSize:12,fontWeight:"700",color:"#45536B",marginBottom:6},input:{borderWidth:1,borderColor:"#DCE2EC",borderRadius:9,paddingHorizontal:12,paddingVertical:11,backgroundColor:"#FFF",fontSize:14,color:"#24334D"},
  modalSafe:{flex:1,backgroundColor:"#F4F6FA"},modalHeader:{padding:18,backgroundColor:"#FFF",flexDirection:"row",justifyContent:"space-between",alignItems:"center"},close:{color:"#1F4F9C",fontWeight:"800"}
});