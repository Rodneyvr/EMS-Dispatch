import React, { useState } from 'react';
import { Copy, Check, Download, X, Terminal, Sparkles, BookOpen } from 'lucide-react';

interface AiMasterPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MASTER_AI_PROMPT = `# MASTER SPECIFICATION: RESQ EMS DISPATCH, IHT SCHEDULING & STOCK SYSTEM

Build a complete, production-ready South African Emergency Medical Services (EMS) operations and ambulance fleet dispatch web application named "ResQ EMS Dispatch, Trip Log & Stock Management System".

---

## 1. ARCHITECTURE & TECH STACK
- **Framework**: React 18+ Single Page Application with TypeScript.
- **Styling**: Tailwind CSS with clinical high-contrast dark and light emergency themes ("black_red_white" primary livery).
- **Icons**: Lucide React.
- **Data Persistence & Local LAN Architecture**: Local storage abstraction with reactive multi-tab event broadcasting (\`resq-data-update\`), Web Audio dispatch chimes, and full JSON backup export & restore.
- **Timezone & Regional Compliance**: South African Standard Time (SAST, UTC+2 / Africa/Johannesburg). All timestamps formatted in SA conventions (DD/MM/YYYY, HH:mm). Compliant with South African Triage Scale (SATS), HPCSA paramedic qualification levels, and POPIA audit regulations.

---

## 2. STRICT REGIONAL & HOSPITAL CONSTRAINTS
### A. Colour Code Convention
- **STRICT REQUIREMENT**: For all trips and scheduled patient transfers, use ONLY the "X1" prefix for each triage colour code:
  - \`X1 Green\` (Low priority / non-urgent / routine)
  - \`X1 Yellow\` (Medium priority / urgent non-life-threatening)
  - \`X1 Red\` (High priority / emergent life-threatening)
  - \`X1 Orange\` (Very high priority / critical)
  - \`X1 Blue\` (Resuscitation / arrest or specialized transport)
- Do NOT use X2 or X3 prefixes. Next to the colour code, provide a direct destination hospital selector.

### B. Destination Hospitals (Brackenfell, Cape Town & Paarl Focus)
All Mediclinics, Netcare, and State hospitals located in and around Brackenfell, Cape Town, and Paarl must be pre-populated:
- **Mediclinic Facilities (MC Prefix)**:
  - \`MC Cape Gate\` (Brackenfell)
  - \`MC Durbanville\`
  - \`MC Panorama\`
  - \`MC Louis Leipoldt\` (Bellville)
  - \`MC Paarl\`
  - \`MC Stellenbosch\`
  - \`MC Vergelegen\` (Somerset West)
- **Netcare Facilities (NC Prefix)**:
  - \`NC Kuilsrivier\`
  - \`NC N1 City\`
  - \`NC Blaauwberg\`
  - \`NC Christiaan Barnard\`
- **State & Provincial Facilities**:
  - \`Karl Bremer Hospital\` (Bellville)
  - \`Tygerberg Hospital\` (Tertiary Academic)
  - \`Kraaifontein CHC\`
  - \`Brackenfell Clinic\`
  - \`Eerste River Hospital\`
  - \`Helderberg Hospital\`
  - \`Paarl Provincial Hospital\`
  - \`Red Cross Children's Hospital\` (Paediatric)
  - \`Groote Schuur Hospital\`

---

## 3. USER ROLES & ROLE-BASED ACCESS CONTROL (RBAC)
All actions must be logged in an audit trail with user identity (\`createdBy\`, \`approvedBy\`, \`issuedBy\`, \`dispatchedBy\`) to prevent unauthorized approvals:
1. **Developer (\`Developer\` / username \`dev\`)**:
   - Master technical authority.
   - EXCLUSIVE capability: Can trigger the **DEV RESET SYSTEM DATA** button to perform a complete factory wipe (0 records clean slate) or factory re-seed.
2. **Admin (\`Admin\`)**: Full operational privileges, user employee management, fleet & crew setup, system configurations, and master exports.
3. **Dispatcher (\`Dispatcher\`)**: CAD trip logging, upfront IHT patient booking & scheduling, ambulance fleet dispatch, and live trip status updates.
4. **Management / Operations Manager (\`Management\`)**: Approval of overtime claims, shift analytics, KPI dashboards, reports, and audit trail oversight.
5. **Office / Billing Officer (\`Office\`)**: ePRF audit verification, medical aid schemes, RAF/WCA billing capture, pre-authorisation validation, and export to Excel/CSV.
6. **Stock Controller (\`StockController\`)**: Ambulance inventory management, approval and physical issuing of pharmaceutical stock and Schedule 5/6 controlled substances.
7. **Paramedic (\`Paramedic\`)**: Mobile smartphone PWA interface (large touch targets 48px+), fast ePRF quick checks, emergency stock re-supply requisitions, and PIN authentication.
8. **ReadOnly / Clinical Auditor (\`ReadOnly\`)**: View-only compliance auditor access without modification rights.

---

## 4. PRE-BOOKING & UPFRONT IHT SCHEDULING (NEW FEATURE)
The system must provide upfront patient pre-booking for Inter-Hospital Transfers (IHT / IFT):
- **Scheduling Fields**:
  - Auto-generated Booking Reference (e.g. \`BK-26-8901\`)
  - Patient Full Name, SA ID / Date of Birth
  - Medical Aid Name, Medical Aid Number, Pre-Authorisation Code, Billing Type (MED AID, PRIVATE, WCA, RAF DOA, INDIGENT)
  - Call Type (\`IHT\`, \`IFT\`, \`DISCHARGE\`, \`PRIM\`)
  - Scheduled Date (YYYY-MM-DD) & Scheduled Time (HH:mm)
  - Pickup Hospital/Facility + Ward / Room / Bed (e.g. "MC Cape Gate - Ward 3B Bed 14")
  - Destination Hospital + Department / ICU / Cath Lab (e.g. "MC Paarl - Cardiac Cath Lab")
  - Colour Code: Strictly X1 options (\`X1 Green\`, \`X1 Yellow\`, \`X1 Red\`, \`X1 Orange\`, \`X1 Blue\`)
  - Level of Care: \`BLS\`, \`ILS\`, \`ALS\`
  - Transport Reason / Diagnosis (e.g. "Post-op ICU transfer", "Elective cardiac angiogram", "Dialysis session")
  - Clinical Needs Checklist: Oxygen flow rate (L/min), Stretcher, Wheelchair, Isolation, ICU monitor, Ventilator, Companion allowed
  - Doctor / Contact Person & Phone Number
  - Assigned Fleet Ambulance (e.g. \`MR001\`) & Assigned Crew Members
  - Booking Status (\`Scheduled\`, \`Confirmed\`, \`En Route\`, \`Dispatched\`, \`Completed\`, \`Cancelled\`)
- **Direct Dispatch Action**:
  - One-click "Dispatch Now to Active Trip" button that automatically creates an active dispatch trip record with the next sequential ePRF number, populates timestamps, links the booking, and marks it as Dispatched!
- **Views**:
  - Interactive calendar/timeline view showing transfers scheduled across the day.
  - Printable Transfer Voucher with patient particulars for the vehicle crew.

### B. Crew & Fleet Shift Roster Scheduling
- **Shift Duty Roster**:
  - Paramedic shifts (Day 06:00-18:00, Night 18:00-06:00, Standby, Off, Leave, Training).
  - Stations: Brackenfell Base, Cape Gate Station, Bellville Base, and Paarl Base.
  - Unit staffing allocations (MR001–MR005) with partner medic pairing.
  - Status tracking: Scheduled, On Duty (live indicator), Completed, Absent.
  - Single-click CSV Export for operational rosters and HPCSA compliance.
  - Real-time Duty Board summary showing ALS specialist coverage and staffed ambulances.

---

## 5. CORE OPERATIONAL MODULES
1. **Interactive Dashboard (Default First Screen on Login)**:
   - Live fleet readiness cards (MR001–MR005 with active status and assigned base).
   - Real-time KPI statistics: Total trips today, active calls, response times, scheduled IHT transfers, open stock requests, pending overtime claims.
   - Live activity ticker and quick-dispatch shortcuts.
2. **CAD Emergency Trip Logging (Row 1 to Row 5 Layout)**:
   - Form fields: ePRF # (digits auto-formatted to EPRF####), Ambulance fleet selector, Base, Date, Shift (Day/Night auto-calculated), CAD Call #, Level of Care, Billing type, Medical Scheme, Crew members, Call Type, Priority colour badge.
   - Side-by-side Destination: Dropdown for X1 colour code and Dropdown for Brackenfell/Paarl hospitals.
   - Real-time time calculations: Time Received, Mobile, At Scene, At Hospital, Available with auto-calculated Response, Travel, Turnaround, and Total Call Minutes.
   - Mileage tracking (KM Start, KM End, Distance).
3. **Trip Log Table & Search**:
   - Advanced filters by date range, shift, ambulance, billing, and full-text search.
   - Colour code badge paired with destination hospital name.
   - Single-click Excel (.xlsx), CSV, and PDF export.
4. **Overtime Tracking & Management Approvals**:
   - Overtime capture linked to ePRF or operational rationale.
   - Strict RBAC: Paramedics cannot approve claims; only Management and Admin can approve or reject with comments.
5. **Stock Requisition & Back-Office Issuing**:
   - Full South African Ambulance Stock Catalogue (Appendix A items across airway, cardiac, IV fluids, basic meds, ALS meds, and Schedule 5/6 controlled substances).
   - Mobile requisition flow for vehicle crew with offline draft saving.
   - Controlled substance verification requiring ALS qualification and HPCSA registration numbers.
6. **Settings & System Administration**:
   - Station base management (Brackenfell Base, Cape Gate Station, Bellville Base, Paarl Base).
   - Ambulance fleet and crew registration.
   - Destination hospital master list manager.
   - Full POPIA-compliant audit trail with IP and timestamp logging.
   - Full Audit History CSV Export button for administrative long-term record-keeping and regulatory compliance.
   - Full encrypted JSON database backup and restore.

---

## 6. DATA DELETION & DEVELOPER RESET CAPABILITY
- **STRICT USER REQUIREMENT**: "Add a reset button that will work only when dev is logged in. All data can be deleted."
- **Developer Identification**:
  - User with \`role: 'Developer'\` or \`username: 'dev'\` or \`isDev: true\`.
  - Credentials: Username \`dev\`, Password \`DevPassword123!\`, PIN \`9999\`.
- **Developer Reset Button**:
  - Visible ONLY when a Developer account is authenticated.
  - Provides two explicit modes:
    1. **Factory Clean Slate (Wipe All Operational Data)**:
       - Deletes 100% of captured trips, overtime records, stock requisitions, and scheduled IHT bookings (\`trips: []\`, \`overtime: []\`, \`stockRequests: []\`, \`preBookedTrips: []\`).
       - Preserves base hospital configurations and settings.
       - Leaves the database completely clean and empty (0 records).
    2. **Factory Re-seed (Default SA Seed Dataset)**:
       - Restores the default Brackenfell, Cape Town & Paarl hospitals, X1 colour codes, ambulances MR001–MR005, and seed IHT schedules.
  - Requires confirmation typing ("CONFIRM WIPE" or "CONFIRM RESET") to prevent accidental triggers.
`;

export const AiMasterPromptModal: React.FC<AiMasterPromptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(MASTER_AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([MASTER_AI_PROMPT], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ResQ_EMS_Full_AI_Master_Prompt_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-wide font-heading">
                  Comprehensive AI Master Blueprint &amp; Build Prompt
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white uppercase tracking-wider">
                  Full System Spec
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ready-to-use master prompt to re-create or extend this application with all Brackenfell/Paarl data, X1 colour codes, IHT scheduling, and Dev Reset.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <BookOpen className="w-4 h-4 text-red-400" />
            <span>Includes complete schemas, hospitals, X1 colour rules, and dev wipe instructions</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition cursor-pointer shadow-sm ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Entire Prompt'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-bold text-xs border border-slate-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-red-400" />
              <span>Download (.md)</span>
            </button>
          </div>
        </div>

        {/* Prompt Content View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed space-y-4">
          <pre className="whitespace-pre-wrap selection:bg-red-900 selection:text-white font-sans text-xs">
            {MASTER_AI_PROMPT}
          </pre>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Pass this prompt into any LLM or AI code assistant to build this exact system from scratch.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
