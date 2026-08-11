import{d as fe,g as S}from"./settings-CKgsCb4p.js";const Ge=[/\brace\b/i,/ethnic/i,/\bgender\b/i,/\bsex\b/i,/veteran/i,/military/i,/disabilit/i,/\blgbt/i,/religion/i,/convict/i,/criminal/i,/felony/i,/misdemeanor/i,/salary/i,/compensation/i,/\bwage\b/i,/pay\s*rate/i,/authorized to work/i,/work authorization/i,/work\s*auth/i,/\bvisa\b/i,/citizenship/i,/sponsorship/i,/\bssn\b/i,/social security/i,/date of birth/i,/\bdob\b/i,/\bage\b/i];function qe(e){const t=(e||"").trim();return t?Ge.some(i=>i.test(t)):!1}function Ke(e){return e.toLowerCase().replace(/[_\-]+/g," ").replace(/\s+/g," ").trim()}function Ye(e){const t=(e.type||"").toLowerCase();if(t==="hidden"||t==="submit"||t==="button"||t==="checkbox"||t==="radio"||t==="file")return"skip";const i=Ke([e.name,e.id,e.label,e.placeholder,e.autocomplete].filter(Boolean).join(" "));return i?/\b(password|captcha|csrf|token|honeypot)\b/.test(i)||/\b(cover\s*letter|resume|cv|attach)\b/.test(i)&&t==="file"?"skip":t==="email"||/\b(e[\s-]?mail|emailaddress)\b/.test(i)?"email":t==="tel"||/\b(phone|mobile|cell|tel)\b/.test(i)?"phone":/\b(preferred\s*(first\s*)?name|pref\s*name|nickname)\b/.test(i)?"preferred_name":/\b(first\s*name|fname|given\s*name)\b/.test(i)||e.autocomplete==="given-name"?"first_name":/\b(last\s*name|lname|surname|family\s*name)\b/.test(i)||e.autocomplete==="family-name"?"last_name":/^(name|full name)$/.test(i)?"unknown":/\blinkedin\b/.test(i)?"linkedin":/\b(website|portfolio|personal\s*site|github\.com|homepage)\b/.test(i)?"website":/\bcountry\b/.test(i)?"country":/\b(how\s*did\s*you\s*hear|hear\s*about|referral\s*source|source)\b/.test(i)?"how_heard":e.name==="first_name"||e.id==="first_name"?"first_name":e.name==="last_name"||e.id==="last_name"?"last_name":e.name==="preferred_name"?"preferred_name":"unknown":"unknown"}function je(e,t){switch(e){case"first_name":return t.firstName||null;case"last_name":return t.lastName||null;case"preferred_name":return t.preferredName||t.firstName||null;case"email":return t.email||null;case"phone":return t.phone||null;case"linkedin":return t.linkedin||null;case"website":return t.website||null;case"country":return t.country||null;case"how_heard":return t.howHeard||null;default:return null}}function ue(e){const t=[e.name||"",e.id||"",e.getAttribute("aria-label")||""];e.labels&&Array.from(e.labels).forEach(a=>t.push(a.innerText||""));const i=e.closest("div, label, fieldset, li, td");return i&&t.push(i.textContent||""),t.join(" ").toLowerCase().replace(/\s+/g," ")}function _e(){return Array.from(document.querySelectorAll('input[type="file"]')).filter(e=>e instanceof HTMLInputElement)}function Ve(){const e=_e(),t=e.find(i=>{const a=ue(i);return/\b(resume|cv|curriculum)\b/.test(a)&&!/\bcover\b/.test(a)});return t||(e.length===1?e[0]:e.find(i=>!/\bcover\b/.test(ue(i)))||null)}function We(){return _e().find(e=>{const t=ue(e);return/\bcover\s*(letter)?\b/.test(t)})||null}function Xe(e,t){var i;try{const a=new DataTransfer;return a.items.add(t),e.files=a.files,e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),(((i=e.files)==null?void 0:i.length)??0)>0}catch{return!1}}const Ze=650,et=180,Pe="#9ca3af",Ie="hireiq-autofill-styles";function ne(){if(document.getElementById(Ie))return;const e=document.createElement("style");e.id=Ie,e.textContent=`
    [data-hiq-state="provisional"] {
      color: ${Pe} !important;
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
  `,(document.head||document.documentElement).appendChild(e)}function tt(e){return new Promise(t=>setTimeout(t,e))}function ze(e){if(e.labels&&e.labels[0])return e.labels[0].innerText.replace(/\s+/g," ").trim();const t=e.getAttribute("aria-label");if(t)return t.trim();const i=e.getAttribute("placeholder");return i?i.trim():e.name||e.id||e.type||"field"}function nt(e){if(e.required)return!0;const t=ze(e);return/\*\s*$/.test(t)||/\brequired\b/i.test(t)}function ie(e,t){var r;const i=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,a=Object.getOwnPropertyDescriptor(i,"value");(r=a==null?void 0:a.set)==null||r.call(e,t),e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),e.dispatchEvent(new KeyboardEvent("keyup",{bubbles:!0}))}function it(){return Array.from(document.querySelectorAll("input, textarea, select")).filter(e=>!(!(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement)||e instanceof HTMLInputElement&&e.type==="hidden"))}function ot(e,t,i){return(e.name||e.id||t||`field_${i}`).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,80)||`field_${i}`}function at(e){return{name:e.name||"",id:e.id||"",type:e instanceof HTMLInputElement?e.type:e.tagName.toLowerCase(),label:ze(e),placeholder:e.getAttribute("placeholder")||"",autocomplete:e.getAttribute("autocomplete")||""}}function P(e){ne(),e instanceof HTMLElement&&(e.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"}),e.classList.add("hiq-flash-green"),window.setTimeout(()=>e.classList.remove("hiq-flash-green"),Ze))}function be(){const e=[],t=new Set;let i=0;for(const a of it()){const r=at(a),u=Ye(r);if(u==="skip")continue;let p=ot(a,r.label,i++);t.has(p)&&(p=`${p}_${i}`),t.add(p),e.push({key:p,el:a,label:r.label.slice(0,200),required:nt(a),kind:u,inputType:r.type,value:(a.value||"").trim()})}return e}function Fe(e){const t=[];let i=0,a=0,r=0,u=0;for(const p of be()){const $=je(p.kind,e);p.kind!=="unknown"&&!!$&&(a+=1),p.required&&(u+=1);const q=!!p.value;q&&(i+=1,p.required&&(r+=1)),(p.kind!=="unknown"||p.required)&&t.push({kind:p.kind,label:p.label.slice(0,80),required:p.required,filled:q,value:q?p.value.slice(0,60):""})}return{items:t,filledCount:i,fillableCount:a,requiredFilled:r,requiredTotal:u}}async function rt(e,t){var r;ne();const i=(t==null?void 0:t.delayMs)??et,a=be();for(const u of a){if(u.kind==="unknown"||u.kind==="skip")continue;const p=je(u.kind,e);!p||(u.el.value||"").trim()||(P(u.el),ie(u.el,p),(r=t==null?void 0:t.onField)==null||r.call(t,u.label),await tt(i))}return Fe(e)}function te(e){return e?Fe(e):{items:[],filledCount:0,fillableCount:0,requiredFilled:0,requiredTotal:0}}function st(){return be().filter(e=>{if(e.kind==="skip"||e.value)return!1;const t=e.inputType.toLowerCase();return!(t==="file"||t==="password"||t==="hidden")})}function Ae(e,t){ne(),ie(e,t),e.setAttribute("data-hiq-state","provisional"),e.style.color=Pe}function lt(e,t){ne(),typeof t=="string"&&ie(e,t),e.setAttribute("data-hiq-state","accepted"),e.style.color="",P(e),window.setTimeout(()=>{e.getAttribute("data-hiq-state")==="accepted"&&(e.style.outline="")},1200)}function ct(e){e.getAttribute("data-hiq-state")==="provisional"&&ie(e,""),e.removeAttribute("data-hiq-state"),e.style.color="",e.style.outline=""}function Se(){return Ve()}function Te(){return We()}function dt(e,t){return Xe(e,t)}async function T(e,t){return chrome.runtime.sendMessage({type:"HIREIQ_FETCH",url:e,init:t})}async function B(){const e=await chrome.runtime.sendMessage({type:"HIREIQ_GET_BEARER"});if(!(e!=null&&e.ok)||!e.token)throw new Error((e==null?void 0:e.error)||"Sign in with Google in the HireIQ popup first");return e.token}function ut(e,t,i){const a=atob(e),r=new Uint8Array(a.length);for(let u=0;u<a.length;u++)r[u]=a.charCodeAt(u);return new File([r],t,{type:i})}function pt(e){const t=e.text.replace(/\s+/g," ").slice(0,8e3).toLowerCase(),i=e.passwordCount>0,a=e.applyFieldCount,r=/create (an )?account|sign up|register|new user|join (us|now)|don't have an account|create your profile/i.test(t),u=/sign in|log in|already have an account|welcome back|forgot (your )?password/i.test(t);return i&&r&&a<2?{needsAccount:!0,kind:"signup",reason:"This page asks you to create an account before applying."}:i&&u&&a<2?{needsAccount:!0,kind:"login",reason:"This page asks you to sign in to the employer site."}:e.passwordCount>=2&&a<2?{needsAccount:!0,kind:"signup",reason:"Looks like an account registration form."}:{needsAccount:!1,kind:a>0?"apply":"unknown",reason:"Application form detected (or unknown page)."}}function Be(e){var r;const t=((r=e.body)==null?void 0:r.innerText)||"",i=e.querySelectorAll('input[type="password"]').length,a=e.querySelectorAll('input[name="first_name"], input[name="last_name"], input[name="resume"], textarea[name="cover_letter"], #first_name, #last_name').length;return pt({text:t,passwordCount:i,applyFieldCount:a})}const ft=["linkedin.com","indeed.com"];function Ce(e){try{const t=new URL(e).hostname.toLowerCase();return ft.some(i=>t===i||t.endsWith(`.${i}`))}catch{return!0}}function bt(e){const t=e.toLowerCase().replace(/\s+/g," ").trim();return!t||/\b(cancel|back|upload|attach|delete|remove|sign out|log out)\b/i.test(t)?0:/submit (your )?application|send application|apply for this job/i.test(t)||/^submit application$/i.test(t)?100:/^submit$/i.test(t)?85:/^apply( now)?$/i.test(t)?80:/submit application/i.test(t)?95:/^(continue|next|save and continue|review)$/i.test(t)?35:/\bsubmit\b/i.test(t)?60:0}function mt(e){var a;if(e instanceof HTMLInputElement||e instanceof HTMLButtonElement){const r=(e.value||"").trim();if(r)return r}const t=(a=e.getAttribute("aria-label"))==null?void 0:a.trim();return t||(e.innerText||e.textContent||"").replace(/\s+/g," ").trim().slice(0,120)}function Le(e=document){const t=[...e.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"], a.button, a[class*="btn"]')];let i=null;for(const a of t){if(a instanceof HTMLInputElement&&a.type==="hidden")continue;const r=a.getBoundingClientRect();if(r.width<2&&r.height<2||a.disabled)continue;const u=mt(a),p=bt(u);p<=0||(!i||p>i.score)&&(i={el:a,label:u,score:p})}return i}function ht(e){e.el.scrollIntoView({behavior:"smooth",block:"center"}),e.el.style.outline="3px solid #0d9488",e.el.style.outlineOffset="3px",e.el.click()}const pe="hireiq-panel-root";function D(){var q,z,J,G,L,F,M,N,K,Y,V;const e=location.href,i=((z=(q=document.querySelector('meta[property="og:title"]'))==null?void 0:q.getAttribute("content"))==null?void 0:z.trim())||""||((G=(J=document.querySelector("h1"))==null?void 0:J.textContent)==null?void 0:G.trim())||document.title.replace(/\s*[|\-–—].*$/,"").trim()||"Untitled role",a=document.title.match(/\bat\s+(.+?)(?:\s*[|\-–—]|$)/i),r=((L=a==null?void 0:a[1])==null?void 0:L.trim())||"",u=((M=(F=document.querySelector('[data-company], .company, .employer, [class*="companyName"], [class*="CompanyName"], .app-title .company-name'))==null?void 0:F.textContent)==null?void 0:M.trim())||((K=(N=document.querySelector('meta[property="og:site_name"]'))==null?void 0:N.getAttribute("content"))==null?void 0:K.trim())||r||(()=>{var W;const A=document.querySelector("img[alt]");if(A!=null&&A.alt&&!/logo/i.test(A.alt))return A.alt.trim();const R=document.querySelector('a[href="/"] img, header img');return((W=R==null?void 0:R.alt)==null?void 0:W.replace(/\s*logo$/i,"").trim())||""})()||"",p=((V=(Y=document.querySelector('[data-location], .location, [class*="jobLocation"], [class*="JobLocation"], .location-name, .job__location'))==null?void 0:Y.textContent)==null?void 0:V.trim())||"",$=document.querySelector('#content, [data-job-description], .job-description, #job-description, .job__description, [class*="description"], article, main')||document.body;let C=(($==null?void 0:$.textContent)||"").replace(/\s+/g," ").trim().slice(0,2e4);return C.length<40&&(C=`Saved from ${e}`),{url:e,title:i.slice(0,500),company:u.slice(0,500),description:C,location:p.slice(0,500)}}function gt(){var e;(e=document.getElementById(pe))==null||e.remove()}function yt(e,t){return t<=0?0:Math.round(e/t*100)}function vt(e){return e.items.length?e.items.slice(0,12).map(i=>{const a=i.filled?"✓":"○";return`<div class="check ${i.filled?"ok":i.required?"need":"opt"}"><span>${a}</span><span>${m(i.label)}</span></div>`}).join(""):'<div class="muted">No form fields detected yet — scroll to the application form.</div>'}function m(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function wt(){if(document.getElementById(pe))return;const e=document.createElement("div");e.id=pe,e.attachShadow({mode:"open"});const t=e.shadowRoot,i=D();t.innerHTML=`
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
      .submit { display: none; flex-direction: column; gap: 8px; }
      .submit.show { display: flex; }
      .btn.warn { background: #f59e0b; color: #111827; }
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
          <div class="section submit" id="hiq-submit-wrap">
            <h3>Submit</h3>
            <p class="muted" id="hiq-submit-hint" style="margin:0 0 8px;font-size:11px;line-height:1.4">
              You watch the click — HireIQ never submits silently.
            </p>
            <button type="button" class="btn primary" id="hiq-submit" disabled>Submit on this site</button>
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
  `,document.body?document.body.appendChild(e):document.documentElement.appendChild(e);const a=t.getElementById("hiq-status"),r=t.getElementById("hiq-save"),u=t.getElementById("hiq-autofill"),p=t.getElementById("hiq-open"),$=t.getElementById("hiq-gen-resume"),C=t.getElementById("hiq-gen-cover"),q=t.getElementById("hiq-postsave"),z=t.getElementById("hiq-account"),J=t.getElementById("hiq-account-reason"),G=t.getElementById("hiq-ats-email"),L=t.getElementById("hiq-ats-save"),F=t.getElementById("hiq-preview-loading"),M=t.getElementById("hiq-preview"),N=t.getElementById("hiq-edit-profile"),K=t.getElementById("hiq-collapse"),Y=t.getElementById("hiq-expand"),V=t.getElementById("hiq-checks"),A=t.getElementById("hiq-prog-label"),R=t.getElementById("hiq-prog-pct"),W=t.getElementById("hiq-prog-bar"),me=t.getElementById("hiq-review"),X=t.getElementById("hiq-review-list"),he=t.getElementById("hiq-files"),Ne=t.getElementById("hiq-submit-wrap"),x=t.getElementById("hiq-submit"),oe=t.getElementById("hiq-submit-hint"),Re=t.getElementById("hiq-files-body");let I="",ae="",re="",se="",h="",H=null,y=[];function f(n,o=""){a.className=`status${o?` ${o}`:""}`,a.textContent=n}function Ue(n){F.hidden=!0,M.hidden=!1;const o=n.experience.filter(s=>s.title||s.company).map(s=>`${s.title}${s.company?` · ${s.company}`:""}`).slice(0,3).join(" · "),l=(n.skills||[]).slice(0,6).map(s=>`<span class="chip">${m(s)}</span>`).join("");M.innerHTML=`
      <div><b>Name</b><span>${m(n.fullName)}</span></div>
      ${n.headline?`<div><b>Title</b><span>${m(n.headline)}</span></div>`:""}
      <div><b>Email</b><span>${m(n.email)}</span></div>
      <div><b>Phone</b><span>${m(n.phone)}</span></div>
      ${n.location?`<div><b>Loc</b><span>${m(n.location)}</span></div>`:""}
      ${n.linkedin?`<div><b>LinkedIn</b><span>${m(n.linkedin)}</span></div>`:""}
      ${o?`<div><b>Exp</b><span>${m(o)}</span></div>`:""}
      ${l?`<div class="chips">${l}</div>`:""}
    `,N.hidden=!se}function U(n){const o=n.requiredTotal||n.fillableCount||n.items.length,l=n.requiredTotal?n.requiredFilled:n.filledCount,s=yt(l,o);A.textContent=o?`${l}/${o} fields ready`:"Form progress",R.textContent=`${s}%`,W.style.width=`${s}%`,V.innerHTML=vt(n)}async function ge(){const n=await S(),o=await B(),l=await T(`${n.apiBaseUrl.replace(/\/$/,"")}/api/extension/profile`,{headers:{Authorization:`Bearer ${o}`}}),s=l.json||{};if(!l.ok||!s.profile)throw new Error(s.error||l.error||`Profile failed (${l.status})`);return H=s.profile,se=s.profileUrl||"",s.autofillPreview&&Ue(s.autofillPreview),s.profile}async function le(){if(h)return h;const n=await S(),o=await B(),l=D(),s=fe(l.url);if(!s.isJobPage)throw new Error(s.reason);const c=await T(`${n.apiBaseUrl.replace(/\/$/,"")}/api/jobs`,{method:"POST",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json"},body:JSON.stringify(l)}),b=c.json||{};if(!c.ok||!b.jobId)throw new Error(b.error||c.error||`Save failed (${c.status})`);return h=b.jobId,I=b.trackerUrl||"",ae=b.resumeUrl||I,re=b.coverUrl||I,q.classList.add("show"),r.textContent="Saved",r.disabled=!0,xe(),h}function j(){if(O(),!y.length){me.classList.remove("show"),X.innerHTML="";return}me.classList.add("show"),X.innerHTML=y.map((n,o)=>{const l=n.status!=="pending";return`
        <div class="review-card ${l?"done":""}" data-idx="${o}">
          <p class="q">${m(n.label)}${n.manual?' <span class="muted">(you answer)</span>':""}</p>
          <textarea data-idx="${o}" placeholder="${n.manual?"Type your answer…":""}" ${l?"disabled":""}>${m(n.answer)}</textarea>
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
        </div>`}).join("")}function ye(){return y.filter(n=>n.status==="pending").length}function O(){if(Ne.classList.add("show"),Ce(location.href)){x.disabled=!0,x.textContent="Submit yourself on this site",oe.textContent="LinkedIn / Indeed: HireIQ won’t click Submit — finish the application yourself.";return}const n=Le(document),o=ye();if(!n){x.disabled=!0,x.textContent="No submit button found",oe.textContent="Scroll the form — when a Submit / Apply button appears, it shows here.";return}x.disabled=!1,x.className=o?"btn warn":"btn primary",x.textContent=o?`Submit anyway (${o} unanswered)`:`Submit: ${n.label.slice(0,40)}`,oe.textContent=o?"Gray drafts still need Accept / Skip. You can submit anyway if you prefer.":`Ready — clicks “${n.label.slice(0,48)}” on the page while you watch.`}async function Oe(){if(h)try{const n=await S(),o=await B();await T(`${n.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${h}/status`,{method:"PATCH",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json"},body:JSON.stringify({status:"applied",meta:{source:"extension_submit",url:location.href}})})}catch{}}async function ve(n,o,l){const s=await S(),c=await B(),b=await T(`${s.apiBaseUrl.replace(/\/$/,"")}/api/extension/autofill/accept`,{method:"POST",headers:{Authorization:`Bearer ${c}`,"Content-Type":"application/json"},body:JSON.stringify({jobId:h,key:n.key,question:n.label,answer:o,promoteToMaster:!!l})}),v=b.json||{};if(!b.ok)throw new Error(v.error||b.error||`Accept failed (${b.status})`);return{lasting:!!(v.lasting??n.lasting)}}X.addEventListener("click",async n=>{const o=n.target,l=o.closest(".review-card");if(!l)return;const s=Number(l.getAttribute("data-idx")),c=y[s];if(!c)return;if(!o.closest("button")&&!o.closest("textarea")){P(c.el);return}const b=o.getAttribute("data-act");if(!b)return;n.stopPropagation();const v=X.querySelector(`textarea[data-idx="${s}"]`),g=((v==null?void 0:v.value)??c.answer).trim();try{if(b==="edit"){if(!g){f("Enter an answer before saving the edit.","err");return}c.answer=g,Ae(c.el,g),f("Updated draft on the form.","ok");return}if(b==="skip"){ct(c.el),c.status="skipped",c.askPromote=!1,j(),H&&U(te(H)),f("Skipped — field cleared.","");return}if(b==="accept"){if(!g){f("Answer is empty — edit or skip.","err");return}lt(c.el,g),c.answer=g,c.status="accepted";const{lasting:w}=await ve(c,g,!1);c.askPromote=w,j(),H&&U(te(H)),f(w?"Accepted. Save to master?":"Accepted.","ok");return}if(b==="promote-yes"){await ve(c,c.answer,!0),c.askPromote=!1,j(),f("Queued for master profile.","ok");return}if(b==="promote-no"){c.askPromote=!1,j();return}}catch(w){f(w instanceof Error?w.message:"Review action failed","err")}});async function we(n){if(!h)return;const o=n==="resume"?Se():Te();if(!o)return;const l=await S(),s=await B(),c=l.apiBaseUrl.replace(/\/$/,""),b=await T(`${c}/api/extension/jobs/${h}/pdf?type=${n}`,{method:"GET",headers:{Authorization:`Bearer ${s}`,Accept:"application/pdf"},responseType:"base64"}),v=b.json||{};if(b.base64&&b.ok){const g=n==="resume"?"HireIQ-resume.pdf":"HireIQ-cover.pdf",w=ut(b.base64,g,b.contentType||"application/pdf");return{attached:dt(o,w),available:!0}}return{attached:!1,available:!!v.available}}function Qe(n){const o=[];if(n.hasResumeInput&&(n.resumeAttached?o.push('<div class="muted">Resume PDF attached ✓</div>'):(n.resumeAvailable===!1||!n.resumeAttached)&&o.push(`<a class="btn linkish" id="hiq-gen-attach-resume" href="${m(ae||I)}" target="_blank" rel="noopener">Generate &amp; attach resume</a>`)),n.hasCoverInput&&(n.coverAttached?o.push('<div class="muted">Cover letter PDF attached ✓</div>'):o.push(`<a class="btn linkish" id="hiq-gen-attach-cover" href="${m(re||I)}" target="_blank" rel="noopener">Generate &amp; attach cover</a>`)),!o.length){he.classList.remove("show");return}he.classList.add("show"),Re.innerHTML=o.join("")}K.addEventListener("click",()=>{e.setAttribute("data-collapsed","1")}),Y.addEventListener("click",()=>{e.removeAttribute("data-collapsed")});function Z(n){n&&window.open(n,"_blank","noopener,noreferrer")}function xe(){const n=Be(document);n.needsAccount?(z.classList.add("show"),J.textContent=n.reason):z.classList.remove("show")}L.addEventListener("click",async()=>{const n=G.value.trim();if(!n){f("Enter the email you used on this employer site.","err");return}if(!h){f("Save the job to HireIQ first, then save the ATS email.","err");return}L.disabled=!0;try{const o=await S(),l=await B(),s=await T(`${o.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${h}/ats-account`,{method:"PATCH",headers:{Authorization:`Bearer ${l}`,"Content-Type":"application/json"},body:JSON.stringify({email:n,note:Be(document).kind})}),c=s.json||{};if(!s.ok)throw new Error(c.error||s.error||"Failed to save ATS email");f(`Saved ATS email ${n} for tracking.`,"ok")}catch(o){f(o instanceof Error?o.message:"Failed to save ATS email","err")}finally{L.disabled=!1}}),p.addEventListener("click",()=>Z(I)),$.addEventListener("click",()=>Z(ae||I)),C.addEventListener("click",()=>Z(re||I)),N.addEventListener("click",()=>Z(se)),x.addEventListener("click",async()=>{if(Ce(location.href)){f("Submit this application yourself on LinkedIn / Indeed.","err");return}const n=Le(document);if(!n){f("No Submit / Apply button found on this page.","err"),O();return}const o=ye();if(!(o>0&&!window.confirm(`${o} answer(s) still need Accept or Skip. Submit the employer form anyway?`))){x.disabled=!0,f(`Clicking “${n.label}” on the page…`);try{h||await le(),P(n.el),ht(n),await Oe(),f(`Submitted via “${n.label}”. Marked Applied in HireIQ.`,"ok"),x.textContent="Submitted"}catch(l){f(l instanceof Error?l.message:"Submit failed","err"),x.disabled=!1,O()}}}),r.addEventListener("click",async()=>{r.disabled=!0,f("Saving to HireIQ…");try{await le();const n=[D().title,D().company].filter(Boolean);f(`Saved${n.length?`: ${n.join(" · ")}`:""}. Next: Autofill or generate docs.`,"ok")}catch(n){f(n instanceof Error?n.message:"Save failed","err"),r.disabled=!1}}),u.addEventListener("click",async()=>{var n;u.disabled=!0,y=[],j();try{f("Saving job…"),await le();const o=H||await ge();f("Filling known fields…");const l=await rt(o,{onField:d=>f(`Filling: ${d.slice(0,40)}…`)});U(l);const s=st().slice(0,25),c=s.filter(d=>!qe(d.label)),b=s.filter(d=>qe(d.label));if(c.length){f(`Drafting ${c.length} unanswered questions…`);const d=await S(),Je=await B(),de=D(),ee=await T(`${d.apiBaseUrl.replace(/\/$/,"")}/api/extension/autofill/drafts`,{method:"POST",headers:{Authorization:`Bearer ${Je}`,"Content-Type":"application/json"},body:JSON.stringify({jobId:h,title:de.title,company:de.company,description:de.description.slice(0,4e3),fields:c.map(_=>({key:_.key,label:_.label,required:_.required,inputType:_.inputType}))})}),$e=ee.json||{};if(!ee.ok)f($e.error||ee.error||`Drafts failed (${ee.status}) — known fields still filled.`,"err");else{const _=new Map(($e.drafts||[]).map(k=>[k.key,k]));for(const k of c){const E=_.get(k.key);if(!E||E.skip||!((n=E.answer)!=null&&n.trim())){y.push({key:k.key,label:k.label,answer:"",lasting:!!(E!=null&&E.lasting),el:k.el,status:"pending",askPromote:!1,manual:!0});continue}Ae(k.el,E.answer.trim()),y.push({key:k.key,label:k.label,answer:E.answer.trim(),lasting:!!E.lasting,el:k.el,status:"pending",askPromote:!1})}}}for(const d of b)y.push({key:d.key,label:d.label,answer:"",lasting:!1,el:d.el,status:"pending",askPromote:!1,manual:!0});j(),U(te(o));const v=Se(),g=Te();let w=!1,Q=!1,ke=!1,Ee=!1;if(v){f("Attaching resume PDF…");const d=await we("resume");w=!!(d!=null&&d.attached),ke=!!(d!=null&&d.available||d!=null&&d.attached),w&&P(v)}if(g){f("Attaching cover letter PDF…");const d=await we("cover");Q=!!(d!=null&&d.attached),Ee=!!(d!=null&&d.available||d!=null&&d.attached),Q&&P(g)}Qe({hasResumeInput:!!v,hasCoverInput:!!g,resumeAttached:w,coverAttached:Q,resumeAvailable:ke,coverAvailable:Ee});const ce=[l.filledCount?`${l.filledCount} known`:"",y.length?`${y.length} to review`:"",w?"resume attached":"",Q?"cover attached":""].filter(Boolean),De=y.some(d=>!d.manual)?" Gray drafts need Accept before submit.":y.length?" Answer the remaining questions in the panel.":"";f(ce.length?`Autofill done: ${ce.join(" · ")}.${De}`:"No matching fields found on this page.",ce.length?"ok":"err"),O()}catch(o){f(o instanceof Error?o.message:"Autofill failed","err")}finally{u.disabled=!1}}),xe(),O(),(async()=>{try{const n=await ge();U(te(n))}catch{F.textContent="Connect HireIQ in the popup to load master resume."}})()}function He(){if(!fe(location.href).isJobPage){gt();return}wt()}function Me(){He();let e=location.href;setInterval(()=>{location.href!==e&&(e=location.href,He())},800),chrome.runtime.sendMessage({type:"HIREIQ_DETECT",detect:fe(location.href)}).catch(()=>{})}function kt(){Me()}Me();export{kt as onExecute};
