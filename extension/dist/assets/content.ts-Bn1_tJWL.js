import{b as Vt,c as Gt,e as Wt,f as Yt,h as Xt,i as Zt,a as Ce,g as R}from"./settings-DPYkOz-3.js";const en=/\b(back to jobs|create a job alert|quick apply|mygreenhouse|cookie|privacy policy|equal opportunity|eeo)\b/gi;function tn(e,t){const n=t.match(/\bat\s+(.+)$/i);if(n!=null&&n[1])return n[1].replace(/\s*[|\-–—].*$/,"").trim();const i=e.match(/\bat\s+(.+)$/i);return i!=null&&i[1]?i[1].trim():""}function nn(e){const t=["#content",".job__description",".job-post-content",'[data-qa="job-description"]',".posting-page",".posting",'[class*="JobDescription"]',"[data-job-description]",".job-description","#job-description","div#app_body","article"];let n=null;for(const f of t){const y=e.querySelector(f);if(y&&(y.textContent||"").trim().length>80){n=y;break}}n||(n=e.querySelector("main")||e.body);const i=n.cloneNode(!0);i.querySelectorAll('nav, header, footer, script, style, noscript, iframe, button, form, [class*="cookie"], [class*="alert"]').forEach(f=>f.remove());const s=[],r=f=>{const y=f.replace(en," ").replace(/[ \t]+/g," ").trim();y.length>2&&s.push(y)},u=i.querySelectorAll("p, li, h1, h2, h3, h4, section");u.length>3?u.forEach(f=>r(f.textContent||"")):(i.innerText||i.textContent||"").replace(/\r\n?/g,`
`).split(/\n+/).forEach(r);const b=[];for(const f of s)b[b.length-1]!==f&&(/^(apply|back|jobs?|careers?)$/i.test(f)||b.push(f));return b.join(`

`).slice(0,2e4)}function on(e=document){var I,$,E,S,q,_,J,se,le,ce;const n=typeof location<"u"?location.href:"",i=(($=(I=e.querySelector('meta[property="og:title"]'))==null?void 0:I.getAttribute("content"))==null?void 0:$.trim())||"",s=((S=(E=e.querySelector("h1"))==null?void 0:E.textContent)==null?void 0:S.trim())||"",r=e.title||"";let u=s||i||r.replace(/\s*[|\-–—].*$/,"").trim()||"Untitled role";u=u.replace(/\s+at\s+.+$/i,"").trim()||u;const b=((_=(q=e.querySelector('[data-company], .company, .employer, [class*="companyName"]'))==null?void 0:q.textContent)==null?void 0:_.trim())||((se=(J=e.querySelector('meta[property="og:site_name"]'))==null?void 0:J.getAttribute("content"))==null?void 0:se.trim())||tn(i||s,r)||"",f=((ce=(le=e.querySelector('[data-location], .location, [class*="jobLocation"], .job__location, .app-location'))==null?void 0:le.textContent)==null?void 0:ce.trim())||"";let y=nn(e);return y.length<40&&(y=`Saved from ${n}`),{url:n,title:u.slice(0,500),company:b.slice(0,500),description:y,location:f.slice(0,500)}}const an=[/\brace\b/i,/ethnic/i,/\bgender\b/i,/\bsex\b/i,/veteran/i,/military/i,/disabilit/i,/\blgbt/i,/religion/i,/convict/i,/criminal/i,/felony/i,/misdemeanor/i,/salary/i,/compensation/i,/\bwage\b/i,/pay\s*rate/i,/authorized to work/i,/work authorization/i,/work\s*auth/i,/\bvisa\b/i,/citizenship/i,/sponsorship/i,/\bssn\b/i,/social security/i,/date of birth/i,/\bdob\b/i,/\bage\b/i];function ot(e){const t=(e||"").trim();return t?an.some(n=>n.test(t)):!1}function rn(e){return e.toLowerCase().replace(/[_\-]+/g," ").replace(/\s+/g," ").trim()}function sn(e,t){const n=(e.type||"").toLowerCase();if(n==="hidden"||n==="submit"||n==="button"||n==="checkbox"||n==="radio"||n==="file")return"skip";const i=(t==null?void 0:t.board)??(t!=null&&t.hostname?Vt(t.hostname):"generic"),s=Gt(e,i);if(s)return s;const r=rn([e.name,e.id,e.label,e.placeholder,e.autocomplete].filter(Boolean).join(" "));return r?/\b(password|captcha|csrf|token|honeypot)\b/.test(r)||/\b(cover\s*letter|resume|cv|attach)\b/.test(r)&&n==="file"?"skip":n==="email"||/\b(e[\s-]?mail|emailaddress)\b/.test(r)?"email":n==="tel"||/\b(phone|mobile|cell|tel)\b/.test(r)?"phone":/\b(preferred\s*(first\s*)?name|pref\s*name|nickname)\b/.test(r)?"preferred_name":/\b(first\s*name|fname|given\s*name)\b/.test(r)||e.autocomplete==="given-name"?"first_name":/\b(last\s*name|lname|surname|family\s*name)\b/.test(r)||e.autocomplete==="family-name"?"last_name":/^(name|full name)$/.test(r)?"unknown":/\blinkedin\b/.test(r)?"linkedin":/\b(website|portfolio|personal\s*site|github\.com|homepage)\b/.test(r)?"website":/\bcountry\b/.test(r)?"country":/\b(how\s*did\s*you\s*hear|hear\s*about|referral\s*source|source)\b/.test(r)?"how_heard":e.name==="first_name"||e.id==="first_name"?"first_name":e.name==="last_name"||e.id==="last_name"?"last_name":e.name==="preferred_name"?"preferred_name":"unknown":"unknown"}function Ue(e,t){switch(e){case"first_name":return t.firstName||null;case"last_name":return t.lastName||null;case"full_name":return[t.firstName,t.lastName].filter(Boolean).join(" ").trim()||t.preferredName||null;case"preferred_name":return t.preferredName||t.firstName||null;case"email":return t.email||null;case"phone":return t.phone||null;case"linkedin":return t.linkedin||null;case"website":return t.website||null;case"country":return t.country||null;case"how_heard":return t.howHeard||null;default:return null}}function ln(e){return e!=="unknown"&&e!=="skip"}function cn(e){return e==="email"||e==="phone"||e==="linkedin"||e==="website"||e==="first_name"||e==="last_name"||e==="preferred_name"||e==="country"}function un(e,t){return ln(e)&&!Ue(e,t)}function dn(e){switch(e){case"email":return"Add your email…";case"phone":return"Add your phone number…";case"linkedin":return"Add your LinkedIn URL…";case"website":return"Add your website / portfolio…";case"first_name":return"Add your first name…";case"last_name":return"Add your last name…";case"preferred_name":return"Add your preferred name…";case"country":return"Add your country…";case"full_name":return"Add your full name…";case"how_heard":return"How did you hear about this role?";default:return"Type your answer…"}}function Ne(e){const t=[e.name||"",e.id||"",e.getAttribute("aria-label")||""];e.labels&&Array.from(e.labels).forEach(i=>t.push(i.innerText||""));const n=e.closest("div, label, fieldset, li, td");return n&&t.push(n.textContent||""),t.join(" ").toLowerCase().replace(/\s+/g," ")}function bt(){return Array.from(document.querySelectorAll('input[type="file"]')).filter(e=>e instanceof HTMLInputElement)}function pn(){for(const n of Wt()){const i=document.querySelector(n);if(i instanceof HTMLInputElement&&i.type==="file")return i}const e=bt(),t=e.find(n=>{const i=Ne(n);return/\b(resume|cv|curriculum)\b/.test(i)&&!/\bcover\b/.test(i)});return t||(e.length===1?e[0]:e.find(n=>!/\bcover\b/.test(Ne(n)))||null)}function fn(){return bt().find(e=>{const t=Ne(e);return/\bcover\s*(letter)?\b/.test(t)})||null}function mn(e,t){var n;try{const i=new DataTransfer;return i.items.add(t),e.files=i.files,e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),(((n=e.files)==null?void 0:n.length)??0)>0}catch{return!1}}const bn=650,hn=180,ht="#9ca3af",it="hireiq-autofill-styles";function Se(){if(document.getElementById(it))return;const e=document.createElement("style");e.id=it,e.textContent=`
    [data-hiq-state="provisional"] {
      color: ${ht} !important;
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
  `,(document.head||document.documentElement).appendChild(e)}function ee(e){return new Promise(t=>setTimeout(t,e))}function fe(e){if(e.labels&&e.labels[0])return e.labels[0].innerText.replace(/\s+/g," ").trim();const t=e.getAttribute("aria-label");if(t)return t.trim();const n=e.getAttribute("placeholder");return n?n.trim():e.name||e.id||e.type||"field"}function yt(e){if(e.required)return!0;const t=fe(e);return/\*\s*$/.test(t)||/\brequired\b/i.test(t)}function te(e,t){var s;const n=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,i=Object.getOwnPropertyDescriptor(n,"value");(s=i==null?void 0:i.set)==null||s.call(e,t),e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),e.dispatchEvent(new KeyboardEvent("keyup",{bubbles:!0}))}function gt(){try{return typeof location<"u"?location.hostname:""}catch{return""}}function yn(){const e=Yt(gt());for(const t of e.formRootSelectors){const n=document.querySelector(t);if(n&&n.querySelector("input, textarea, select"))return n}return document}function gn(){return Array.from(yn().querySelectorAll("input, textarea, select")).filter(e=>!(!(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement)||e instanceof HTMLInputElement&&e.type==="hidden"||e.getAttribute("aria-hidden")==="true"||e instanceof HTMLInputElement&&e.tabIndex<0&&e.getAttribute("role")!=="combobox"&&!e.getAttribute("data-automation-id")))}function wn(e){return e instanceof HTMLInputElement&&(e.getAttribute("role")==="combobox"||e.classList.contains("select__input")||e.getAttribute("aria-autocomplete")==="list")}function wt(e){const t=e.closest(".select__control")||e.closest('[class*="select__control"]')||e,n=t.getBoundingClientRect(),i=n.left+Math.max(n.width/2,4),s=n.top+Math.max(n.height/2,4);for(const r of["pointerdown","mousedown","pointerup","mouseup","click"])t.dispatchEvent(new MouseEvent(r,{bubbles:!0,cancelable:!0,clientX:i,clientY:s,view:window}));e.focus(),e.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowDown",code:"ArrowDown",bubbles:!0,cancelable:!0}))}function vt(e){e.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:!0,cancelable:!0})),document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:!0,cancelable:!0}))}function Pe(e){var u;const t=e.getAttribute("aria-controls"),n=(t?document.getElementById(t):null)||((u=e.closest(".select-shell"))==null?void 0:u.querySelector('.select__menu, [class*="select__menu"]'))||document.querySelector('.select__menu, [class*="MenuList"]'),i=Array.from(n?n.querySelectorAll('.select__option, [class*="select__option"], [role="option"]'):document.querySelectorAll(`[id^="react-select-${CSS.escape(e.id)}-option"], [role="option"]`)),s=new Set,r=[];for(const b of i){const f=(b.textContent||"").replace(/\s+/g," ").trim();if(!f||/^select(\s*\.{0,3}|(\s+one))?$/i.test(f))continue;const y=f.toLowerCase();s.has(y)||(s.add(y),r.push({value:f,label:f}))}return r}async function xt(e,t){const n=(t==null?void 0:t.maxChoices)??8;wt(e),await ee(220);for(let s=0;s<6&&!(e.getAttribute("aria-expanded")==="true"||Pe(e).length);s++)await ee(80);const i=Pe(e);return vt(e),await ee(80),i.length<2||i.length>n?[]:i}async function vn(e){for(const t of e)if(t.choiceMode==="combobox"&&t.el instanceof HTMLInputElement)try{const n=t.kind==="country"||/\bcountry\b/i.test(t.label)||/\bnationality\b/i.test(t.label),i=await xt(t.el,{maxChoices:n?300:8});i.length>=2&&(t.choices=i)}catch{}}async function kt(e,t){var b;if(!(e instanceof HTMLInputElement))return!1;wt(e),await ee(200);for(let f=0;f<6&&!(e.getAttribute("aria-expanded")==="true"||Pe(e).length);f++)await ee(80);const n=e.getAttribute("aria-controls"),i=(n?document.getElementById(n):null)||((b=e.closest(".select-shell"))==null?void 0:b.querySelector('.select__menu, [class*="select__menu"]'))||document.querySelector(".select__menu"),s=Array.from(i?i.querySelectorAll('.select__option, [class*="select__option"], [role="option"]'):document.querySelectorAll(`[id^="react-select-${CSS.escape(e.id)}-option"]`)),r=t.label.replace(/\s+/g," ").trim().toLowerCase(),u=s.find(f=>(f.textContent||"").replace(/\s+/g," ").trim().toLowerCase()===r);return u instanceof HTMLElement?(u.click(),O(e),await ee(100),!0):(vt(e),!1)}function at(e,t,n){return(e.name||e.id||t||`field_${n}`).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,80)||`field_${n}`}function xn(e){return{name:e.name||"",id:e.id||"",type:e instanceof HTMLInputElement?e.type:e.tagName.toLowerCase(),label:fe(e),placeholder:e.getAttribute("placeholder")||"",autocomplete:e.getAttribute("autocomplete")||"",automationId:e.getAttribute("data-automation-id")||""}}function O(e){Se(),e instanceof HTMLElement&&(e.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"}),e.classList.add("hiq-flash-green"),window.setTimeout(()=>e.classList.remove("hiq-flash-green"),bn))}function kn(e){return Array.from(e.options).filter(t=>!t.disabled).map(t=>({value:t.value,label:(t.label||t.textContent||t.value).replace(/\s+/g," ").trim()})).filter(t=>t.label&&!/^select(\s+one)?$/i.test(t.label)&&t.value!=="")}function En(e){const t=e.closest("label");if(t){const i=t.cloneNode(!0);i.querySelectorAll("input").forEach(r=>r.remove());const s=(i.textContent||"").replace(/\s+/g," ").trim();if(s&&s.length<80)return s}const n=e.nextSibling;if(n&&n.nodeType===Node.TEXT_NODE){const i=(n.textContent||"").replace(/\s+/g," ").trim();if(i)return i}return e.value||"Option"}function An(e){var r,u;const t=Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(e)}"]`)).filter(b=>b instanceof HTMLInputElement),n=t.map(b=>({value:b.value,label:En(b)})),i=t[0],s=i&&(((u=(r=i.closest("fieldset"))==null?void 0:r.querySelector("legend"))==null?void 0:u.textContent)||i.getAttribute("aria-label")||fe(i))||e;return{els:t,choices:n,label:String(s).replace(/\s+/g," ").trim().slice(0,200)||e,required:t.some(b=>yt(b))}}function Et(e,t,n){if(n==="radio"||e instanceof HTMLInputElement&&e.type==="radio"){const i=e.name,s=i?Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(i)}"]`)):[e];for(const r of s){if(!(r instanceof HTMLInputElement))continue;if(r.value===t.value||fe(r).replace(/\s+/g," ").trim().toLowerCase()===t.label.replace(/\s+/g," ").trim().toLowerCase()){r.checked=!0,r.dispatchEvent(new Event("input",{bubbles:!0})),r.dispatchEvent(new Event("change",{bubbles:!0})),r.click(),O(r);return}}return}if(e instanceof HTMLSelectElement){const i=Array.from(e.options).find(s=>s.value===t.value)||Array.from(e.options).find(s=>(s.label||s.textContent||"").replace(/\s+/g," ").trim().toLowerCase()===t.label.replace(/\s+/g," ").trim().toLowerCase());i&&(te(e,i.value),O(e));return}te(e,t.label||t.value),O(e)}function ze(){var s;const e=[],t=new Set,n=new Set;let i=0;for(const r of gn()){if(r instanceof HTMLInputElement&&r.type==="radio"){const E=r.name||r.id;if(!E||n.has(E))continue;n.add(E);const S=An(E);if(S.choices.length<2)continue;let q=at(r,S.label,i++);t.has(q)&&(q=`${q}_${i}`),t.add(q);const _=S.els.find(J=>J.checked);e.push({key:q,el:S.els[0],label:S.label.slice(0,200),required:S.required,kind:"unknown",inputType:"radio",value:_?(_.value||fe(_)).trim():"",choices:S.choices,choiceMode:"radio"});continue}const u=xn(r),b=sn(u,{hostname:gt()});if(b==="skip")continue;let f=at(r,u.label,i++);t.has(f)&&(f=`${f}_${i}`),t.add(f);const y=r instanceof HTMLSelectElement?kn(r):void 0,I=wn(r);let $=(r.value||"").trim();if(I&&!$){const E=(s=r.closest(".select__control, .select-shell"))==null?void 0:s.querySelector('.select__single-value, [class*="singleValue"]');$=((E==null?void 0:E.textContent)||"").replace(/\s+/g," ").trim()}e.push({key:f,el:r,label:u.label.slice(0,200),required:yt(r),kind:b,inputType:I?"combobox":u.type,value:$,...y&&y.length>=2?{choices:y,choiceMode:"select"}:I?{choiceMode:"combobox"}:{}})}return e}function At(e){const t=[];let n=0,i=0,s=0,r=0;for(const u of ze()){const b=Ue(u.kind,e);u.kind!=="unknown"&&!!b&&(i+=1),u.required&&(r+=1);const y=!!u.value;y&&(n+=1,u.required&&(s+=1)),(u.kind!=="unknown"||u.required)&&t.push({kind:u.kind,label:u.label.slice(0,80),required:u.required,filled:y,value:y?u.value.slice(0,60):""})}return{items:t,filledCount:n,fillableCount:i,requiredFilled:s,requiredTotal:r}}async function Cn(e,t){var s,r;Se();const n=(t==null?void 0:t.delayMs)??hn,i=ze();for(const u of i){if(u.kind==="unknown"||u.kind==="skip")continue;const b=Ue(u.kind,e);if(!b)continue;let f=(u.el.value||"").trim();if(!f&&u.choiceMode==="combobox"){const y=(s=u.el.closest(".select__control, .select-shell"))==null?void 0:s.querySelector('.select__single-value, [class*="singleValue"]');f=((y==null?void 0:y.textContent)||"").replace(/\s+/g," ").trim()}if(!f){if(O(u.el),u.choiceMode==="combobox"){const y=u.kind==="country"||/\bcountry\b/i.test(u.label),I=await xt(u.el,{maxChoices:y?300:8}),$=I.find(E=>E.label.toLowerCase()===b.toLowerCase())||I.find(E=>E.label.toLowerCase().includes(b.toLowerCase()))||I.find(E=>b.toLowerCase().includes(E.label.toLowerCase()));$?await kt(u.el,$):te(u.el,b)}else u.choiceMode==="select"&&u.el instanceof HTMLSelectElement?Et(u.el,{value:b,label:b},"select"):te(u.el,b);(r=t==null?void 0:t.onField)==null||r.call(t,u.label),await ee(n)}}return At(e)}function ae(e){return e?At(e):{items:[],filledCount:0,fillableCount:0,requiredFilled:0,requiredTotal:0}}function In(){return ze().filter(e=>{if(e.kind==="skip"||e.value)return!1;const t=e.inputType.toLowerCase();return!(t==="file"||t==="password"||t==="hidden")})}function rt(e,t){Se(),te(e,t),e.setAttribute("data-hiq-state","provisional"),e.style.color=ht}function Ae(e,t){Se(),typeof t=="string"&&te(e,t),e.setAttribute("data-hiq-state","accepted"),e.style.color="",O(e),window.setTimeout(()=>{e.getAttribute("data-hiq-state")==="accepted"&&(e.style.outline="")},1200)}function $n(e){e.getAttribute("data-hiq-state")==="provisional"&&te(e,""),e.removeAttribute("data-hiq-state"),e.style.color="",e.style.outline=""}function Y(){return pn()}function re(){return fn()}function Sn(e,t){return mn(e,t)}function Ct(e){const t=e instanceof Error?e.message:String(e||"");return/extension context invalidated/i.test(t)||/context invalidated/i.test(t)}function X(e){return Ct(e)?"HireIQ was updated — refresh this tab, then try again.":e instanceof Error?e.message:String(e||"Something went wrong")}async function It(e){try{return await chrome.runtime.sendMessage(e)}catch(t){throw Ct(t)?new Error("HireIQ was updated — refresh this tab, then try again."):t}}async function F(e,t){return It({type:"HIREIQ_FETCH",url:e,init:t})}async function U(){const e=await It({type:"HIREIQ_GET_BEARER"});if(!(e!=null&&e.ok)||!e.token)throw new Error((e==null?void 0:e.error)||"Sign in with Google in the HireIQ popup first");return e.token}function qn(e,t,n){const i=atob(e),s=new Uint8Array(i.length);for(let r=0;r<i.length;r++)s[r]=i.charCodeAt(r);return new File([s],t,{type:n})}const Ln=/^(continue|next|proceed|save and continue|save & continue|continue application|go to application|start application)$/i,Tn=/\b(continue|next step|proceed|save and continue|save & continue)\b/i;function st(e){if(!(e instanceof HTMLElement)||(e instanceof HTMLButtonElement||e instanceof HTMLInputElement)&&e.disabled)return!1;const t=window.getComputedStyle(e);if(t.display==="none"||t.visibility==="hidden")return!1;const n=e.getBoundingClientRect();return n.width===0&&n.height===0&&!e.offsetParent&&e.tagName!=="BODY"?t.display!=="none"&&t.visibility!=="hidden":n.width>2&&n.height>2}function Re(e){return e instanceof HTMLInputElement&&(e.type==="submit"||e.type==="button")?(e.value||"").trim():(e.textContent||e.getAttribute("aria-label")||"").replace(/\s+/g," ").trim()}function Bn(e){const t=Re(e);if(!t)return 0;let n=0;return Ln.test(t)?n+=10:Tn.test(t)&&(n+=6),(e instanceof HTMLButtonElement||e instanceof HTMLInputElement)&&(n+=2),e.getAttribute("type")==="submit"&&(n+=1),n}function Ie(e){for(const i of Xt()){const s=e.querySelector(i);if(s instanceof HTMLElement&&st(s))return{el:s,label:Re(s)||"Continue"}}const t=Array.from(e.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"]')).filter(st);let n=null;for(const i of t){const s=Bn(i);if(s<=0)continue;const r=Re(i);(!n||s>n.score)&&(n={el:i,label:r,score:s})}return n?{el:n.el,label:n.label}:null}function Hn(e){e.el.scrollIntoView({block:"center",behavior:"smooth"}),e.el.click()}function _n(e=16){const t="abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";let n="";for(let i=0;i<e;i++)n+=t[Math.floor(Math.random()*t.length)];return n}function Z(e,t){e.focus(),e.value=t,e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0}))}function Mn(e,t){const n=[],i=['input[type="email"]','input[name*="email" i]','input[id*="email" i]','input[autocomplete="email"]'],s=Array.from(e.querySelectorAll('input[type="password"]')),r=['input[name*="first" i]','input[id*="first" i]','input[autocomplete="given-name"]'],u=['input[name*="last" i]','input[id*="last" i]','input[autocomplete="family-name"]'];for(const b of i){const f=e.querySelector(b);if(f instanceof HTMLInputElement&&!f.value.trim()){Z(f,t.email),n.push("email");break}}for(const b of r){const f=e.querySelector(b);if(f instanceof HTMLInputElement&&!f.value.trim()){Z(f,t.firstName),n.push("firstName");break}}for(const b of u){const f=e.querySelector(b);if(f instanceof HTMLInputElement&&!f.value.trim()){Z(f,t.lastName),n.push("lastName");break}}return s.length>0&&!s[0].value.trim()&&(Z(s[0],t.password),n.push("password")),s.length>1&&!s[1].value.trim()&&(Z(s[1],t.password),n.push("confirmPassword")),n}function jn(e,t){const n=['input[name*="code" i]','input[id*="code" i]','input[name*="otp" i]','input[autocomplete="one-time-code"]','input[inputmode="numeric"]'];for(const s of n){const r=e.querySelector(s);if(r instanceof HTMLInputElement)return Z(r,t),!0}const i=Array.from(e.querySelectorAll('input[maxlength="1"]'));if(i.length>=4&&i.length<=8){for(let s=0;s<Math.min(t.length,i.length);s++)Z(i[s],t[s]);return!0}return!1}function Nn(e){const t=e.text.replace(/\s+/g," ").slice(0,8e3).toLowerCase(),n=e.passwordCount>0,i=e.applyFieldCount,s=/create (an )?account|sign up|register|new user|join (us|now)|don't have an account|create your profile/i.test(t),r=/sign in|log in|already have an account|welcome back|forgot (your )?password/i.test(t);return n&&s&&i<2?{needsAccount:!0,kind:"signup",reason:"This page asks you to create an account before applying."}:n&&r&&i<2?{needsAccount:!0,kind:"login",reason:"This page asks you to sign in to the employer site."}:e.passwordCount>=2&&i<2?{needsAccount:!0,kind:"signup",reason:"Looks like an account registration form."}:{needsAccount:!1,kind:i>0?"apply":"unknown",reason:"Application form detected (or unknown page)."}}function $e(e){var s;const t=((s=e.body)==null?void 0:s.innerText)||"",n=e.querySelectorAll('input[type="password"]').length,i=e.querySelectorAll('input[name="first_name"], input[name="last_name"], input[name="resume"], textarea[name="cover_letter"], #first_name, #last_name').length;return Nn({text:t,passwordCount:n,applyFieldCount:i})}async function Pn(e){const t=Ie(document);return t?(Hn(t),e.onStatus(`Clicked “${t.label}”. Waiting for the next step…`),await e.sleep(1500),!0):(e.onStatus("No Continue / Next button found on this page.","err"),!1)}async function Rn(e,t){const n=$e(document);if(!n.needsAccount)return e.onStatus("No signup wall detected on this page.","err"),!1;if(!e.applyIdentity.canCreateAccount||!e.applyIdentity.applyEmail)return e.onStatus(e.applyIdentity.panelBody,"err"),!1;const i=_n();if(!Mn(document,{email:e.applyIdentity.applyEmail,firstName:e.firstName,lastName:e.lastName,password:i}).includes("email"))return e.onStatus("Could not find email field on this signup form.","err"),!1;e.onStatus(`Filled signup with ${e.applyIdentity.applyEmail}. Submit the form or we will try Continue…`),await e.savePortalCredentials(t,e.applyIdentity.applyEmail,i,`agentic:${n.kind}`);const r=Ie(document),u=(r==null?void 0:r.el)||document.querySelector('button[type="submit"], input[type="submit"]');u&&(u.click(),await e.sleep(2e3));for(let b=0;b<8;b++){const f=await e.fetchVerificationCode(t);if(f.code&&jn(document,f.code)){e.onStatus(`Entered verification code from ${e.applyIdentity.mode} inbox.`,"ok");const I=Ie(document),$=(I==null?void 0:I.el)||document.querySelector('button[type="submit"], input[type="submit"]');return $==null||$.click(),await e.sleep(1500),!0}await e.sleep(3e3)}return e.onStatus("Account fields saved. Verification code not found yet — check your inbox or timeline.","err"),!1}async function lt(e,t){return $e(document).needsAccount&&e.applyIdentity.canCreateAccount?(await Rn(e,t),"signup"):Ie(document)?(await Pn(e),"continue"):"noop"}function $t(e){return e.replace(/\s+/g," ").trim().toLowerCase()}function Fn(e){const t=$t(e);return t?/\bif\s+yes\b/.test(t)||/\bif\s+so\b/.test(t)||/\bplease\s+(explain|describe|specify|elaborate|provide)\b/.test(t)||/\bexplain\b/.test(t)||/\badditional\s+(details?|info|information|comments?)\b/.test(t)||/\bcomments?\b/.test(t)||/\bdetails?\b/.test(t)||/\bwhy\b/.test(t)||/\bdescribe\b/.test(t):!1}function Un(e){const t=$t(e);return/^(no|n|false|none|not applicable|n\/a)$/.test(t)}const je="N/A";function ct(e,t){const n=e.replace(/\s+/g," ").trim().toLowerCase();if(!n||!t.length)return null;const i=t.find(r=>r.label.toLowerCase()===n||r.value.toLowerCase()===n)||null;if(i)return i;const s=t.find(r=>r.label.toLowerCase().startsWith(n)||r.value.toLowerCase().startsWith(n))||null;return s||t.find(r=>r.label.toLowerCase().includes(n)||r.value.toLowerCase().includes(n))||null}const zn=["linkedin.com","indeed.com"];function ut(e){try{const t=new URL(e).hostname.toLowerCase();return zn.some(n=>t===n||t.endsWith(`.${n}`))}catch{return!0}}function dt(e){const t=e.toLowerCase().replace(/\s+/g," ").trim();return!t||/\b(cancel|back|upload|attach|delete|remove|sign out|log out)\b/i.test(t)?0:/submit (your )?application|send application|apply for this job/i.test(t)||/^submit application$/i.test(t)?100:/^submit$/i.test(t)?85:/^apply( now)?$/i.test(t)?80:/submit application/i.test(t)?95:/^(continue|next|save and continue|review)$/i.test(t)?35:/\bsubmit\b/i.test(t)?60:0}function pt(e){var i;if(e instanceof HTMLInputElement||e instanceof HTMLButtonElement){const s=(e.value||"").trim();if(s)return s}const t=(i=e.getAttribute("aria-label"))==null?void 0:i.trim();return t||(e.innerText||e.textContent||"").replace(/\s+/g," ").trim().slice(0,120)}function ft(e=document){let t=null;for(const i of Zt())for(const s of Array.from(e.querySelectorAll(i))){if(!(s instanceof HTMLElement)||s instanceof HTMLInputElement&&s.type==="hidden")continue;const r=s.getBoundingClientRect();if(!(r.width<2&&r.height<2&&s.offsetParent===null)){if(r.width<2&&r.height<2)continue}if(s.disabled)continue;const u=pt(s),b=Math.max(dt(u),90);(!t||b>t.score)&&(t={el:s,label:u||i,score:b})}const n=[...e.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"], a.button, a[class*="btn"]')];for(const i of n){if(i instanceof HTMLInputElement&&i.type==="hidden")continue;const s=i.getBoundingClientRect();if(s.width<2&&s.height<2||i.disabled)continue;const r=pt(i),u=dt(r);u<=0||(!t||u>t.score)&&(t={el:i,label:r,score:u})}return t}function On(e){e.el.scrollIntoView({behavior:"smooth",block:"center"}),e.el.style.outline="3px solid #0d9488",e.el.style.outlineOffset="3px",e.el.click()}const Fe="hireiq-panel-root";function pe(){return on(document)}function Qn(){var e;(e=document.getElementById(Fe))==null||e.remove()}function Dn(e,t){return t<=0?0:Math.round(e/t*100)}function Jn(e){return e.items.length?e.items.slice(0,12).map(n=>{const i=n.filled?"✓":"○";return`<div class="check ${n.filled?"ok":n.required?"need":"opt"}"><span>${i}</span><span>${A(n.label)}</span></div>`}).join(""):'<div class="muted">No form fields detected yet — scroll to the application form.</div>'}function A(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Kn(e){return e==="apply"?"Apply page":e==="posting"?"Job posting":""}function Vn(){if(document.getElementById(Fe))return;const e=document.createElement("div");e.id=Fe,e.attachShadow({mode:"open"});const t=e.shadowRoot,n=pe(),i=Ce(location.href,document),s=Kn(i.pageKind);t.innerHTML=`
    <style>
      :host { all: initial; }
      .dock {
        position: fixed;
        z-index: 2147483646;
        top: 0;
        right: 0;
        height: 100vh;
        width: min(360px, 92vw);
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
        padding: 10px 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      .brand {
        font-weight: 700;
        font-size: 14px;
        letter-spacing: -0.02em;
      }
      .brand span { color: #0d9488; }
      .iconbtn {
        appearance: none;
        border: 0;
        background: #f1f5f9;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 15px;
        line-height: 1;
      }
      .body {
        flex: 1;
        overflow: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .jobcard {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px 12px;
        background: #f8fafc;
      }
      .company {
        font-size: 11px;
        color: #64748b;
        margin: 0 0 2px;
      }
      .title {
        font-size: 14px;
        font-weight: 650;
        line-height: 1.35;
        margin: 0;
      }
      .page-kind {
        margin: 6px 0 0;
        font-size: 11px;
        color: #94a3b8;
      }
      .btn {
        appearance: none;
        border: 0;
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 13px;
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
      .btn.secondary:disabled { opacity: 0.55; cursor: default; }
      .btn.linkish {
        background: transparent;
        color: #0d9488;
        border: 0;
        padding: 6px;
        font-size: 12px;
      }
      .btn.sm {
        padding: 5px 8px;
        font-size: 11px;
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
      .stack { display: flex; flex-direction: column; gap: 6px; }
      .row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
      .actions-row {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }
      .actions-row .btn { width: auto; flex: 1; min-width: 0; }
      .saved-chip {
        display: inline-flex;
        align-items: center;
        font-size: 11px;
        font-weight: 650;
        padding: 4px 10px;
        border-radius: 999px;
        background: #ccfbf1;
        color: #0f766e;
        white-space: nowrap;
      }
      .saved-chip[hidden] { display: none !important; }
      .progress {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px;
      }
      .progress-top {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 6px;
      }
      .bar {
        height: 6px;
        border-radius: 99px;
        background: #e2e8f0;
        overflow: hidden;
      }
      .bar > i {
        display: block;
        height: 100%;
        background: #0d9488;
        width: 0%;
      }
      .fields-details {
        margin-top: 6px;
      }
      .fields-details summary {
        cursor: pointer;
        font-size: 11px;
        color: #64748b;
        list-style: none;
      }
      .fields-details summary::-webkit-details-marker { display: none; }
      .check {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        font-size: 11px;
        padding: 3px 0;
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
        border-radius: 10px;
        padding: 10px;
      }
      .section h3,
      .section-label {
        margin: 0 0 6px;
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      details.section {
        padding: 0;
      }
      details.section > summary {
        cursor: pointer;
        list-style: none;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      details.section > summary::-webkit-details-marker { display: none; }
      details.section > .section-body {
        padding: 0 10px 10px;
      }
      .sum-title {
        font-size: 11px;
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
      .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
      .chip {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 999px;
        background: #f1f5f9;
        color: #475569;
      }
      .postsave { display: none; flex-direction: column; gap: 6px; }
      .postsave.show { display: flex; }
      .account {
        display: none;
        border: 1px solid #fde68a;
        background: #fffbeb;
        border-radius: 10px;
        padding: 10px;
        gap: 6px;
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
      .review { display: none; flex-direction: column; gap: 6px; }
      .review.show { display: flex; }
      .submit { display: none; flex-direction: column; gap: 6px; }
      .submit.show { display: flex; }
      .btn.warn { background: #f59e0b; color: #111827; }
      .review-card {
        border: 1px dashed #fbbf24;
        border-radius: 8px;
        background: #fffbeb;
        overflow: hidden;
      }
      .review-card.done {
        border-style: solid;
        border-color: #e2e8f0;
        background: #f8fafc;
        opacity: 0.85;
      }
      .review-card.open {
        border-style: solid;
      }
      .review-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 10px;
        cursor: pointer;
      }
      .review-card .q {
        font-size: 12px;
        font-weight: 650;
        color: #334155;
        margin: 0;
        flex: 1;
      }
      .review-body {
        display: none;
        flex-direction: column;
        gap: 8px;
        padding: 0 10px 10px;
      }
      .review-card.open .review-body { display: flex; }
      .review-card textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: 56px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px;
        font-size: 12px;
        font-family: inherit;
        color: #0f172a;
        resize: vertical;
      }
      .choice-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        max-height: 160px;
        overflow: auto;
      }
      .choice-filter {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 7px 8px;
        font-size: 12px;
        font-family: inherit;
        color: #0f172a;
      }
      .choice-row .btn.choice {
        flex: 1 1 auto;
        min-width: 72px;
      }
      .choice-row .btn.choice.picked {
        background: #0f766e;
        color: #fff;
        border-color: #0f766e;
      }
      .choice-row .btn.choice[hidden] {
        display: none;
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
      .files .doc-actions {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .resume-slot {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
      }
      .resume-slot:empty { display: none; border: 0; padding: 0; margin: 0; }
      .resume-slot .check {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        font-size: 12px;
        color: #334155;
      }
      .resume-slot .check.ok { color: #047857; }
      .resume-slot .check.need { color: #b45309; }
      .files select {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 7px 8px;
        font-size: 12px;
        background: #fff;
        color: #0f172a;
      }
      .muted { font-size: 12px; color: #64748b; }
      .hint { font-size: 11px; color: #64748b; line-height: 1.4; margin: 0; }

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
            <p class="company" id="hiq-company">${A(n.company||"Job page")}</p>
            <p class="title" id="hiq-title">${A(n.title.slice(0,100))}</p>
            <p class="page-kind" id="hiq-page-kind"${s?"":" hidden"}>${A(s)}</p>
          </div>
          <div class="actions-row">
            <button type="button" class="btn primary" id="hiq-autofill" disabled>Autofill</button>
            <button type="button" class="btn secondary" id="hiq-save">Save to HireIQ</button>
            <span class="saved-chip" id="hiq-saved-chip" hidden>Saved</span>
          </div>
          <div class="account" id="hiq-account">
            <h3 class="section-label" style="color:#92400e;margin:0" id="hiq-account-title">Employer account needed</h3>
            <p id="hiq-account-reason">This site wants you to create / sign in to an account.</p>
            <p id="hiq-account-body">Create the account yourself, or let HireIQ continue when tracking is on.</p>
            <button type="button" class="btn secondary" id="hiq-agentic-continue" hidden>Continue to application</button>
            <button type="button" class="btn primary" id="hiq-agentic-create" hidden>Create account &amp; continue</button>
            <input id="hiq-ats-email" type="email" placeholder="email you used on this site" />
            <button type="button" class="btn secondary" id="hiq-ats-save">Save ATS email</button>
          </div>
          <details class="section" id="hiq-autofill-info" open>
            <summary>
              <span class="sum-title">Autofill Information</span>
              <span class="muted" id="hiq-preview-summary">Sign in to load…</span>
            </summary>
            <div class="section-body">
              <div class="muted" id="hiq-preview-loading">Sign in to load master resume…</div>
              <div class="kv" id="hiq-preview" hidden></div>
              <button type="button" class="btn linkish" id="hiq-edit-profile" hidden>Edit master profile →</button>
              <div class="progress" style="margin-top:8px">
                <div class="progress-top">
                  <span id="hiq-prog-label">Form progress</span>
                  <span id="hiq-prog-pct">0%</span>
                </div>
                <div class="bar"><i id="hiq-prog-bar"></i></div>
                <details class="fields-details">
                  <summary>Show fields</summary>
                  <div id="hiq-checks"><div class="muted">Connect HireIQ in the popup, then Autofill.</div></div>
                </details>
              </div>
              <div id="hiq-resume-slot" class="resume-slot"></div>
            </div>
          </details>
          <div class="section review" id="hiq-review">
            <h3>Questions</h3>
            <p class="hint" id="hiq-review-hint">Repetitive ATS questions — pick or type answers here.</p>
            <div id="hiq-review-list"></div>
          </div>
          <div class="section submit" id="hiq-submit-wrap">
            <h3>Submit</h3>
            <p class="hint" id="hiq-submit-hint">You watch the click — HireIQ never submits silently.</p>
            <button type="button" class="btn primary" id="hiq-submit" disabled>Submit on this site</button>
          </div>
          <div class="status" id="hiq-status"></div>
        </div>
      </div>
    </div>
    <button type="button" class="fab" id="hiq-expand">HireIQ</button>
  `,document.body?document.body.appendChild(e):document.documentElement.appendChild(e);const r=t.getElementById("hiq-status"),u=t.getElementById("hiq-save"),b=t.getElementById("hiq-saved-chip"),f=t.getElementById("hiq-autofill"),y=t.getElementById("hiq-account"),I=t.getElementById("hiq-account-title"),$=t.getElementById("hiq-account-reason"),E=t.getElementById("hiq-account-body"),S=t.getElementById("hiq-agentic-continue"),q=t.getElementById("hiq-agentic-create"),_=t.getElementById("hiq-ats-email"),J=t.getElementById("hiq-ats-save"),se=t.getElementById("hiq-preview-loading"),le=t.getElementById("hiq-preview"),ce=t.getElementById("hiq-preview-summary"),Oe=t.getElementById("hiq-edit-profile"),qt=t.getElementById("hiq-collapse"),Lt=t.getElementById("hiq-expand"),Tt=t.getElementById("hiq-checks"),Bt=t.getElementById("hiq-prog-label"),Ht=t.getElementById("hiq-prog-pct"),_t=t.getElementById("hiq-prog-bar"),Qe=t.getElementById("hiq-review"),ne=t.getElementById("hiq-review-list"),Mt=t.getElementById("hiq-resume-slot"),jt=t.getElementById("hiq-submit-wrap"),C=t.getElementById("hiq-submit"),ue=t.getElementById("hiq-submit-hint"),qe=Mt;let K="",De="",Je="",Le="",v="",B=null,me=null,k=[],H=null,M=[],Q="",L={};function m(o,a=""){r.className=`status${a?` ${a}`:""}`,r.textContent=o}function Ke(o){v=o.jobId,K=o.trackerUrl||K,De=o.resumeUrl||K,Je=o.coverUrl||K,u.hidden=!0,b.hidden=!1,f.disabled=!1,ve(),z(),Qt()}function Nt(o){se.hidden=!0,le.hidden=!1;const a=[o.fullName,o.email,o.location].filter(Boolean).join(" · ");ce.textContent=a||"Master profile loaded";const d=o.experience.filter(c=>c.title||c.company).map(c=>`${c.title}${c.company?` · ${c.company}`:""}`).slice(0,3).join(" · "),l=(o.skills||[]).slice(0,6).map(c=>`<span class="chip">${A(c)}</span>`).join("");le.innerHTML=`
      <div><b>Name</b><span>${A(o.fullName)}</span></div>
      ${o.headline?`<div><b>Title</b><span>${A(o.headline)}</span></div>`:""}
      <div><b>Email</b><span>${A(o.email)}</span></div>
      <div><b>Phone</b><span>${A(o.phone)}</span></div>
      ${o.location?`<div><b>Loc</b><span>${A(o.location)}</span></div>`:""}
      ${o.linkedin?`<div><b>LinkedIn</b><span>${A(o.linkedin)}</span></div>`:""}
      ${d?`<div><b>Exp</b><span>${A(d)}</span></div>`:""}
      ${l?`<div class="chips">${l}</div>`:""}
    `,Oe.hidden=!Le}function Te(){return!!(L.hasResumeInput||Y())}function be(){return!!L.resumeAttached}function V(o){let a=o.requiredTotal||o.fillableCount||o.items.length,d=o.requiredTotal?o.requiredFilled:o.filledCount;const l=Te();l&&(a+=1,be()&&(d+=1));const c=Dn(d,a);Bt.textContent=a?`${d}/${a} ready`:"Form progress",Ht.textContent=`${c}%`,_t.style.width=`${c}%`;let h=Jn(o);if(l){const w=be();h+=`<div class="check ${w?"ok":"need"}"><span>${w?"✓":"○"}</span><span>Resume PDF</span></div>`}Tt.innerHTML=h}async function Ve(){const o=await R(),a=await U(),d=await F(`${o.apiBaseUrl.replace(/\/$/,"")}/api/extension/profile`,{headers:{Authorization:`Bearer ${a}`}}),l=d.json||{};if(!d.ok||!l.profile)throw new Error(l.error||d.error||`Profile failed (${d.status})`);return B=l.profile,me=l.applyIdentity??null,Le=l.profileUrl||"",l.autofillPreview&&Nt(l.autofillPreview),ve(),l.profile}function Pt(){return!me||!B?null:{applyIdentity:me,firstName:B.firstName,lastName:B.lastName,sleep:o=>new Promise(a=>setTimeout(a,o)),fetchVerificationCode:async o=>{const a=await R(),d=await U(),l=await F(`${a.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${o}/verification-code`,{headers:{Authorization:`Bearer ${d}`}}),c=l.json||{};return{code:c.code??null,error:c.error||l.error}},savePortalCredentials:async(o,a,d,l)=>{const c=await R(),h=await U();await F(`${c.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${o}/ats-account`,{method:"PATCH",headers:{Authorization:`Bearer ${h}`,"Content-Type":"application/json"},body:JSON.stringify({email:a,password:d,note:l})}),_.value=a},onStatus:(o,a)=>m(o,a||"")}}async function Ge(){if(v)return v;throw new Error("Save this job first")}async function Rt(){if(v)return v;const o=await R(),a=await U(),d=pe(),l=Ce(d.url,document);if(!l.isJobPage)throw new Error(l.reason);const c=await F(`${o.apiBaseUrl.replace(/\/$/,"")}/api/jobs`,{method:"POST",headers:{Authorization:`Bearer ${a}`,"Content-Type":"application/json"},body:JSON.stringify(d)}),h=c.json||{};if(!c.ok||!h.jobId)throw new Error(h.error||c.error||`Save failed (${c.status})`);return Ke({jobId:h.jobId,trackerUrl:h.trackerUrl,resumeUrl:h.resumeUrl,coverUrl:h.coverUrl}),await he(),v}async function Ft(){const o=await R(),a=await U(),d=o.apiBaseUrl.replace(/\/$/,""),l=await F(`${d}/api/extension/jobs/by-url?url=${encodeURIComponent(location.href)}`,{headers:{Authorization:`Bearer ${a}`}}),c=l.json||{};if(!l.ok){m(c.error||l.error||"Could not check saved status","err"),Be();return}c.saved&&c.jobId?(Ke({jobId:c.jobId,trackerUrl:c.trackerUrl,resumeUrl:c.resumeUrl,coverUrl:c.coverUrl}),m("Job already saved — Autofill ready.","ok"),await he()):Be()}function Be(){v="",u.hidden=!1,u.disabled=!1,b.hidden=!0,f.disabled=!0,z(),m("Save this job first"),Dt()}async function he(){var o;if(!v){M=[],Q="";return}try{const a=await R(),d=await U(),l=a.apiBaseUrl.replace(/\/$/,""),c=await F(`${l}/api/extension/jobs/${v}/resumes`,{headers:{Authorization:`Bearer ${d}`}}),h=c.json||{};if(!c.ok){M=[],Q="";return}M=Array.isArray(h.resumes)?h.resumes:[],Q=((o=M[0])==null?void 0:o.id)||"",oe({...L,hasResumeInput:!!Y(),hasCoverInput:!!re()})}catch{M=[],Q=""}}function Ut(){var a;const o=t.getElementById("hiq-resume-pick");return o!=null&&o.value?o.value:Q||((a=M[0])==null?void 0:a.id)||""}function ye(o=0){const a=k.findIndex((l,c)=>c>=o&&l.status==="pending");if(a>=0)return a;const d=k.findIndex(l=>l.status==="pending");return d>=0?d:null}function G(){if(z(),!k.length){Qe.classList.remove("show"),ne.innerHTML="",H=null;return}(H==null||!k[H]||k[H].status!=="pending")&&(H=ye()),Qe.classList.add("show"),ne.innerHTML=k.map((o,a)=>{var T;const d=o.status!=="pending",l=!d&&H===a,c=!!(o.choices&&o.choices.length>=2),h=c&&(((T=o.choices)==null?void 0:T.length)||0)>8,w=c?`${h?`<input class="choice-filter" data-filter-idx="${a}" type="search" placeholder="Type to filter…" autocomplete="off" />`:""}<div class="choice-row" data-choices="${a}">${o.choices.map((N,de)=>`<button type="button" class="btn sm secondary choice${o.answer&&(o.answer===N.label||o.answer===N.value)?" picked":""}" data-act="pick" data-idx="${a}" data-choice="${de}">${A(N.label)}</button>`).join("")}</div>`:"",x=c?"":`<textarea data-idx="${a}" placeholder="${A(o.placeholder||(o.manual?"Type your answer…":""))}">${A(o.answer)}</textarea>`,j=c?`<div class="row" data-actions="${a}">
              <button type="button" class="btn sm danger-ghost" data-act="skip" data-idx="${a}">Skip</button>
            </div>`:`<div class="row" data-actions="${a}">
              <button type="button" class="btn sm primary" data-act="accept" data-idx="${a}">${o.missingProfile?"Add & use":"Accept"}</button>
              <button type="button" class="btn sm ghost" data-act="edit" data-idx="${a}">Edit (save)</button>
              <button type="button" class="btn sm danger-ghost" data-act="skip" data-idx="${a}">Skip</button>
            </div>`,g=o.missingProfile?' <span class="muted">(missing from profile)</span>':o.manual&&!c?' <span class="muted">(you answer)</span>':c?' <span class="muted">(pick one)</span>':"";return`
        <div class="review-card ${d?"done":""} ${l?"open":""}" data-idx="${a}">
          <div class="review-head" data-toggle="${a}">
            <p class="q">${A(o.label)}${g}</p>
            ${d?`<span class="muted">${o.status==="accepted"?"Accepted":"Skipped"}</span>`:""}
          </div>
          ${l?`
          <div class="review-body">
            ${w}
            ${x}
            ${j}
            <div class="promote ${o.askPromote?"show":""}" data-promote="${a}">
              <span>Also save to master?</span>
              <div class="row">
                <button type="button" class="btn sm primary" data-act="promote-yes" data-idx="${a}">Yes</button>
                <button type="button" class="btn sm ghost" data-act="promote-no" data-idx="${a}">No</button>
              </div>
            </div>
          </div>`:o.askPromote?`
          <div class="review-body" style="display:flex">
            <div class="promote show" data-promote="${a}">
              <span>Also save to master?</span>
              <div class="row">
                <button type="button" class="btn sm primary" data-act="promote-yes" data-idx="${a}">Yes</button>
                <button type="button" class="btn sm ghost" data-act="promote-no" data-idx="${a}">No</button>
              </div>
            </div>
          </div>`:""}
        </div>`}).join("")}async function zt(o){let a=0;for(let d=o+1;d<k.length;d++){const l=k[d];if(l.status==="pending"&&!(l.choices&&l.choices.length>=2)&&Fn(l.label)){l.answer=je,Ae(l.el,je),l.status="accepted",l.askPromote=!1;try{await He(l,je,!1)}catch{}a+=1}}a&&m(`Filled ${a} follow-up${a===1?"":"s"} with N/A.`,"ok")}async function We(o,a,d=!1){const l=k[o];if(!l||!a){m(d?"Pick an option.":"Enter an answer before accepting.","err");return}let c=a;if(l.answer=c,l.choices&&l.choices.length>=2){const w=l.choices.find(x=>x.label===c||x.value===c)||ct(c,l.choices)||l.choices.find(x=>x.label.toLowerCase()===c.toLowerCase()||x.value.toLowerCase()===c.toLowerCase());w?(l.choiceMode==="combobox"?await kt(l.el,w)||Ae(l.el,w.label):Et(l.el,w,l.choiceMode==="radio"?"radio":"select"),c=w.label,l.answer=c):Ae(l.el,c)}else Ae(l.el,c);l.status="accepted";const{lasting:h}=await He(l,c,!1);l.lasting=h||!!l.missingProfile,l.askPromote=l.lasting,Un(c)&&await zt(o),H=ye(o+1),G(),B&&V(ae(B)),m(l.askPromote?l.missingProfile?"Added on the form. Save to your HireIQ profile?":"Accepted. Save to master?":"Accepted.","ok")}function Ye(){return k.filter(o=>o.status==="pending").length}function z(){if(jt.classList.add("show"),!v){C.disabled=!0,C.className="btn primary",C.textContent="Submit on this site",ue.textContent="Save this job first";return}if(ut(location.href)){C.disabled=!0,C.textContent="Submit yourself on this site",ue.textContent="LinkedIn / Indeed: HireIQ won’t click Submit — finish the application yourself.";return}const o=ft(document),a=Ye();if(!o){C.disabled=!0,C.textContent="No submit button found",ue.textContent="Scroll the form — when a Submit / Apply button appears, it shows here.";return}if(Te()&&!be()){C.disabled=!0,C.className="btn warn",C.textContent="Finish Autofill to submit",ue.textContent="This form needs a resume — generate on HireIQ, then attach under Autofill Information.";return}C.disabled=!1,C.className=a?"btn warn":"btn primary",C.textContent=a?`Submit anyway (${a} unanswered)`:`Submit: ${o.label.slice(0,40)}`,ue.textContent=a?"Gray drafts still need Accept / Skip. You can submit anyway if you prefer.":`Ready — clicks “${o.label.slice(0,48)}” on the page while you watch.`}async function Ot(){if(v)try{const o=await R(),a=await U();await F(`${o.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${v}/status`,{method:"PATCH",headers:{Authorization:`Bearer ${a}`,"Content-Type":"application/json"},body:JSON.stringify({status:"applied",meta:{source:"extension_submit",url:location.href}})})}catch{}}async function He(o,a,d){const l=await R(),c=await U(),h=await F(`${l.apiBaseUrl.replace(/\/$/,"")}/api/extension/autofill/accept`,{method:"POST",headers:{Authorization:`Bearer ${c}`,"Content-Type":"application/json"},body:JSON.stringify({jobId:v,key:o.key,question:o.label,answer:a,promoteToMaster:!!d})}),w=h.json||{};if(!h.ok)throw new Error(w.error||h.error||`Accept failed (${h.status})`);return{lasting:!!(w.lasting??o.lasting)}}ne.addEventListener("input",o=>{const a=o.target;if(!(a instanceof HTMLInputElement)||!a.classList.contains("choice-filter"))return;const d=Number(a.getAttribute("data-filter-idx")),l=a.value.replace(/\s+/g," ").trim().toLowerCase(),c=ne.querySelector(`.choice-row[data-choices="${d}"]`);if(c)for(const h of Array.from(c.querySelectorAll("button.choice"))){const w=(h.textContent||"").toLowerCase();h.toggleAttribute("hidden",!!l&&!w.includes(l))}}),ne.addEventListener("click",async o=>{var j;const a=o.target,d=a.closest(".review-card");if(!d)return;const l=Number(d.getAttribute("data-idx")),c=k[l];if(!c)return;const h=a.getAttribute("data-act");if(!h){if(a.closest("textarea"))return;c.status==="pending"&&H!==l&&(H=l,G()),O(c.el);return}o.stopPropagation();const w=ne.querySelector(`textarea[data-idx="${l}"]`),x=((w==null?void 0:w.value)??c.answer).trim();try{if(h==="pick"){const g=Number(a.getAttribute("data-choice")),T=(j=c.choices)==null?void 0:j[g];if(!T)return;await We(l,T.label||T.value,!0);return}if(h==="edit"){if(!x){m("Enter an answer before saving the edit.","err");return}c.answer=x,rt(c.el,x),m("Updated draft on the form.","ok");return}if(h==="skip"){$n(c.el),c.status="skipped",c.askPromote=!1,H=ye(l+1),G(),B&&V(ae(B)),m("Skipped — field cleared.","");return}if(h==="accept"){await We(l,x,!1);return}if(h==="promote-yes"){await He(c,c.answer,!0),c.askPromote=!1,G(),m("Queued for master profile.","ok");return}if(h==="promote-no"){c.askPromote=!1,G();return}}catch(g){m(g instanceof Error?g.message:"Review action failed","err")}});async function ge(o){if(!v)return{attached:!1,available:!1};const a=o==="resume"?Y():re();if(!a)return{attached:!1,available:!1};const d=await R(),l=await U(),c=d.apiBaseUrl.replace(/\/$/,""),h=o==="resume"?Ut():"",w=`type=${o}${h?`&tailoredResumeId=${encodeURIComponent(h)}`:""}`,x=await F(`${c}/api/extension/jobs/${v}/pdf?${w}`,{method:"GET",headers:{Authorization:`Bearer ${l}`,Accept:"application/pdf"},responseType:"base64"}),j=x.json||{};if(x.base64&&x.ok){const g=o==="resume"?"HireIQ-resume.pdf":"HireIQ-cover.pdf",T=qn(x.base64,g,x.contentType||"application/pdf");return{attached:Sn(a,T),available:!0}}return{attached:!1,available:!!j.available}}function Qt(){oe(L)}function Dt(){v||(qe.innerHTML="")}function oe(o){var c,h,w,x,j;if(L={...o,hasResumeInput:o.hasResumeInput??!!Y(),hasCoverInput:o.hasCoverInput??!!re()},!v){qe.innerHTML="";return}const a=!!L.hasResumeInput,d=[];if(d.push(`<div class="doc-actions">
      <button type="button" class="btn secondary" id="hiq-gen-resume">Generate tailored resume</button>
      <button type="button" class="btn secondary" id="hiq-gen-cover">Generate cover letter</button>
      <button type="button" class="btn linkish" id="hiq-open">Open job in HireIQ →</button>
    </div>`),a&&d.push(L.resumeAttached?'<div class="check ok"><span>✓</span><span>Resume PDF attached</span></div>':'<div class="check need"><span>○</span><span>Resume PDF — required for this form</span></div>'),M.length>0){const g=M.map(T=>{var N;return`<option value="${A(T.id)}"${T.id===(Q||((N=M[0])==null?void 0:N.id))?" selected":""}>${A(T.label)}</option>`}).join("");d.push(`<label class="muted" for="hiq-resume-pick" style="display:block;margin-bottom:2px">Resume version</label><select id="hiq-resume-pick">${g}</select>`),a&&!L.resumeAttached&&d.push('<button type="button" class="btn secondary" id="hiq-attach-resume">Attach selected resume</button>')}else a&&d.push('<div class="muted">No tailored resume yet — generate on HireIQ, then come back.</div>');L.hasCoverInput&&(L.coverAttached?d.push('<div class="check ok"><span>✓</span><span>Cover letter attached</span></div>'):L.coverAvailable&&d.push('<button type="button" class="btn secondary" id="hiq-attach-cover">Attach cover letter</button>')),qe.innerHTML=d.join(""),B&&V(ae(B)),(c=t.getElementById("hiq-gen-resume"))==null||c.addEventListener("click",()=>{we(De||K),m("Opened HireIQ to generate — come back to attach.","ok")}),(h=t.getElementById("hiq-gen-cover"))==null||h.addEventListener("click",()=>{we(Je||K),m("Opened HireIQ for cover letter.","ok")}),(w=t.getElementById("hiq-open"))==null||w.addEventListener("click",()=>we(K));const l=t.getElementById("hiq-resume-pick");l&&l.addEventListener("change",()=>{Q=l.value}),(x=t.getElementById("hiq-attach-resume"))==null||x.addEventListener("click",async()=>{m("Attaching resume…");try{const g=await ge("resume");oe({...L,resumeAttached:g.attached,resumeAvailable:g.available,hasResumeInput:!!Y()}),m(g.attached?"Resume attached.":"Resume PDF not ready yet — generate on HireIQ first.",g.attached?"ok":"err"),z()}catch(g){m(X(g),"err")}}),(j=t.getElementById("hiq-attach-cover"))==null||j.addEventListener("click",async()=>{m("Attaching cover…");try{const g=await ge("cover");oe({...L,coverAttached:g.attached,coverAvailable:g.available,hasCoverInput:!!re()}),m(g.attached?"Cover attached.":"Cover not ready yet.",g.attached?"ok":"err"),z()}catch(g){m(X(g),"err")}})}async function Xe(){var d;if(!v)return;const o=Q||((d=M[0])==null?void 0:d.id)||"";await he();const a=M[0];a&&a.id!==o&&(Q=a.id,m(`New resume ready: ${a.label}`,"ok")),oe({...L,hasResumeInput:!!Y(),hasCoverInput:!!re()})}qt.addEventListener("click",()=>{e.setAttribute("data-collapsed","1")}),Lt.addEventListener("click",()=>{e.removeAttribute("data-collapsed")});function we(o){o&&window.open(o,"_blank","noopener,noreferrer")}function ve(){const o=$e(document),a=me;a&&(I.textContent=o.needsAccount?a.panelTitle:"Smart apply",E.textContent=a.panelBody,a.applyEmail&&!_.value.trim()&&(_.value=a.applyEmail)),S.hidden=!0,q.hidden=!0,o.needsAccount?(y.classList.add("show"),$.textContent=o.reason,a!=null&&a.canCreateAccount&&(q.hidden=!1)):($.textContent=o.reason,a&&a.primaryAction!=="autofill-only"?(y.classList.add("show"),S.hidden=!1):y.classList.remove("show"))}async function Ze(o){if(!v){m("Save this job first","err");return}const a=Pt();if(!a){m("Sign in and load your profile first.","err");return}S.disabled=!0,q.disabled=!0;try{o==="signup"?await lt(a,v):await lt(a,v),ve(),V(ae(B))}catch(d){m(X(d),"err")}finally{S.disabled=!1,q.disabled=!1}}S.addEventListener("click",()=>void Ze("continue")),q.addEventListener("click",()=>void Ze("signup")),J.addEventListener("click",async()=>{const o=_.value.trim();if(!o){m("Enter the email you used on this employer site.","err");return}if(!v){m("Save the job to HireIQ first, then save the ATS email.","err");return}J.disabled=!0;try{const a=await R(),d=await U(),l=await F(`${a.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${v}/ats-account`,{method:"PATCH",headers:{Authorization:`Bearer ${d}`,"Content-Type":"application/json"},body:JSON.stringify({email:o,note:$e(document).kind})}),c=l.json||{};if(!l.ok)throw new Error(c.error||l.error||"Failed to save ATS email");m(`Saved ATS email ${o} for tracking.`,"ok")}catch(a){m(a instanceof Error?a.message:"Failed to save ATS email","err")}finally{J.disabled=!1}}),Oe.addEventListener("click",()=>we(Le)),C.addEventListener("click",async()=>{if(!v){m("Save this job first","err");return}if(ut(location.href)){m("Submit this application yourself on LinkedIn / Indeed.","err");return}const o=ft(document);if(!o){m("No Submit / Apply button found on this page.","err"),z();return}if(Te()&&!be()){m("Attach a resume under Autofill Information first.","err"),z();return}const a=Ye();if(!(a>0&&!window.confirm(`${a} answer(s) still need Accept or Skip. Submit the employer form anyway?`))){C.disabled=!0,m(`Clicking “${o.label}” on the page…`);try{await Ge(),O(o.el),On(o),await Ot(),m(`Submitted via “${o.label}”. Marked Applied in HireIQ.`,"ok"),C.textContent="Submitted"}catch(d){m(X(d),"err"),C.disabled=!1,z()}}}),u.addEventListener("click",async()=>{u.disabled=!0,m("Saving to HireIQ…");try{await Rt();const o=[pe().title,pe().company].filter(Boolean);m(`Saved${o.length?`: ${o.join(" · ")}`:""}. Next: Autofill or generate docs.`,"ok")}catch(o){m(X(o),"err"),u.disabled=!1}}),f.addEventListener("click",async()=>{var o,a;f.disabled=!0,k=[],H=null,G();try{await Ge();const d=B||await Ve();m("Filling known fields…");const l=await Cn(d,{onField:p=>m(`Filling: ${p.slice(0,40)}…`)});V(l);const c=In().slice(0,25);m("Reading dropdown options…"),await vn(c);const h=p=>!!(p.choices&&p.choices.length>=2),w=c.filter(p=>!h(p)&&un(p.kind,d)),x=new Set(w.map(p=>p.key)),j=c.filter(p=>h(p)&&!x.has(p.key)),g=c.filter(p=>!h(p)&&!x.has(p.key)&&!ot(p.label)),T=c.filter(p=>!h(p)&&!x.has(p.key)&&ot(p.label));for(const p of w){const W=cn(p.kind);k.push({key:p.key,label:p.label,answer:"",lasting:W,el:p.el,status:"pending",askPromote:!1,manual:!0,missingProfile:!0,placeholder:dn(p.kind)})}for(const p of j){const W=p.kind==="country"&&d.country&&((o=p.choices)!=null&&o.length)?ct(d.country,p.choices):null;k.push({key:p.key,label:p.label,answer:(W==null?void 0:W.label)||"",lasting:!1,el:p.el,status:"pending",askPromote:!1,choices:p.choices,choiceMode:p.choiceMode})}if(g.length){m(`Drafting ${g.length} unanswered questions…`);const p=await R(),W=await U(),Me=pe(),Ee=await F(`${p.apiBaseUrl.replace(/\/$/,"")}/api/extension/autofill/drafts`,{method:"POST",headers:{Authorization:`Bearer ${W}`,"Content-Type":"application/json"},body:JSON.stringify({jobId:v,title:Me.title,company:Me.company,description:Me.description.slice(0,4e3),fields:g.map(ie=>({key:ie.key,label:ie.label,required:ie.required,inputType:ie.inputType}))})}),nt=Ee.json||{};if(!Ee.ok)m(nt.error||Ee.error||`Drafts failed (${Ee.status}) — known fields still filled.`,"err");else{const ie=new Map((nt.drafts||[]).map(P=>[P.key,P]));for(const P of g){const D=ie.get(P.key);if(!D||D.skip||!((a=D.answer)!=null&&a.trim())){k.push({key:P.key,label:P.label,answer:"",lasting:!!(D!=null&&D.lasting),el:P.el,status:"pending",askPromote:!1,manual:!0});continue}rt(P.el,D.answer.trim()),k.push({key:P.key,label:P.label,answer:D.answer.trim(),lasting:!!D.lasting,el:P.el,status:"pending",askPromote:!1})}}}for(const p of T)k.push({key:p.key,label:p.label,answer:"",lasting:!1,el:p.el,status:"pending",askPromote:!1,manual:!0});H=ye(),G(),V(ae(d)),await he();const N=Y(),de=re();let xe=!1,ke=!1,et=!1,tt=!1;if(N){m("Attaching resume PDF…");const p=await ge("resume");xe=!!(p!=null&&p.attached),et=!!(p!=null&&p.available||p!=null&&p.attached),xe&&O(N)}if(de){m("Attaching cover letter PDF…");const p=await ge("cover");ke=!!(p!=null&&p.attached),tt=!!(p!=null&&p.available||p!=null&&p.attached),ke&&O(de)}oe({hasResumeInput:!!N,hasCoverInput:!!de,resumeAttached:xe,coverAttached:ke,resumeAvailable:et,coverAvailable:tt});const _e=[l.filledCount?`${l.filledCount} known`:"",k.length?`${k.length} to review`:"",xe?"resume attached":"",ke?"cover attached":""].filter(Boolean),Kt=k.some(p=>!p.manual)?" Gray drafts need Accept before submit.":k.length?" Answer the remaining questions in the panel.":"";m(_e.length?`Autofill done: ${_e.join(" · ")}.${Kt}`:"No matching fields found on this page.",_e.length?"ok":"err"),z()}catch(d){m(X(d),"err")}finally{f.disabled=!v}}),ve(),z(),m("Checking save status…"),f.disabled=!0;const Jt=()=>{document.visibilityState==="visible"&&Xe()};document.addEventListener("visibilitychange",Jt),window.addEventListener("focus",()=>{Xe()}),(async()=>{try{await Ft()}catch(o){m(X(o),"err"),Be()}try{const o=await Ve();V(ae(o))}catch{se.textContent="Connect HireIQ in the popup to load master resume.",ce.textContent="Connect HireIQ…"}})()}function mt(){if(!Ce(location.href,document).isJobPage){Qn();return}Vn()}function St(){mt();let e=location.href;setInterval(()=>{location.href!==e&&(e=location.href,mt())},800),chrome.runtime.sendMessage({type:"HIREIQ_DETECT",detect:Ce(location.href,document)}).catch(()=>{})}function Wn(){St()}St();export{Wn as onExecute};
