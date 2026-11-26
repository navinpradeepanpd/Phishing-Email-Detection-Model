# PhishGuard AI: Internship Presentation Demo Script (8 Steps)

**Presenter:** Navin Pradeepan  
**Target Duration:** 7 - 10 minutes  
**Format:** Live Demonstration & Architecture Presentation  

---

### Step 1: High-Level Problem & Vision (1 min)
* **Action:** Start on the **Analyze Email** screen with the light theme enabled. Point out the VisionOS Liquid Glass aesthetic and ambient aurora background.
* **Talking Points:**
  - *"Welcome! Today I'm presenting **PhishGuard AI**, an enterprise phishing email detection system built during my internship."*
  - *"Traditional email gateways rely on static blocklists that fail against novel social engineering lures, while naive AI tools hallucinate or open dangerous links."*
  - *"PhishGuard AI solves this through a dual-stream architecture: Sublinear TF-IDF combined with 16 deterministic threat heuristics, trained on 17,514 real emails, wrapped in a zero-network privacy-first platform."*

---

### Step 2: Instant Phishing Threat Detection (1 min)
* **Action:** Click the **"Try example"** dropdown, select **"Phishing Example"** (Microsoft 365 Password Expiry with IP address link), and click **"Analyze Threat"**.
* **Talking Points:**
  - *"Notice the glowing morphing button state. Within 120 milliseconds, the spring-animated results panel renders."*
  - *"The circular glass gauge highlights a **98%+ Phishing Probability** with Critical Confidence."*
  - *"In the Semantic Heatmap, notice how urgent tokens like 'expires', 'verify', and 'suspended' are dynamically heat-mapped according to their linear model weights."*

---

### Step 3: Zero-Network URL Risk Diagnostics (1 min)
* **Action:** Scroll down to the **"Extracted Links & URL Risk Chips"** card.
* **Talking Points:**
  - *"Notice the red warning chip on `http://192.168.1.105/auth/login`."*
  - *"PhishGuard flagged two distinct threats: raw IP host address and insecure plain HTTP protocol."*
  - *"Crucially: **PhishGuard never executes network calls or fetches URLs**. All risk evaluation is performed strictly offline through lexical syntax, TLD reputation lists, and regex engines, preventing any server-side beaconing to attackers."*

---

### Step 4: Legitimate Email Baseline & Explainability (1 min)
* **Action:** In the "Try example" dropdown, select **"Safe Example"** (Jira sprint pull request approval) and click **"Analyze Threat"**.
* **Talking Points:**
  - *"Now let's test a genuine collaborative work email. The gauge transitions to an emerald glow with a Safe verdict."*
  - *"In the 'Why this verdict' diverging bar chart, notice how positive phishing signals are absent, while tokens like 'diff', 'approved', and verified corporate domains pull the probability down to near zero."*
  - *"This gives security analysts complete explainability rather than an opaque black box."*

---

### Step 5: Privacy-First Zero-Storage Mode (45 sec)
* **Action:** Toggle the **"Zero-Storage Mode"** switch and open the **Audit Trail** (`/history`) tab.
* **Talking Points:**
  - *"Cybersecurity and privacy go hand in hand. In Zero-Storage mode, PhishGuard never retains the sensitive body of emails in our SQLite database."*
  - *"Only a cryptographic SHA-256 digest is stored alongside the model verdict, allowing organizations to maintain tamper-evident audit logs without storing corporate secrets."*

---

### Step 6: Batch Analysis & Multi-File Processing (1.5 min)
* **Action:** Switch to the **Batch Scan** (`/batch`) tab. Upload a sample batch CSV or drag and drop `.eml` files.
* **Talking Points:**
  - *"For SOC teams handling bulk incident triage, the Batch Scanner processes hundreds of emails asynchronously."*
  - *"The live progress bar streams progress, followed by a threat composition Donut chart and an interactive glass ledger."*
  - *"Analysts can sort by probability, filter by keyword, and export a clean timestamped CSV audit report with one click."*

---

### Step 7: Transparent Real Metrics & Cross-Validation (1.5 min)
* **Action:** Switch to the **Model Telemetry** (`/metrics`) tab. Hover over the Confusion Matrix Heatmap cells and inspect the ROC curves.
* **Talking Points:**
  - *"A core principle of this project is **Zero Fabrication**. Every metric shown on this dashboard is served directly from our real test evaluation on 2,628 held-out emails."*
  - *"Our champion model—Tuned Logistic Regression ($C=8.0$)—achieves **98.13% Accuracy**, **97.50% F1-Score**, and **99.85% ROC-AUC**."*
  - *"Point out the False Positive Rate: only **1.40%** (23 out of 1,647 safe emails). In enterprise security, keeping FPR low is vital so that legitimate customer invoices and vendor communications are never dropped."*
  - *"Our data leakage audit verified zero duplicate overlap between train and test splits."*

---

### Step 8: Architecture Deep-Dive & Submission Notebook (1 min)
* **Action:** Switch to the **How It Works** (`/pipeline`) tab to show the sequentially lighting nodes. Briefly mention the Jupyter Notebook (`notebooks/PhishGuard_ML_Walkthrough.ipynb`).
* **Talking Points:**
  - *"The pipeline tab visually demonstrates the 6 stages of processing from raw ingestion to calibrated verdict."*
  - *"For technical review, I've prepared a comprehensive Jupyter Notebook walking through data cleaning, feature extraction, cross-validation, and ROC analysis."*
  - *"Thank you! I'm happy to open the floor for any questions."*
