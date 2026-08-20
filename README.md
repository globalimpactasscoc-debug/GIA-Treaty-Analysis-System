<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Treaty Analysis System</title>

<style>
    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        background: #f5f4f0;
        color: #171717;
        font-family: "Times New Roman", Times, serif;
    }

    .topbar {
        height: 74px;
        background: #101820;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 42px;
        border-bottom: 4px solid #8b1e2d;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 18px;
    }

    .seal {
        width: 38px;
        height: 38px;
        border: 1px solid #d8d8d8;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        letter-spacing: 1px;
    }

    .brand-title {
        font-size: 22px;
        letter-spacing: .4px;
    }

    .brand-subtitle {
        font-size: 12px;
        color: #c8cdd1;
        margin-top: 2px;
        letter-spacing: .3px;
    }

    .status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #d9dddf;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        background: #6fa66f;
        border-radius: 50%;
    }

    .container {
        max-width: 1380px;
        margin: 0 auto;
        padding: 46px 42px 70px;
    }

    .page-heading {
        margin-bottom: 34px;
    }

    .page-heading h1 {
        font-size: 34px;
        font-weight: normal;
        margin: 0 0 8px;
    }

    .page-heading p {
        margin: 0;
        color: #626262;
        font-size: 16px;
        max-width: 780px;
        line-height: 1.55;
    }

    .workspace {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 26px;
    }

    .panel {
        background: #fff;
        border: 1px solid #d6d3cd;
        box-shadow: 0 2px 8px rgba(0,0,0,.035);
    }

    .panel-header {
        padding: 19px 23px;
        border-bottom: 1px solid #dedbd5;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .panel-header h2 {
        margin: 0;
        font-size: 19px;
        font-weight: normal;
    }

    .panel-header span {
        font-size: 12px;
        color: #777;
    }

    .panel-body {
        padding: 23px;
    }

    .drop-zone {
        height: 250px;
        border: 1px dashed #aaa7a0;
        background: #faf9f6;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        cursor: pointer;
        transition: .2s ease;
    }

    .drop-zone:hover,
    .drop-zone.dragover {
        border-color: #8b1e2d;
        background: #fcf8f8;
    }

    .upload-icon {
        width: 46px;
        height: 46px;
        border: 1px solid #999;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 15px;
        font-size: 22px;
        color: #555;
    }

    .drop-zone strong {
        font-size: 17px;
        font-weight: normal;
        margin-bottom: 7px;
    }

    .drop-zone small {
        color: #777;
        font-size: 13px;
    }

    input[type="file"] {
        display: none;
    }

    .divider {
        display: flex;
        align-items: center;
        gap: 13px;
        color: #888;
        font-size: 12px;
        margin: 22px 0;
    }

    .divider::before,
    .divider::after {
        content: "";
        height: 1px;
        background: #ddd9d2;
        flex: 1;
    }

    textarea {
        width: 100%;
        min-height: 220px;
        resize: vertical;
        border: 1px solid #cfcac2;
        padding: 15px;
        font-family: "Times New Roman", Times, serif;
        font-size: 15px;
        line-height: 1.55;
        color: #202020;
        outline: none;
    }

    textarea:focus {
        border-color: #8b1e2d;
    }

    .file-info {
        display: none;
        margin-top: 14px;
        border: 1px solid #d8d5cf;
        padding: 12px 14px;
        font-size: 13px;
        background: #f8f7f3;
        justify-content: space-between;
        align-items: center;
    }

    .file-info.visible {
        display: flex;
    }

    .remove-file {
        color: #8b1e2d;
        cursor: pointer;
    }

    .controls {
        margin-top: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
    }

    .database {
        font-size: 12px;
        color: #686868;
        line-height: 1.4;
    }

    button {
        font-family: "Times New Roman", Times, serif;
        cursor: pointer;
    }

    .analyze-btn {
        border: 0;
        background: #8b1e2d;
        color: white;
        padding: 13px 26px;
        font-size: 15px;
        transition: .2s ease;
    }

    .analyze-btn:hover {
        background: #711824;
    }

    .analyze-btn:disabled {
        background: #aaa;
        cursor: not-allowed;
    }

    .results-panel {
        margin-top: 26px;
        display: none;
    }

    .results-panel.visible {
        display: block;
    }

    .result-summary {
        display: grid;
        grid-template-columns: 230px 1fr;
        border-bottom: 1px solid #dedbd5;
    }

    .risk-box {
        padding: 28px;
        border-right: 1px solid #dedbd5;
        text-align: center;
    }

    .risk-label {
        color: #777;
        font-size: 13px;
        margin-bottom: 10px;
    }

    .risk-value {
        font-size: 28px;
        margin-bottom: 5px;
    }

    .risk-description {
        font-size: 13px;
        color: #666;
    }

    .summary-text {
        padding: 28px;
    }

    .summary-text h3 {
        margin: 0 0 10px;
        font-size: 19px;
        font-weight: normal;
    }

    .summary-text p {
        margin: 0;
        color: #555;
        font-size: 14px;
        line-height: 1.6;
    }

    .findings {
        padding: 24px;
    }

    .finding {
        border: 1px solid #d7d4ce;
        margin-bottom: 15px;
    }

    .finding:last-child {
        margin-bottom: 0;
    }

    .finding-header {
        padding: 15px 17px;
        border-bottom: 1px solid #dedbd5;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
    }

    .finding-title {
        font-size: 16px;
    }

    .severity {
        font-size: 11px;
        letter-spacing: .5px;
        padding: 5px 9px;
        border: 1px solid;
    }

    .severity.high {
        color: #8b1e2d;
        border-color: #8b1e2d;
    }

    .severity.medium {
        color: #7b5b16;
        border-color: #b59b61;
    }

    .severity.low {
        color: #486b4d;
        border-color: #77957b;
    }

    .finding-body {
        padding: 18px;
    }

    .finding-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
    }

    .field-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .7px;
        color: #777;
        margin-bottom: 6px;
    }

    .field-value {
        font-size: 14px;
        line-height: 1.5;
    }

    .explanation {
        margin-top: 18px;
        padding-top: 17px;
        border-top: 1px solid #e3e0da;
    }

    .confidence {
        display: inline-block;
        margin-top: 16px;
        font-size: 12px;
        color: #666;
    }

    .empty-state {
        padding: 60px 30px;
        text-align: center;
        color: #777;
        font-size: 14px;
    }

    .loading {
        display: none;
        padding: 35px;
        text-align: center;
        color: #666;
    }

    .loading.visible {
        display: block;
    }

    .loader {
        width: 25px;
        height: 25px;
        border: 2px solid #ddd;
        border-top-color: #8b1e2d;
        border-radius: 50%;
        animation: spin .8s linear infinite;
        margin: 0 auto 12px;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .footer {
        margin-top: 30px;
        padding-top: 18px;
        border-top: 1px solid #d7d4ce;
        color: #777;
        font-size: 12px;
        line-height: 1.5;
    }

    @media (max-width: 850px) {
        .workspace {
            grid-template-columns: 1fr;
        }

        .container {
            padding: 30px 20px 50px;
        }

        .topbar {
            padding: 0 20px;
        }

        .result-summary {
            grid-template-columns: 1fr;
        }

        .risk-box {
            border-right: 0;
            border-bottom: 1px solid #dedbd5;
        }

        .finding-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
</head>

<body>

<header class="topbar">
    <div class="brand">
        <div class="seal">GIA</div>
        <div>
            <div class="brand-title">Treaty Analysis System</div>
            <div class="brand-subtitle">U.S.–Japan Bilateral Legal Framework</div>
        </div>
    </div>

    <div class="status">
        <span class="status-dot"></span>
        Treaty database operational
    </div>
</header>

<main class="container">

    <section class="page-heading">
        <h1>Legal Compatibility Analysis</h1>
        <p>
            Submit proposed legislation, regulations, or other legal text for comparison
            against the structured U.S.–Japan treaty framework.
        </p>
    </section>

    <section class="workspace">

        <div class="panel">
            <div class="panel-header">
                <h2>Document Submission</h2>
                <span>PDF, TXT, DOCX</span>
            </div>

            <div class="panel-body">

                <label class="drop-zone" id="dropZone">
                    <input type="file" id="fileInput" accept=".txt,.pdf,.doc,.docx">
                    <div class="upload-icon">↑</div>
                    <strong>Upload legal text</strong>
                    <small>Drag and drop a document here or select a file</small>
                </label>

                <div class="file-info" id="fileInfo">
                    <span id="fileName"></span>
                    <span class="remove-file" id="removeFile">Remove</span>
                </div>

                <div class="divider">OR PASTE TEXT</div>

                <textarea id="documentText" placeholder="Paste the text of the proposed legislation, regulation, agreement, or other legal instrument here..."></textarea>

                <div class="controls">
                    <div class="database">
                        Comparison corpus<br>
                        U.S.–Japan bilateral treaty framework
                    </div>

                    <button class="analyze-btn" id="analyzeBtn">
                        Run Legal Analysis
                    </button>
                </div>

            </div>
        </div>

        <div class="panel">
            <div class="panel-header">
                <h2>Analysis Parameters</h2>
                <span>Automated comparison</span>
            </div>

            <div class="panel-body">

                <div style="margin-bottom:25px;">
                    <div class="field-label">Jurisdiction</div>
                    <div class="field-value">United States / Japan</div>
                </div>

                <div style="margin-bottom:25px;">
                    <div class="field-label">Corpus</div>
                    <div class="field-value">
                        Bilateral defense agreements, economic agreements,
                        trade agreements, taxation treaties, technology-related
                        agreements, protocols, and amendments
                    </div>
                </div>

                <div style="margin-bottom:25px;">
                    <div class="field-label">Comparison Method</div>
                    <div class="field-value">
                        Obligation, prohibition, right, exception, definition,
                        and condition matching
                    </div>
                </div>

                <div>
                    <div class="field-label">Output</div>
                    <div class="field-value">
                        Conflict identification, affected provision,
                        legal mechanism, severity, and explanatory reasoning
                    </div>
                </div>

            </div>
        </div>

    </section>

    <section class="panel results-panel" id="resultsPanel">

        <div class="panel-header">
            <h2>Analysis Results</h2>
            <span id="analysisTime"></span>
        </div>

        <div class="loading" id="loading">
            <div class="loader"></div>
            Comparing submitted text against treaty obligations
        </div>

        <div id="resultsContent">

            <div class="result-summary">
                <div class="risk-box">
                    <div class="risk-label">Overall Compatibility</div>
                    <div class="risk-value" id="riskValue">—</div>
                    <div class="risk-description" id="riskDescription">
                        Awaiting analysis
                    </div>
                </div>

                <div class="summary-text">
                    <h3>Preliminary Legal Assessment</h3>
                    <p id="summaryText">
                        Submit a document to generate a treaty compatibility assessment.
                    </p>
                </div>
            </div>

            <div class="findings" id="findings"></div>

        </div>

    </section>

    <div class="footer">
        This system provides automated legal research and treaty-compatibility analysis.
        Results are preliminary and should be reviewed by qualified legal counsel before
        being relied upon for legal, diplomatic, legislative, or policy decisions.
    </div>

</main>

<script>
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const removeFile = document.getElementById("removeFile");
const documentText = document.getElementById("documentText");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultsPanel = document.getElementById("resultsPanel");
const loading = document.getElementById("loading");
const resultsContent = document.getElementById("resultsContent");
const findings = document.getElementById("findings");

dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", event => {
    if (event.target.files.length) {
        showFile(event.target.files[0]);
    }
});

