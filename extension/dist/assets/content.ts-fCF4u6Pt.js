import{d as ce,g as C}from"./settings-CKgsCb4p.js";const Me=[/\brace\b/i,/ethnic/i,/\bgender\b/i,/\bsex\b/i,/veteran/i,/military/i,/disabilit/i,/\blgbt/i,/religion/i,/convict/i,/criminal/i,/felony/i,/misdemeanor/i,/salary/i,/compensation/i,/\bwage\b/i,/pay\s*rate/i,/authorized to work/i,/work authorization/i,/work\s*auth/i,/\bvisa\b/i,/citizenship/i,/sponsorship/i,/\bssn\b/i,/social security/i,/date of birth/i,/\bdob\b/i,/\bage\b/i];function xe(e){const t=(e||"").trim();return t?Me.some(i=>i.test(t)):!1}function Ne(e){return e.toLowerCase().replace(/[_\-]+/g," ").replace(/\s+/g," ").trim()}function Re(e){const t=(e.type||"").toLowerCase();if(t==="hidden"||t==="submit"||t==="button"||t==="checkbox"||t==="radio"||t==="file")return"skip";const i=Ne([e.name,e.id,e.label,e.placeholder,e.autocomplete].filter(Boolean).join(" "));return i?/\b(password|captcha|csrf|token|honeypot)\b/.test(i)||/\b(cover\s*letter|resume|cv|attach)\b/.test(i)&&t==="file"?"skip":t==="email"||/\b(e[\s-]?mail|emailaddress)\b/.test(i)?"email":t==="tel"||/\b(phone|mobile|cell|tel)\b/.test(i)?"phone":/\b(preferred\s*(first\s*)?name|pref\s*name|nickname)\b/.test(i)?"preferred_name":/\b(first\s*name|fname|given\s*name)\b/.test(i)||e.autocomplete==="given-name"?"first_name":/\b(last\s*name|lname|surname|family\s*name)\b/.test(i)||e.autocomplete==="family-name"?"last_name":/^(name|full name)$/.test(i)?"unknown":/\blinkedin\b/.test(i)?"linkedin":/\b(website|portfolio|personal\s*site|github\.com|homepage)\b/.test(i)?"website":/\bcountry\b/.test(i)?"country":/\b(how\s*did\s*you\s*hear|hear\s*about|referral\s*source|source)\b/.test(i)?"how_heard":e.name==="first_name"||e.id==="first_name"?"first_name":e.name==="last_name"||e.id==="last_name"?"last_name":e.name==="preferred_name"?"preferred_name":"unknown":"unknown"}function Te(e,t){switch(e){case"first_name":return t.firstName||null;case"last_name":return t.lastName||null;case"preferred_name":return t.preferredName||t.firstName||null;case"email":return t.email||null;case"phone":return t.phone||null;case"linkedin":return t.linkedin||null;case"website":return t.website||null;case"country":return t.country||null;case"how_heard":return t.howHeard||null;default:return null}}function se(e){const t=[e.name||"",e.id||"",e.getAttribute("aria-label")||""];e.labels&&Array.from(e.labels).forEach(a=>t.push(a.innerText||""));const i=e.closest("div, label, fieldset, li, td");return i&&t.push(i.textContent||""),t.join(" ").toLowerCase().replace(/\s+/g," ")}function Be(){return Array.from(document.querySelectorAll('input[type="file"]')).filter(e=>e instanceof HTMLInputElement)}function Ue(){const e=Be(),t=e.find(i=>{const a=se(i);return/\b(resume|cv|curriculum)\b/.test(a)&&!/\bcover\b/.test(a)});return t||(e.length===1?e[0]:e.find(i=>!/\bcover\b/.test(se(i)))||null)}function Qe(){return Be().find(e=>{const t=se(e);return/\bcover\s*(letter)?\b/.test(t)})||null}function Oe(e,t){var i;try{const a=new DataTransfer;return a.items.add(t),e.files=a.files,e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),(((i=e.files)==null?void 0:i.length)??0)>0}catch{return!1}}const De=650,Je=180,Se="#9ca3af",ke="hireiq-autofill-styles";function ee(){if(document.getElementById(ke))return;const e=document.createElement("style");e.id=ke,e.textContent=`
    [data-hiq-state="provisional"] {
      color: ${Se} !important;
      outline: 2px dashed #f59e0b !important;
      outline-offset: 2px;
    }
    [data-hiq-state="accepted"] {
      outline: 2px solid #10b981 !important;
      outline-offset: 2px;
      transition: outline-color 0.4s ease;
    }
    .hiq-flash-green {
      outline: 2px solid #10b981 !important;
      outline-offset: 2px;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
      transition: box-shadow 0.35s ease, outline-color 0.35s ease;
    }
  `,(document.head||document.documentElement).appendChild(e)}function Ge(e){return new Promise(t=>setTimeout(t,e))}function Le(e){if(e.labels&&e.labels[0])return e.labels[0].innerText.replace(/\s+/g," ").trim();const t=e.getAttribute("aria-label");if(t)return t.trim();const i=e.getAttribute("placeholder");return i?i.trim():e.name||e.id||e.type||"field"}function Ke(e){if(e.required)return!0;const t=Le(e);return/\*\s*$/.test(t)||/\brequired\b/i.test(t)}function te(e,t){var c;const i=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,a=Object.getOwnPropertyDescriptor(i,"value");(c=a==null?void 0:a.set)==null||c.call(e,t),e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),e.dispatchEvent(new KeyboardEvent("keyup",{bubbles:!0}))}function Ve(){return Array.from(document.querySelectorAll("input, textarea, select")).filter(e=>!(!(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement)||e instanceof HTMLInputElement&&e.type==="hidden"))}function Ye(e,t,i){return(e.name||e.id||t||`field_${i}`).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,80)||`field_${i}`}function We(e){return{name:e.name||"",id:e.id||"",type:e instanceof HTMLInputElement?e.type:e.tagName.toLowerCase(),label:Le(e),placeholder:e.getAttribute("placeholder")||"",autocomplete:e.getAttribute("autocomplete")||""}}function Q(e){ee(),e instanceof HTMLElement&&(e.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"}),e.classList.add("hiq-flash-green"),window.setTimeout(()=>e.classList.remove("hiq-flash-green"),De))}function de(){const e=[],t=new Set;let i=0;for(const a of Ve()){const c=We(a),u=Re(c);if(u==="skip")continue;let f=Ye(a,c.label,i++);t.has(f)&&(f=`${f}_${i}`),t.add(f),e.push({key:f,el:a,label:c.label.slice(0,200),required:Ke(a),kind:u,inputType:c.type,value:(a.value||"").trim()})}return e}function Ce(e){const t=[];let i=0,a=0,c=0,u=0;for(const f of de()){const E=Te(f.kind,e);f.kind!=="unknown"&&!!E&&(a+=1),f.required&&(u+=1);const q=!!f.value;q&&(i+=1,f.required&&(c+=1)),(f.kind!=="unknown"||f.required)&&t.push({kind:f.kind,label:f.label.slice(0,80),required:f.required,filled:q,value:q?f.value.slice(0,60):""})}return{items:t,filledCount:i,fillableCount:a,requiredFilled:c,requiredTotal:u}}async function Xe(e,t){var c;ee();const i=(t==null?void 0:t.delayMs)??Je,a=de();for(const u of a){if(u.kind==="unknown"||u.kind==="skip")continue;const f=Te(u.kind,e);!f||(u.el.value||"").trim()||(Q(u.el),te(u.el,f),(c=t==null?void 0:t.onField)==null||c.call(t,u.label),await Ge(i))}return Ce(e)}function Z(e){return e?Ce(e):{items:[],filledCount:0,fillableCount:0,requiredFilled:0,requiredTotal:0}}function Ze(){return de().filter(e=>{if(e.kind==="skip"||e.value)return!1;const t=e.inputType.toLowerCase();return t==="file"||t==="password"||t==="hidden"?!1:e.kind!=="unknown"&&e.kind!=="skip"?!0:e.kind==="unknown"})}function Ee(e,t){ee(),te(e,t),e.setAttribute("data-hiq-state","provisional"),e.style.color=Se}function et(e,t){ee(),typeof t=="string"&&te(e,t),e.setAttribute("data-hiq-state","accepted"),e.style.color="",Q(e),window.setTimeout(()=>{e.getAttribute("data-hiq-state")==="accepted"&&(e.style.outline="")},1200)}function tt(e){e.getAttribute("data-hiq-state")==="provisional"&&te(e,""),e.removeAttribute("data-hiq-state"),e.style.color="",e.style.outline=""}function qe(){return Ue()}function $e(){return Qe()}function nt(e,t){return Oe(e,t)}async function j(e,t){return chrome.runtime.sendMessage({type:"HIREIQ_FETCH",url:e,init:t})}async function _(){const e=await chrome.runtime.sendMessage({type:"HIREIQ_GET_BEARER"});if(!(e!=null&&e.ok)||!e.token)throw new Error((e==null?void 0:e.error)||"Sign in with Google in the HireIQ popup first");return e.token}function it(e,t,i){const a=atob(e),c=new Uint8Array(a.length);for(let u=0;u<a.length;u++)c[u]=a.charCodeAt(u);return new File([c],t,{type:i})}function ot(e){const t=e.text.replace(/\s+/g," ").slice(0,8e3).toLowerCase(),i=e.passwordCount>0,a=e.applyFieldCount,c=/create (an )?account|sign up|register|new user|join (us|now)|don't have an account|create your profile/i.test(t),u=/sign in|log in|already have an account|welcome back|forgot (your )?password/i.test(t);return i&&c&&a<2?{needsAccount:!0,kind:"signup",reason:"This page asks you to create an account before applying."}:i&&u&&a<2?{needsAccount:!0,kind:"login",reason:"This page asks you to sign in to the employer site."}:e.passwordCount>=2&&a<2?{needsAccount:!0,kind:"signup",reason:"Looks like an account registration form."}:{needsAccount:!1,kind:a>0?"apply":"unknown",reason:"Application form detected (or unknown page)."}}function Ie(e){var c;const t=((c=e.body)==null?void 0:c.innerText)||"",i=e.querySelectorAll('input[type="password"]').length,a=e.querySelectorAll('input[name="first_name"], input[name="last_name"], input[name="resume"], textarea[name="cover_letter"], #first_name, #last_name').length;return ot({text:t,passwordCount:i,applyFieldCount:a})}const le="hireiq-panel-root";function U(){var q,H,O,D,T,P,F,z,J,G,K;const e=location.href,i=((H=(q=document.querySelector('meta[property="og:title"]'))==null?void 0:q.getAttribute("content"))==null?void 0:H.trim())||""||((D=(O=document.querySelector("h1"))==null?void 0:O.textContent)==null?void 0:D.trim())||document.title.replace(/\s*[|\-–—].*$/,"").trim()||"Untitled role",a=document.title.match(/\bat\s+(.+?)(?:\s*[|\-–—]|$)/i),c=((T=a==null?void 0:a[1])==null?void 0:T.trim())||"",u=((F=(P=document.querySelector('[data-company], .company, .employer, [class*="companyName"], [class*="CompanyName"], .app-title .company-name'))==null?void 0:P.textContent)==null?void 0:F.trim())||((J=(z=document.querySelector('meta[property="og:site_name"]'))==null?void 0:z.getAttribute("content"))==null?void 0:J.trim())||c||(()=>{var V;const I=document.querySelector("img[alt]");if(I!=null&&I.alt&&!/logo/i.test(I.alt))return I.alt.trim();const M=document.querySelector('a[href="/"] img, header img');return((V=M==null?void 0:M.alt)==null?void 0:V.replace(/\s*logo$/i,"").trim())||""})()||"",f=((K=(G=document.querySelector('[data-location], .location, [class*="jobLocation"], [class*="JobLocation"], .location-name, .job__location'))==null?void 0:G.textContent)==null?void 0:K.trim())||"",E=document.querySelector('#content, [data-job-description], .job-description, #job-description, .job__description, [class*="description"], article, main')||document.body;let A=((E==null?void 0:E.textContent)||"").replace(/\s+/g," ").trim().slice(0,2e4);return A.length<40&&(A=`Saved from ${e}`),{url:e,title:i.slice(0,500),company:u.slice(0,500),description:A,location:f.slice(0,500)}}function at(){var e;(e=document.getElementById(le))==null||e.remove()}function rt(e,t){return t<=0?0:Math.round(e/t*100)}function st(e){return e.items.length?e.items.slice(0,12).map(i=>{const a=i.filled?"✓":"○";return`<div class="check ${i.filled?"ok":i.required?"need":"opt"}"><span>${a}</span><span>${m(i.label)}</span></div>`}).join(""):'<div class="muted">No form fields detected yet — scroll to the application form.</div>'}function m(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function lt(){if(document.getElementById(le))return;const e=document.createElement("div");e.id=le,e.attachShadow({mode:"open"});const t=e.shadowRoot,i=U();t.innerHTML=`
    <style>
      :host { all: initial; }
      .dock {
        position: fixed;
        z-index: 2147483646;
        top: 0;
        right: 0;
        height: 100vh;
        width: min(380px, 92vw);
        font-family: "Segoe UI", ui-sans-serif, system-ui, sans-serif;
        color: #0f172a;
        pointer-events: none;
      }
      .panel {
        pointer-events: auto;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #fff;
        border-left: 1px solid #e2e8f0;
        box-shadow: -8px 0 32px rgba(15, 23, 42, 0.12);
      }
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 14px 16px;
        border-bottom: 1px solid #e2e8f0;
      }
      .brand {
        font-weight: 700;
        font-size: 15px;
        letter-spacing: -0.02em;
      }
      .brand span { color: #0d9488; }
      .iconbtn {
        appearance: none;
        border: 0;
        background: #f1f5f9;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
      }
      .body {
        flex: 1;
        overflow: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .jobcard {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px 14px;
        background: #f8fafc;
      }
      .company {
        font-size: 12px;
        color: #64748b;
        margin: 0 0 4px;
      }
      .title {
        font-size: 15px;
        font-weight: 650;
        line-height: 1.35;
        margin: 0;
      }
      .btn {
        appearance: none;
        border: 0;
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 14px;
        font-weight: 650;
        cursor: pointer;
        width: 100%;
      }
      .btn.primary {
        background: #0d9488;
        color: #fff;
      }
      .btn.primary:disabled { opacity: 0.55; cursor: default; }
      .btn.secondary {
        background: #fff;
        color: #0f172a;
        border: 1px solid #cbd5e1;
      }
      .btn.linkish {
        background: transparent;
        color: #0d9488;
        border: 0;
        padding: 8px;
        font-size: 13px;
      }
      .btn.sm {
        padding: 6px 10px;
        font-size: 12px;
        width: auto;
        border-radius: 8px;
      }
      .btn.ghost {
        background: #f1f5f9;
        color: #334155;
      }
      .btn.danger-ghost {
        background: transparent;
        color: #64748b;
        border: 1px solid #e2e8f0;
      }
      .stack { display: flex; flex-direction: column; gap: 8px; }
      .row { display: flex; gap: 6px; flex-wrap: wrap; }
      .progress {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px;
      }
      .progress-top {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .bar {
        height: 6px;
        border-radius: 99px;
        background: #e2e8f0;
        overflow: hidden;
        margin-bottom: 10px;
      }
      .bar > i {
        display: block;
        height: 100%;
        background: #0d9488;
        width: 0%;
      }
      .check {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        font-size: 12px;
        padding: 4px 0;
        color: #334155;
      }
      .check.ok { color: #047857; }
      .check.need { color: #b45309; }
      .check.opt { color: #64748b; }
      .status { font-size: 12px; line-height: 1.4; color: #475569; min-height: 1.2em; }
      .status.ok { color: #047857; }
      .status.err { color: #b91c1c; }
      .section {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px;
      }
      .section h3 {
        margin: 0 0 8px;
        font-size: 12px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .kv {
        display: grid;
        gap: 4px;
        font-size: 12px;
        color: #334155;
      }
      .kv div { display: flex; gap: 6px; }
      .kv b { min-width: 64px; color: #64748b; font-weight: 600; }
      .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
      .chip {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 999px;
        background: #f1f5f9;
        color: #475569;
      }
      .postsave { display: none; flex-direction: column; gap: 8px; }
      .postsave.show { display: flex; }
      .account {
        display: none;
        border: 1px solid #fde68a;
        background: #fffbeb;
        border-radius: 12px;
        padding: 12px;
        gap: 8px;
        flex-direction: column;
      }
      .account.show { display: flex; }
      .account p { margin: 0; font-size: 12px; color: #92400e; line-height: 1.4; }
      .account input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #fcd34d;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 12px;
      }
      .review { display: none; flex-direction: column; gap: 10px; }
      .review.show { display: flex; }
      .review-card {
        border: 1px dashed #fbbf24;
        border-radius: 10px;
        padding: 10px;
        background: #fffbeb;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .review-card.done {
        border-style: solid;
        border-color: #e2e8f0;
        background: #f8fafc;
        opacity: 0.85;
      }
      .review-card .q {
        font-size: 12px;
        font-weight: 650;
        color: #334155;
        margin: 0;
      }
      .review-card textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: 64px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px;
        font-size: 12px;
        font-family: inherit;
        color: #0f172a;
        resize: vertical;
      }
      .review-card .promote {
        display: none;
        font-size: 11px;
        color: #475569;
        gap: 6px;
        flex-direction: column;
      }
      .review-card .promote.show { display: flex; }
      .files { display: none; flex-direction: column; gap: 6px; }
      .files.show { display: flex; }
      .muted { font-size: 12px; color: #64748b; }

      .fab {
        pointer-events: auto;
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483646;
        appearance: none;
        border: 0;
        border-radius: 999px;
        padding: 12px 16px;
        font-weight: 700;
        font-size: 13px;
        background: #0d9488;
        color: #fff;
        box-shadow: 0 10px 30px rgba(13, 148, 136, 0.35);
        cursor: pointer;
        font-family: inherit;
        display: none;
      }
      :host([data-collapsed="1"]) .dock { display: none; }
      :host([data-collapsed="1"]) .fab { display: inline-flex; }
    </style>
    <div class="dock">
      <div class="panel">
        <div class="head">
          <div class="brand">Hire<span>IQ</span></div>
          <button type="button" class="iconbtn" id="hiq-collapse" title="Collapse">›</button>
        </div>
        <div class="body">
          <div class="jobcard">
            <p class="company" id="hiq-company">${m(i.company||"Job page")}</p>
            <p class="title" id="hiq-title">${m(i.title.slice(0,100))}</p>
          </div>
          <div class="stack">
            <button type="button" class="btn primary" id="hiq-autofill">Autofill</button>
            <button type="button" class="btn secondary" id="hiq-save">Save to HireIQ</button>
          </div>
          <div class="account" id="hiq-account">
            <h3 style="margin:0;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.04em">Employer account needed</h3>
            <p id="hiq-account-reason">This site wants you to create / sign in to an account.</p>
            <p>Create the account yourself (we don’t invent emails). Then save the email here so HireIQ can help track status.</p>
            <input id="hiq-ats-email" type="email" placeholder="email you used on this site" />
            <button type="button" class="btn secondary" id="hiq-ats-save">Save ATS email</button>
          </div>
          <div class="section" id="hiq-autofill-info">
            <h3>Your Autofill Information</h3>
            <div class="muted" id="hiq-preview-loading">Sign in to load master resume…</div>
            <div class="kv" id="hiq-preview" hidden></div>
            <button type="button" class="btn linkish" id="hiq-edit-profile" hidden>Edit master profile →</button>
          </div>
          <div class="section review" id="hiq-review">
            <h3>Review AI answers</h3>
            <div id="hiq-review-list"></div>
          </div>
          <div class="section files" id="hiq-files">
            <h3>Documents</h3>
            <div id="hiq-files-body"></div>
          </div>
          <div class="postsave" id="hiq-postsave">
            <h3 style="margin:0;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">After save</h3>
            <button type="button" class="btn secondary" id="hiq-gen-resume">Generate tailored resume</button>
            <button type="button" class="btn secondary" id="hiq-gen-cover">Generate cover letter</button>
            <button type="button" class="btn linkish" id="hiq-open">Open job in HireIQ →</button>
          </div>
          <div class="progress">
            <div class="progress-top">
              <span id="hiq-prog-label">Form progress</span>
              <span id="hiq-prog-pct">0%</span>
            </div>
            <div class="bar"><i id="hiq-prog-bar"></i></div>
            <div id="hiq-checks"><div class="muted">Connect HireIQ in the popup, then Autofill.</div></div>
          </div>
          <div class="status" id="hiq-status"></div>
        </div>
      </div>
    </div>
    <button type="button" class="fab" id="hiq-expand">HireIQ</button>
  `,document.body?document.body.appendChild(e):document.documentElement.appendChild(e);const a=t.getElementById("hiq-status"),c=t.getElementById("hiq-save"),u=t.getElementById("hiq-autofill"),f=t.getElementById("hiq-open"),E=t.getElementById("hiq-gen-resume"),A=t.getElementById("hiq-gen-cover"),q=t.getElementById("hiq-postsave"),H=t.getElementById("hiq-account"),O=t.getElementById("hiq-account-reason"),D=t.getElementById("hiq-ats-email"),T=t.getElementById("hiq-ats-save"),P=t.getElementById("hiq-preview-loading"),F=t.getElementById("hiq-preview"),z=t.getElementById("hiq-edit-profile"),J=t.getElementById("hiq-collapse"),G=t.getElementById("hiq-expand"),K=t.getElementById("hiq-checks"),I=t.getElementById("hiq-prog-label"),M=t.getElementById("hiq-prog-pct"),V=t.getElementById("hiq-prog-bar"),ue=t.getElementById("hiq-review"),Y=t.getElementById("hiq-review-list"),pe=t.getElementById("hiq-files"),_e=t.getElementById("hiq-files-body");let $="",ne="",ie="",oe="",x="",B=null,v=[];function b(n,o=""){a.className=`status${o?` ${o}`:""}`,a.textContent=n}function He(n){P.hidden=!0,F.hidden=!1;const o=n.experience.filter(r=>r.title||r.company).map(r=>`${r.title}${r.company?` · ${r.company}`:""}`).slice(0,3).join(" · "),d=(n.skills||[]).slice(0,6).map(r=>`<span class="chip">${m(r)}</span>`).join("");F.innerHTML=`
      <div><b>Name</b><span>${m(n.fullName)}</span></div>
      ${n.headline?`<div><b>Title</b><span>${m(n.headline)}</span></div>`:""}
      <div><b>Email</b><span>${m(n.email)}</span></div>
      <div><b>Phone</b><span>${m(n.phone)}</span></div>
      ${n.location?`<div><b>Loc</b><span>${m(n.location)}</span></div>`:""}
      ${n.linkedin?`<div><b>LinkedIn</b><span>${m(n.linkedin)}</span></div>`:""}
      ${o?`<div><b>Exp</b><span>${m(o)}</span></div>`:""}
      ${d?`<div class="chips">${d}</div>`:""}
    `,z.hidden=!oe}function N(n){const o=n.requiredTotal||n.fillableCount||n.items.length,d=n.requiredTotal?n.requiredFilled:n.filledCount,r=rt(d,o);I.textContent=o?`${d}/${o} fields ready`:"Form progress",M.textContent=`${r}%`,V.style.width=`${r}%`,K.innerHTML=st(n)}async function fe(){const n=await C(),o=await _(),d=await j(`${n.apiBaseUrl.replace(/\/$/,"")}/api/extension/profile`,{headers:{Authorization:`Bearer ${o}`}}),r=d.json||{};if(!d.ok||!r.profile)throw new Error(r.error||d.error||`Profile failed (${d.status})`);return B=r.profile,oe=r.profileUrl||"",r.autofillPreview&&He(r.autofillPreview),r.profile}async function be(){if(x)return x;const n=await C(),o=await _(),d=U(),r=ce(d.url);if(!r.isJobPage)throw new Error(r.reason);const s=await j(`${n.apiBaseUrl.replace(/\/$/,"")}/api/jobs`,{method:"POST",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json"},body:JSON.stringify(d)}),p=s.json||{};if(!s.ok||!p.jobId)throw new Error(p.error||s.error||`Save failed (${s.status})`);return x=p.jobId,$=p.trackerUrl||"",ne=p.resumeUrl||$,ie=p.coverUrl||$,q.classList.add("show"),c.textContent="Saved",c.disabled=!0,ge(),x}function S(){if(!v.length){ue.classList.remove("show"),Y.innerHTML="";return}ue.classList.add("show"),Y.innerHTML=v.map((n,o)=>{const d=n.status!=="pending";return`
        <div class="review-card ${d?"done":""}" data-idx="${o}">
          <p class="q">${m(n.label)}${n.manual?' <span class="muted">(you answer)</span>':""}</p>
          <textarea data-idx="${o}" placeholder="${n.manual?"Type your answer…":""}" ${d?"disabled":""}>${m(n.answer)}</textarea>
          <div class="row" data-actions="${o}">
            ${n.status==="pending"?`
              <button type="button" class="btn sm primary" data-act="accept" data-idx="${o}">Accept</button>
              <button type="button" class="btn sm ghost" data-act="edit" data-idx="${o}">Edit (save)</button>
              <button type="button" class="btn sm danger-ghost" data-act="skip" data-idx="${o}">Skip</button>
            `:`<span class="muted">${n.status==="accepted"?"Accepted":"Skipped"}</span>`}
          </div>
          <div class="promote ${n.askPromote?"show":""}" data-promote="${o}">
            <span>Also save to master?</span>
            <div class="row">
              <button type="button" class="btn sm primary" data-act="promote-yes" data-idx="${o}">Yes</button>
              <button type="button" class="btn sm ghost" data-act="promote-no" data-idx="${o}">No</button>
            </div>
          </div>
        </div>`}).join("")}async function me(n,o,d){const r=await C(),s=await _(),p=await j(`${r.apiBaseUrl.replace(/\/$/,"")}/api/extension/autofill/accept`,{method:"POST",headers:{Authorization:`Bearer ${s}`,"Content-Type":"application/json"},body:JSON.stringify({jobId:x,key:n.key,question:n.label,answer:o,promoteToMaster:!!d})}),g=p.json||{};if(!p.ok)throw new Error(g.error||p.error||`Accept failed (${p.status})`);return{lasting:!!(g.lasting??n.lasting)}}Y.addEventListener("click",async n=>{const o=n.target,d=o.closest(".review-card");if(!d)return;const r=Number(d.getAttribute("data-idx")),s=v[r];if(!s)return;if(!o.closest("button")&&!o.closest("textarea")){Q(s.el);return}const p=o.getAttribute("data-act");if(!p)return;n.stopPropagation();const g=Y.querySelector(`textarea[data-idx="${r}"]`),h=((g==null?void 0:g.value)??s.answer).trim();try{if(p==="edit"){if(!h){b("Enter an answer before saving the edit.","err");return}s.answer=h,Ee(s.el,h),b("Updated draft on the form.","ok");return}if(p==="skip"){tt(s.el),s.status="skipped",s.askPromote=!1,S(),B&&N(Z(B)),b("Skipped — field cleared.","");return}if(p==="accept"){if(!h){b("Answer is empty — edit or skip.","err");return}et(s.el,h),s.answer=h,s.status="accepted";const{lasting:y}=await me(s,h,!1);s.askPromote=y,S(),B&&N(Z(B)),b(y?"Accepted. Save to master?":"Accepted.","ok");return}if(p==="promote-yes"){await me(s,s.answer,!0),s.askPromote=!1,S(),b("Queued for master profile.","ok");return}if(p==="promote-no"){s.askPromote=!1,S();return}}catch(y){b(y instanceof Error?y.message:"Review action failed","err")}});async function he(n){if(!x)return;const o=n==="resume"?qe():$e();if(!o)return;const d=await C(),r=await _(),s=d.apiBaseUrl.replace(/\/$/,""),p=await j(`${s}/api/extension/jobs/${x}/pdf?type=${n}`,{method:"GET",headers:{Authorization:`Bearer ${r}`,Accept:"application/pdf"},responseType:"base64"}),g=p.json||{};if(p.base64&&p.ok){const h=n==="resume"?"HireIQ-resume.pdf":"HireIQ-cover.pdf",y=it(p.base64,h,p.contentType||"application/pdf");return{attached:nt(o,y),available:!0}}return{attached:!1,available:!!g.available}}function Pe(n){const o=[];if(n.hasResumeInput&&(n.resumeAttached?o.push('<div class="muted">Resume PDF attached ✓</div>'):(n.resumeAvailable===!1||!n.resumeAttached)&&o.push(`<a class="btn linkish" id="hiq-gen-attach-resume" href="${m(ne||$)}" target="_blank" rel="noopener">Generate &amp; attach resume</a>`)),n.hasCoverInput&&(n.coverAttached?o.push('<div class="muted">Cover letter PDF attached ✓</div>'):o.push(`<a class="btn linkish" id="hiq-gen-attach-cover" href="${m(ie||$)}" target="_blank" rel="noopener">Generate &amp; attach cover</a>`)),!o.length){pe.classList.remove("show");return}pe.classList.add("show"),_e.innerHTML=o.join("")}J.addEventListener("click",()=>{e.setAttribute("data-collapsed","1")}),G.addEventListener("click",()=>{e.removeAttribute("data-collapsed")});function W(n){n&&window.open(n,"_blank","noopener,noreferrer")}function ge(){const n=Ie(document);n.needsAccount?(H.classList.add("show"),O.textContent=n.reason):H.classList.remove("show")}T.addEventListener("click",async()=>{const n=D.value.trim();if(!n){b("Enter the email you used on this employer site.","err");return}if(!x){b("Save the job to HireIQ first, then save the ATS email.","err");return}T.disabled=!0;try{const o=await C(),d=await _(),r=await j(`${o.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${x}/ats-account`,{method:"PATCH",headers:{Authorization:`Bearer ${d}`,"Content-Type":"application/json"},body:JSON.stringify({email:n,note:Ie(document).kind})}),s=r.json||{};if(!r.ok)throw new Error(s.error||r.error||"Failed to save ATS email");b(`Saved ATS email ${n} for tracking.`,"ok")}catch(o){b(o instanceof Error?o.message:"Failed to save ATS email","err")}finally{T.disabled=!1}}),f.addEventListener("click",()=>W($)),E.addEventListener("click",()=>W(ne||$)),A.addEventListener("click",()=>W(ie||$)),z.addEventListener("click",()=>W(oe)),c.addEventListener("click",async()=>{c.disabled=!0,b("Saving to HireIQ…");try{await be();const n=[U().title,U().company].filter(Boolean);b(`Saved${n.length?`: ${n.join(" · ")}`:""}. Next: Autofill or generate docs.`,"ok")}catch(n){b(n instanceof Error?n.message:"Save failed","err"),c.disabled=!1}}),u.addEventListener("click",async()=>{var n;u.disabled=!0,v=[],S();try{b("Saving job…"),await be();const o=B||await fe();b("Filling known fields…");const d=await Xe(o,{onField:l=>b(`Filling: ${l.slice(0,40)}…`)});N(d);const r=Ze().slice(0,25),s=r.filter(l=>!xe(l.label)),p=r.filter(l=>xe(l.label));if(s.length){b(`Drafting ${s.length} unanswered questions…`);const l=await C(),ze=await _(),re=U(),X=await j(`${l.apiBaseUrl.replace(/\/$/,"")}/api/extension/autofill/drafts`,{method:"POST",headers:{Authorization:`Bearer ${ze}`,"Content-Type":"application/json"},body:JSON.stringify({jobId:x,title:re.title,company:re.company,description:re.description.slice(0,4e3),fields:s.map(L=>({key:L.key,label:L.label,required:L.required,inputType:L.inputType}))})}),we=X.json||{};if(!X.ok)b(we.error||X.error||`Drafts failed (${X.status}) — known fields still filled.`,"err");else{const L=new Map((we.drafts||[]).map(w=>[w.key,w]));for(const w of s){const k=L.get(w.key);if(!k||k.skip||!((n=k.answer)!=null&&n.trim())){v.push({key:w.key,label:w.label,answer:"",lasting:!!(k!=null&&k.lasting),el:w.el,status:"pending",askPromote:!1,manual:!0});continue}Ee(w.el,k.answer.trim()),v.push({key:w.key,label:w.label,answer:k.answer.trim(),lasting:!!k.lasting,el:w.el,status:"pending",askPromote:!1})}}}for(const l of p)v.push({key:l.key,label:l.label,answer:"",lasting:!1,el:l.el,status:"pending",askPromote:!1,manual:!0});S(),N(Z(o));const g=qe(),h=$e();let y=!1,R=!1,ye=!1,ve=!1;if(g){b("Attaching resume PDF…");const l=await he("resume");y=!!(l!=null&&l.attached),ye=!!(l!=null&&l.available||l!=null&&l.attached),y&&Q(g)}if(h){b("Attaching cover letter PDF…");const l=await he("cover");R=!!(l!=null&&l.attached),ve=!!(l!=null&&l.available||l!=null&&l.attached),R&&Q(h)}Pe({hasResumeInput:!!g,hasCoverInput:!!h,resumeAttached:y,coverAttached:R,resumeAvailable:ye,coverAvailable:ve});const ae=[d.filledCount?`${d.filledCount} known`:"",v.length?`${v.length} to review`:"",y?"resume attached":"",R?"cover attached":""].filter(Boolean),Fe=v.some(l=>!l.manual)?" Gray drafts need Accept before submit.":v.length?" Answer the remaining questions in the panel.":"";b(ae.length?`Autofill done: ${ae.join(" · ")}.${Fe}`:"No matching fields found on this page.",ae.length?"ok":"err")}catch(o){b(o instanceof Error?o.message:"Autofill failed","err")}finally{u.disabled=!1}}),ge(),(async()=>{try{const n=await fe();N(Z(n))}catch{P.textContent="Connect HireIQ in the popup to load master resume."}})()}function Ae(){if(!ce(location.href).isJobPage){at();return}lt()}function je(){Ae();let e=location.href;setInterval(()=>{location.href!==e&&(e=location.href,Ae())},800),chrome.runtime.sendMessage({type:"HIREIQ_DETECT",detect:ce(location.href)}).catch(()=>{})}function dt(){je()}je();export{dt as onExecute};
