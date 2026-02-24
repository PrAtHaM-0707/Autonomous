flowchart TB

%% ================= USER =================
subgraph UI["🖥️ User"]
    Prompt["User Prompt<br/>'Refactor Button.jsx and Header.jsx'"]
end

%% ================= OPENCLAW =================
subgraph OpenClaw["🔷 OpenClaw Gateway"]

    %% -------- Lead Agent --------
    Lead["🧠 Lead / Guardian Agent<br/>(Planning + Delegation)"]

    %% -------- Sub Agents --------
    Refactor["⚙️ Refactor Executor<br/>(Scoped Write Access)"]
    Review["👀 Review Agent<br/>(Read-Only)"]

    %% -------- Intent Builder --------
    Intent["📋 Intent Builder<br/>(Structured Plan + File Scope)"]

    %% -------- ARMORIQ --------
    subgraph ArmorIQ["🛡️ ArmorIQ Enforcement Layer"]
        Token["Intent Token"]
        Policies["Policy Engine<br/>• Path Scoping<br/>• RBAC<br/>• Delegation Scope<br/>• Global Deny"]
        Decision{"Allow?"}
    end

    %% -------- Tools --------
    subgraph Tools["⚙️ Tool Executor"]
        Read["read_file"]
        Write["write_file"]
        List["list_dir"]
    end

    %% -------- Audit --------
    Audit["📄 Audit Log<br/>(logs/audit.jsonl)"]
end

%% ================= FILE SYSTEM =================
subgraph FS["📁 Project Workspace"]

    subgraph Allowed["✅ Allowed Paths"]
        Components["src/components/**"]
        Utils["src/utils/**"]
    end

    subgraph Protected["🚫 Protected Paths"]
        Auth["auth/**"]
        Config["config/**"]
        Env[".env*"]
    end
end

%% ================= FLOW =================
Prompt --> Lead

Lead --> Intent
Intent --> Token
Token --> Policies
Policies --> Decision

Decision -- Allowed --> Refactor
Decision -- Denied --> Blocked["❌ Blocked (Policy Deny / Drift Detected)"]

Refactor --> Write
Refactor --> Read
Refactor --> List

Write --> FS
Read --> FS
List --> FS

Lead --> Review
Review --> Read

Decision -.-> Audit
Write -.-> Audit
Read -.-> Audit
Blocked -.-> Audit