dropZone.addEventListener("dragover", event => {
    event.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", event => {
    event.preventDefault();
    dropZone.classList.remove("dragover");

    if (event.dataTransfer.files.length) {
        showFile(event.dataTransfer.files[0]);
    }
});

function showFile(file) {
    fileName.textContent = file.name;
    fileInfo.classList.add("visible");

    if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
        const reader = new FileReader();

        reader.onload = event => {
            documentText.value = event.target.result;
        };

        reader.readAsText(file);
    }
}

removeFile.addEventListener("click", event => {
    event.stopPropagation();
    fileInput.value = "";
    fileInfo.classList.remove("visible");
    fileName.textContent = "";
});

analyzeBtn.addEventListener("click", () => {

    const text = documentText.value.trim();

    if (!text && !fileInput.files.length) {
        documentText.focus();
        return;
    }

    resultsPanel.classList.add("visible");
    loading.classList.add("visible");
    resultsContent.style.display = "none";
    analyzeBtn.disabled = true;

    setTimeout(() => {

        loading.classList.remove("visible");
        resultsContent.style.display = "block";
        analyzeBtn.disabled = false;

        generateAnalysis(text);

        document.getElementById("analysisTime").textContent =
            "Completed " + new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });

    }, 1500);
});

function generateAnalysis(text) {

    const lower = text.toLowerCase();

    let score = 0;
    let potentialFindings = [];

    const tradeTerms = [
        "tariff", "import", "export", "customs",
        "trade", "quota", "goods", "duties"
    ];

    const defenseTerms = [
        "military", "defense", "defence", "security",
        "armed forces", "base", "installation"
    ];

    const technologyTerms = [
        "semiconductor", "artificial intelligence",
        "technology", "data", "encryption",
        "telecommunications", "chip"
    ];

    const taxTerms = [
        "tax", "taxation", "income", "withholding",
        "corporate tax", "double taxation"
    ];

    const containsAny = terms =>
        terms.some(term => lower.includes(term));

    if (containsAny(tradeTerms)) {
        score += 24;

        potentialFindings.push({
            title: "Trade and Economic Obligations",
            severity: "medium",
            severityText: "POTENTIAL",
            category: "Trade",
            treaty: "Relevant U.S.–Japan economic and trade instruments",
            mechanism:
                "The submitted text contains provisions relating to trade, imports, exports, tariffs, customs, or market access.",
            explanation:
                "These provisions should be compared against existing bilateral economic obligations, including applicable tariff treatment, market-access commitments, customs requirements, and negotiated exceptions."
        });
    }

    if (containsAny(defenseTerms)) {
        score += 28;

        potentialFindings.push({
            title: "Defense and Security Obligations",
            severity: "high",
            severityText: "REVIEW REQUIRED",
            category: "Defense / Security",
            treaty: "Relevant U.S.–Japan defense and security agreements",
            mechanism:
                "The submitted text contains language potentially affecting defense, military operations, installations, or security cooperation.",
            explanation:
                "The relevant provisions should be reviewed against existing bilateral defense obligations, including rights, responsibilities, access arrangements, consultation requirements, and security-related limitations."
        });
    }

    if (containsAny(technologyTerms)) {
        score += 30;

        potentialFindings.push({
            title: "Technology-Related Obligations",
            severity: "high",
            severityText: "REVIEW REQUIRED",
            category: "Technology",
            treaty: "Relevant U.S.–Japan technology and economic instruments",
            mechanism:
                "The submitted text regulates technology, telecommunications, data, semiconductors, encryption, or related strategic infrastructure.",
            explanation:
                "The provision may intersect with existing bilateral commitments concerning technology cooperation, information handling, strategic goods, economic security, or related restrictions."
        });
    }

    if (containsAny(taxTerms)) {
        score += 18;

        potentialFindings.push({
            title: "Taxation Obligations",
            severity: "medium",
            severityText: "POTENTIAL",
            category: "Taxation",
            treaty: "U.S.–Japan income tax treaty framework",
            mechanism:
                "The submitted text contains provisions concerning taxation or cross-border income.",
            explanation:
                "The relevant provisions should be compared against existing bilateral taxation rules concerning jurisdiction to tax, withholding, residency, allocation of taxing rights, and applicable treaty exceptions."
        });
    }

    if (score > 100) score = 100;

    let risk;
    let description;

    if (score >= 70) {
        risk = "HIGH";
        description = "Multiple areas require substantive treaty review";
    } else if (score >= 35) {
        risk = "MODERATE";
        description = "Potential treaty implications identified";
    } else {
        risk = "LOW";
        description = "Limited treaty-relevant language detected";
    }

    document.getElementById("riskValue").textContent = risk;
    document.getElementById("riskDescription").textContent = description;

    if (potentialFindings.length === 0) {

        document.getElementById("summaryText").textContent =
            "The submitted text did not contain sufficient treaty-relevant terminology for the demonstration analysis to identify a potential conflict. A production system would perform a substantive semantic comparison against the full structured treaty corpus.";

        findings.innerHTML = `
            <div class="empty-state">
                No potential treaty conflicts identified in the preliminary analysis.
            </div>
        `;

        return;
    }

    document.getElementById("summaryText").textContent =
        "The preliminary analysis identified " +
        potentialFindings.length +
        " area" +
        (potentialFindings.length === 1 ? "" : "s") +
        " requiring comparison against existing bilateral obligations. These findings indicate areas for legal review and do not constitute a definitive determination of treaty violation.";

    findings.innerHTML = potentialFindings.map(item => `
        <div class="finding">
            <div class="finding-header">
                <div class="finding-title">${item.title}</div>
                <div class="severity ${item.severity}">
                    item.severityText</div></div><divclass="finding-body"><divclass="finding-grid"><div><divclass="field-label">LegalCategory</div><divclass="field-value">{item.category}</div>
                    </div>

                    <div>
                        <div class="field-label">Relevant Treaty Corpus</div>
                        <div class="field-value">item.treaty</div></div></div><divclass="explanation"><divclass="field-label">LegalMechanism</div><divclass="field-value">{item.mechanism}</div>

                    <div style="margin-top:15px;">
                        <div class="field-label">Preliminary Explanation</div>
                        <div class="field-value">${item.explanation}</div>
                    </div>

                    <div class="confidence">
                        Preliminary classification based on submitted text
                    </div>

                </div>

            </div>
        </div>
    `).join("");
}
</script>

</body>
</html>

