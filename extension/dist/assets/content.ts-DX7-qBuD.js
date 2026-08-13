import{a as Ce,g as R}from"./settings--kY3dpYm.js";const Qt=/\b(back to jobs|create a job alert|quick apply|mygreenhouse|cookie|privacy policy|equal opportunity|eeo)\b/gi;function Dt(e,t){const n=t.match(/\bat\s+(.+)$/i);if(n!=null&&n[1])return n[1].replace(/\s*[|\-–—].*$/,"").trim();const a=e.match(/\bat\s+(.+)$/i);return a!=null&&a[1]?a[1].trim():""}function Jt(e){const t=["#content",".job__description",".job-post-content",'[data-qa="job-description"]',".posting-page",".posting",'[class*="JobDescription"]',"[data-job-description]",".job-description","#job-description","div#app_body","article"];let n=null;for(const f of t){const y=e.querySelector(f);if(y&&(y.textContent||"").trim().length>80){n=y;break}}n||(n=e.querySelector("main")||e.body);const a=n.cloneNode(!0);a.querySelectorAll('nav, header, footer, script, style, noscript, iframe, button, form, [class*="cookie"], [class*="alert"]').forEach(f=>f.remove());const l=[],c=f=>{const y=f.replace(Qt," ").replace(/[ \t]+/g," ").trim();y.length>2&&l.push(y)},d=a.querySelectorAll("p, li, h1, h2, h3, h4, section");d.length>3?d.forEach(f=>c(f.textContent||"")):(a.innerText||a.textContent||"").replace(/\r\n?/g,`
`).split(/\n+/).forEach(c);const h=[];for(const f of l)h[h.length-1]!==f&&(/^(apply|back|jobs?|careers?)$/i.test(f)||h.push(f));return h.join(`

`).slice(0,2e4)}function Kt(e=document){var L,T,E,I,$,_,J,re,le,ce;const n=typeof location<"u"?location.href:"",a=((T=(L=e.querySelector('meta[property="og:title"]'))==null?void 0:L.getAttribute("content"))==null?void 0:T.trim())||"",l=((I=(E=e.querySelector("h1"))==null?void 0:E.textContent)==null?void 0:I.trim())||"",c=e.title||"";let d=l||a||c.replace(/\s*[|\-–—].*$/,"").trim()||"Untitled role";d=d.replace(/\s+at\s+.+$/i,"").trim()||d;const h=((_=($=e.querySelector('[data-company], .company, .employer, [class*="companyName"]'))==null?void 0:$.textContent)==null?void 0:_.trim())||((re=(J=e.querySelector('meta[property="og:site_name"]'))==null?void 0:J.getAttribute("content"))==null?void 0:re.trim())||Dt(a||l,c)||"",f=((ce=(le=e.querySelector('[data-location], .location, [class*="jobLocation"], .job__location, .app-location'))==null?void 0:le.textContent)==null?void 0:ce.trim())||"";let y=Jt(e);return y.length<40&&(y=`Saved from ${n}`),{url:n,title:d.slice(0,500),company:h.slice(0,500),description:y,location:f.slice(0,500)}}const Vt=[/\brace\b/i,/ethnic/i,/\bgender\b/i,/\bsex\b/i,/veteran/i,/military/i,/disabilit/i,/\blgbt/i,/religion/i,/convict/i,/criminal/i,/felony/i,/misdemeanor/i,/salary/i,/compensation/i,/\bwage\b/i,/pay\s*rate/i,/authorized to work/i,/work authorization/i,/work\s*auth/i,/\bvisa\b/i,/citizenship/i,/sponsorship/i,/\bssn\b/i,/social security/i,/date of birth/i,/\bdob\b/i,/\bage\b/i];function nt(e){const t=(e||"").trim();return t?Vt.some(n=>n.test(t)):!1}function Gt(e){return e.toLowerCase().replace(/[_\-]+/g," ").replace(/\s+/g," ").trim()}function Wt(e){const t=(e.type||"").toLowerCase();if(t==="hidden"||t==="submit"||t==="button"||t==="checkbox"||t==="radio"||t==="file")return"skip";const n=Gt([e.name,e.id,e.label,e.placeholder,e.autocomplete].filter(Boolean).join(" "));return n?/\b(password|captcha|csrf|token|honeypot)\b/.test(n)||/\b(cover\s*letter|resume|cv|attach)\b/.test(n)&&t==="file"?"skip":t==="email"||/\b(e[\s-]?mail|emailaddress)\b/.test(n)?"email":t==="tel"||/\b(phone|mobile|cell|tel)\b/.test(n)?"phone":/\b(preferred\s*(first\s*)?name|pref\s*name|nickname)\b/.test(n)?"preferred_name":/\b(first\s*name|fname|given\s*name)\b/.test(n)||e.autocomplete==="given-name"?"first_name":/\b(last\s*name|lname|surname|family\s*name)\b/.test(n)||e.autocomplete==="family-name"?"last_name":/^(name|full name)$/.test(n)?"unknown":/\blinkedin\b/.test(n)?"linkedin":/\b(website|portfolio|personal\s*site|github\.com|homepage)\b/.test(n)?"website":/\bcountry\b/.test(n)?"country":/\b(how\s*did\s*you\s*hear|hear\s*about|referral\s*source|source)\b/.test(n)?"how_heard":e.name==="first_name"||e.id==="first_name"?"first_name":e.name==="last_name"||e.id==="last_name"?"last_name":e.name==="preferred_name"?"preferred_name":"unknown":"unknown"}function Fe(e,t){switch(e){case"first_name":return t.firstName||null;case"last_name":return t.lastName||null;case"preferred_name":return t.preferredName||t.firstName||null;case"email":return t.email||null;case"phone":return t.phone||null;case"linkedin":return t.linkedin||null;case"website":return t.website||null;case"country":return t.country||null;case"how_heard":return t.howHeard||null;default:return null}}function Yt(e){return e!=="unknown"&&e!=="skip"}function Xt(e){return e==="email"||e==="phone"||e==="linkedin"||e==="website"||e==="first_name"||e==="last_name"||e==="preferred_name"||e==="country"}function Zt(e,t){return Yt(e)&&!Fe(e,t)}function en(e){switch(e){case"email":return"Add your email…";case"phone":return"Add your phone number…";case"linkedin":return"Add your LinkedIn URL…";case"website":return"Add your website / portfolio…";case"first_name":return"Add your first name…";case"last_name":return"Add your last name…";case"preferred_name":return"Add your preferred name…";case"country":return"Add your country…";case"how_heard":return"How did you hear about this role?";default:return"Type your answer…"}}function Ne(e){const t=[e.name||"",e.id||"",e.getAttribute("aria-label")||""];e.labels&&Array.from(e.labels).forEach(a=>t.push(a.innerText||""));const n=e.closest("div, label, fieldset, li, td");return n&&t.push(n.textContent||""),t.join(" ").toLowerCase().replace(/\s+/g," ")}function dt(){return Array.from(document.querySelectorAll('input[type="file"]')).filter(e=>e instanceof HTMLInputElement)}function tn(){const e=dt(),t=e.find(n=>{const a=Ne(n);return/\b(resume|cv|curriculum)\b/.test(a)&&!/\bcover\b/.test(a)});return t||(e.length===1?e[0]:e.find(n=>!/\bcover\b/.test(Ne(n)))||null)}function nn(){return dt().find(e=>{const t=Ne(e);return/\bcover\s*(letter)?\b/.test(t)})||null}function on(e,t){var n;try{const a=new DataTransfer;return a.items.add(t),e.files=a.files,e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),(((n=e.files)==null?void 0:n.length)??0)>0}catch{return!1}}const an=650,sn=180,pt="#9ca3af",ot="hireiq-autofill-styles";function Se(){if(document.getElementById(ot))return;const e=document.createElement("style");e.id=ot,e.textContent=`
    [data-hiq-state="provisional"] {
      color: ${pt} !important;
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
  `,(document.head||document.documentElement).appendChild(e)}function ee(e){return new Promise(t=>setTimeout(t,e))}function fe(e){if(e.labels&&e.labels[0])return e.labels[0].innerText.replace(/\s+/g," ").trim();const t=e.getAttribute("aria-label");if(t)return t.trim();const n=e.getAttribute("placeholder");return n?n.trim():e.name||e.id||e.type||"field"}function ft(e){if(e.required)return!0;const t=fe(e);return/\*\s*$/.test(t)||/\brequired\b/i.test(t)}function te(e,t){var l;const n=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,a=Object.getOwnPropertyDescriptor(n,"value");(l=a==null?void 0:a.set)==null||l.call(e,t),e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),e.dispatchEvent(new KeyboardEvent("keyup",{bubbles:!0}))}function rn(){return Array.from(document.querySelectorAll("input, textarea, select")).filter(e=>!(!(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement)||e instanceof HTMLInputElement&&e.type==="hidden"||e.getAttribute("aria-hidden")==="true"||e instanceof HTMLInputElement&&e.tabIndex<0&&e.getAttribute("role")!=="combobox"))}function ln(e){return e instanceof HTMLInputElement&&(e.getAttribute("role")==="combobox"||e.classList.contains("select__input")||e.getAttribute("aria-autocomplete")==="list")}function bt(e){const t=e.closest(".select__control")||e.closest('[class*="select__control"]')||e,n=t.getBoundingClientRect(),a=n.left+Math.max(n.width/2,4),l=n.top+Math.max(n.height/2,4);for(const c of["pointerdown","mousedown","pointerup","mouseup","click"])t.dispatchEvent(new MouseEvent(c,{bubbles:!0,cancelable:!0,clientX:a,clientY:l,view:window}));e.focus(),e.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowDown",code:"ArrowDown",bubbles:!0,cancelable:!0}))}function mt(e){e.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:!0,cancelable:!0})),document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:!0,cancelable:!0}))}function Pe(e){var d;const t=e.getAttribute("aria-controls"),n=(t?document.getElementById(t):null)||((d=e.closest(".select-shell"))==null?void 0:d.querySelector('.select__menu, [class*="select__menu"]'))||document.querySelector('.select__menu, [class*="MenuList"]'),a=Array.from(n?n.querySelectorAll('.select__option, [class*="select__option"], [role="option"]'):document.querySelectorAll(`[id^="react-select-${CSS.escape(e.id)}-option"], [role="option"]`)),l=new Set,c=[];for(const h of a){const f=(h.textContent||"").replace(/\s+/g," ").trim();if(!f||/^select(\s*\.{0,3}|(\s+one))?$/i.test(f))continue;const y=f.toLowerCase();l.has(y)||(l.add(y),c.push({value:f,label:f}))}return c}async function ht(e,t){const n=(t==null?void 0:t.maxChoices)??8;bt(e),await ee(220);for(let l=0;l<6&&!(e.getAttribute("aria-expanded")==="true"||Pe(e).length);l++)await ee(80);const a=Pe(e);return mt(e),await ee(80),a.length<2||a.length>n?[]:a}async function cn(e){for(const t of e)if(t.choiceMode==="combobox"&&t.el instanceof HTMLInputElement)try{const n=t.kind==="country"||/\bcountry\b/i.test(t.label)||/\bnationality\b/i.test(t.label),a=await ht(t.el,{maxChoices:n?300:8});a.length>=2&&(t.choices=a)}catch{}}async function yt(e,t){var h;if(!(e instanceof HTMLInputElement))return!1;bt(e),await ee(200);for(let f=0;f<6&&!(e.getAttribute("aria-expanded")==="true"||Pe(e).length);f++)await ee(80);const n=e.getAttribute("aria-controls"),a=(n?document.getElementById(n):null)||((h=e.closest(".select-shell"))==null?void 0:h.querySelector('.select__menu, [class*="select__menu"]'))||document.querySelector(".select__menu"),l=Array.from(a?a.querySelectorAll('.select__option, [class*="select__option"], [role="option"]'):document.querySelectorAll(`[id^="react-select-${CSS.escape(e.id)}-option"]`)),c=t.label.replace(/\s+/g," ").trim().toLowerCase(),d=l.find(f=>(f.textContent||"").replace(/\s+/g," ").trim().toLowerCase()===c);return d instanceof HTMLElement?(d.click(),O(e),await ee(100),!0):(mt(e),!1)}function it(e,t,n){return(e.name||e.id||t||`field_${n}`).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,80)||`field_${n}`}function un(e){return{name:e.name||"",id:e.id||"",type:e instanceof HTMLInputElement?e.type:e.tagName.toLowerCase(),label:fe(e),placeholder:e.getAttribute("placeholder")||"",autocomplete:e.getAttribute("autocomplete")||""}}function O(e){Se(),e instanceof HTMLElement&&(e.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"}),e.classList.add("hiq-flash-green"),window.setTimeout(()=>e.classList.remove("hiq-flash-green"),an))}function dn(e){return Array.from(e.options).filter(t=>!t.disabled).map(t=>({value:t.value,label:(t.label||t.textContent||t.value).replace(/\s+/g," ").trim()})).filter(t=>t.label&&!/^select(\s+one)?$/i.test(t.label)&&t.value!=="")}function pn(e){const t=e.closest("label");if(t){const a=t.cloneNode(!0);a.querySelectorAll("input").forEach(c=>c.remove());const l=(a.textContent||"").replace(/\s+/g," ").trim();if(l&&l.length<80)return l}const n=e.nextSibling;if(n&&n.nodeType===Node.TEXT_NODE){const a=(n.textContent||"").replace(/\s+/g," ").trim();if(a)return a}return e.value||"Option"}function fn(e){var c,d;const t=Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(e)}"]`)).filter(h=>h instanceof HTMLInputElement),n=t.map(h=>({value:h.value,label:pn(h)})),a=t[0],l=a&&(((d=(c=a.closest("fieldset"))==null?void 0:c.querySelector("legend"))==null?void 0:d.textContent)||a.getAttribute("aria-label")||fe(a))||e;return{els:t,choices:n,label:String(l).replace(/\s+/g," ").trim().slice(0,200)||e,required:t.some(h=>ft(h))}}function gt(e,t,n){if(n==="radio"||e instanceof HTMLInputElement&&e.type==="radio"){const a=e.name,l=a?Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(a)}"]`)):[e];for(const c of l){if(!(c instanceof HTMLInputElement))continue;if(c.value===t.value||fe(c).replace(/\s+/g," ").trim().toLowerCase()===t.label.replace(/\s+/g," ").trim().toLowerCase()){c.checked=!0,c.dispatchEvent(new Event("input",{bubbles:!0})),c.dispatchEvent(new Event("change",{bubbles:!0})),c.click(),O(c);return}}return}if(e instanceof HTMLSelectElement){const a=Array.from(e.options).find(l=>l.value===t.value)||Array.from(e.options).find(l=>(l.label||l.textContent||"").replace(/\s+/g," ").trim().toLowerCase()===t.label.replace(/\s+/g," ").trim().toLowerCase());a&&(te(e,a.value),O(e));return}te(e,t.label||t.value),O(e)}function Ue(){var l;const e=[],t=new Set,n=new Set;let a=0;for(const c of rn()){if(c instanceof HTMLInputElement&&c.type==="radio"){const E=c.name||c.id;if(!E||n.has(E))continue;n.add(E);const I=fn(E);if(I.choices.length<2)continue;let $=it(c,I.label,a++);t.has($)&&($=`${$}_${a}`),t.add($);const _=I.els.find(J=>J.checked);e.push({key:$,el:I.els[0],label:I.label.slice(0,200),required:I.required,kind:"unknown",inputType:"radio",value:_?(_.value||fe(_)).trim():"",choices:I.choices,choiceMode:"radio"});continue}const d=un(c),h=Wt(d);if(h==="skip")continue;let f=it(c,d.label,a++);t.has(f)&&(f=`${f}_${a}`),t.add(f);const y=c instanceof HTMLSelectElement?dn(c):void 0,L=ln(c);let T=(c.value||"").trim();if(L&&!T){const E=(l=c.closest(".select__control, .select-shell"))==null?void 0:l.querySelector('.select__single-value, [class*="singleValue"]');T=((E==null?void 0:E.textContent)||"").replace(/\s+/g," ").trim()}e.push({key:f,el:c,label:d.label.slice(0,200),required:ft(c),kind:h,inputType:L?"combobox":d.type,value:T,...y&&y.length>=2?{choices:y,choiceMode:"select"}:L?{choiceMode:"combobox"}:{}})}return e}function wt(e){const t=[];let n=0,a=0,l=0,c=0;for(const d of Ue()){const h=Fe(d.kind,e);d.kind!=="unknown"&&!!h&&(a+=1),d.required&&(c+=1);const y=!!d.value;y&&(n+=1,d.required&&(l+=1)),(d.kind!=="unknown"||d.required)&&t.push({kind:d.kind,label:d.label.slice(0,80),required:d.required,filled:y,value:y?d.value.slice(0,60):""})}return{items:t,filledCount:n,fillableCount:a,requiredFilled:l,requiredTotal:c}}async function bn(e,t){var l,c;Se();const n=(t==null?void 0:t.delayMs)??sn,a=Ue();for(const d of a){if(d.kind==="unknown"||d.kind==="skip")continue;const h=Fe(d.kind,e);if(!h)continue;let f=(d.el.value||"").trim();if(!f&&d.choiceMode==="combobox"){const y=(l=d.el.closest(".select__control, .select-shell"))==null?void 0:l.querySelector('.select__single-value, [class*="singleValue"]');f=((y==null?void 0:y.textContent)||"").replace(/\s+/g," ").trim()}if(!f){if(O(d.el),d.choiceMode==="combobox"){const y=d.kind==="country"||/\bcountry\b/i.test(d.label),L=await ht(d.el,{maxChoices:y?300:8}),T=L.find(E=>E.label.toLowerCase()===h.toLowerCase())||L.find(E=>E.label.toLowerCase().includes(h.toLowerCase()))||L.find(E=>h.toLowerCase().includes(E.label.toLowerCase()));T?await yt(d.el,T):te(d.el,h)}else d.choiceMode==="select"&&d.el instanceof HTMLSelectElement?gt(d.el,{value:h,label:h},"select"):te(d.el,h);(c=t==null?void 0:t.onField)==null||c.call(t,d.label),await ee(n)}}return wt(e)}function ae(e){return e?wt(e):{items:[],filledCount:0,fillableCount:0,requiredFilled:0,requiredTotal:0}}function mn(){return Ue().filter(e=>{if(e.kind==="skip"||e.value)return!1;const t=e.inputType.toLowerCase();return!(t==="file"||t==="password"||t==="hidden")})}function at(e,t){Se(),te(e,t),e.setAttribute("data-hiq-state","provisional"),e.style.color=pt}function Ae(e,t){Se(),typeof t=="string"&&te(e,t),e.setAttribute("data-hiq-state","accepted"),e.style.color="",O(e),window.setTimeout(()=>{e.getAttribute("data-hiq-state")==="accepted"&&(e.style.outline="")},1200)}function hn(e){e.getAttribute("data-hiq-state")==="provisional"&&te(e,""),e.removeAttribute("data-hiq-state"),e.style.color="",e.style.outline=""}function Y(){return tn()}function se(){return nn()}function yn(e,t){return on(e,t)}function vt(e){const t=e instanceof Error?e.message:String(e||"");return/extension context invalidated/i.test(t)||/context invalidated/i.test(t)}function X(e){return vt(e)?"HireIQ was updated — refresh this tab, then try again.":e instanceof Error?e.message:String(e||"Something went wrong")}async function xt(e){try{return await chrome.runtime.sendMessage(e)}catch(t){throw vt(t)?new Error("HireIQ was updated — refresh this tab, then try again."):t}}async function F(e,t){return xt({type:"HIREIQ_FETCH",url:e,init:t})}async function U(){const e=await xt({type:"HIREIQ_GET_BEARER"});if(!(e!=null&&e.ok)||!e.token)throw new Error((e==null?void 0:e.error)||"Sign in with Google in the HireIQ popup first");return e.token}function gn(e,t,n){const a=atob(e),l=new Uint8Array(a.length);for(let c=0;c<a.length;c++)l[c]=a.charCodeAt(c);return new File([l],t,{type:n})}const wn=/^(continue|next|proceed|save and continue|save & continue|continue application|go to application|start application)$/i,vn=/\b(continue|next step|proceed|save and continue|save & continue)\b/i;function xn(e){if(!(e instanceof HTMLElement)||(e instanceof HTMLButtonElement||e instanceof HTMLInputElement)&&e.disabled)return!1;const t=window.getComputedStyle(e);if(t.display==="none"||t.visibility==="hidden")return!1;const n=e.getBoundingClientRect();return n.width===0&&n.height===0&&!e.offsetParent&&e.tagName!=="BODY"?t.display!=="none"&&t.visibility!=="hidden":n.width>2&&n.height>2}function kt(e){return e instanceof HTMLInputElement&&(e.type==="submit"||e.type==="button")?(e.value||"").trim():(e.textContent||e.getAttribute("aria-label")||"").replace(/\s+/g," ").trim()}function kn(e){const t=kt(e);if(!t)return 0;let n=0;return wn.test(t)?n+=10:vn.test(t)&&(n+=6),(e instanceof HTMLButtonElement||e instanceof HTMLInputElement)&&(n+=2),e.getAttribute("type")==="submit"&&(n+=1),n}function Ie(e){const t=Array.from(e.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"]')).filter(xn);let n=null;for(const a of t){const l=kn(a);if(l<=0)continue;const c=kt(a);(!n||l>n.score)&&(n={el:a,label:c,score:l})}return n?{el:n.el,label:n.label}:null}function En(e){e.el.scrollIntoView({block:"center",behavior:"smooth"}),e.el.click()}function An(e=16){const t="abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";let n="";for(let a=0;a<e;a++)n+=t[Math.floor(Math.random()*t.length)];return n}function Z(e,t){e.focus(),e.value=t,e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0}))}function Cn(e,t){const n=[],a=['input[type="email"]','input[name*="email" i]','input[id*="email" i]','input[autocomplete="email"]'],l=Array.from(e.querySelectorAll('input[type="password"]')),c=['input[name*="first" i]','input[id*="first" i]','input[autocomplete="given-name"]'],d=['input[name*="last" i]','input[id*="last" i]','input[autocomplete="family-name"]'];for(const h of a){const f=e.querySelector(h);if(f instanceof HTMLInputElement&&!f.value.trim()){Z(f,t.email),n.push("email");break}}for(const h of c){const f=e.querySelector(h);if(f instanceof HTMLInputElement&&!f.value.trim()){Z(f,t.firstName),n.push("firstName");break}}for(const h of d){const f=e.querySelector(h);if(f instanceof HTMLInputElement&&!f.value.trim()){Z(f,t.lastName),n.push("lastName");break}}return l.length>0&&!l[0].value.trim()&&(Z(l[0],t.password),n.push("password")),l.length>1&&!l[1].value.trim()&&(Z(l[1],t.password),n.push("confirmPassword")),n}function In(e,t){const n=['input[name*="code" i]','input[id*="code" i]','input[name*="otp" i]','input[autocomplete="one-time-code"]','input[inputmode="numeric"]'];for(const l of n){const c=e.querySelector(l);if(c instanceof HTMLInputElement)return Z(c,t),!0}const a=Array.from(e.querySelectorAll('input[maxlength="1"]'));if(a.length>=4&&a.length<=8){for(let l=0;l<Math.min(t.length,a.length);l++)Z(a[l],t[l]);return!0}return!1}function $n(e){const t=e.text.replace(/\s+/g," ").slice(0,8e3).toLowerCase(),n=e.passwordCount>0,a=e.applyFieldCount,l=/create (an )?account|sign up|register|new user|join (us|now)|don't have an account|create your profile/i.test(t),c=/sign in|log in|already have an account|welcome back|forgot (your )?password/i.test(t);return n&&l&&a<2?{needsAccount:!0,kind:"signup",reason:"This page asks you to create an account before applying."}:n&&c&&a<2?{needsAccount:!0,kind:"login",reason:"This page asks you to sign in to the employer site."}:e.passwordCount>=2&&a<2?{needsAccount:!0,kind:"signup",reason:"Looks like an account registration form."}:{needsAccount:!1,kind:a>0?"apply":"unknown",reason:"Application form detected (or unknown page)."}}function $e(e){var l;const t=((l=e.body)==null?void 0:l.innerText)||"",n=e.querySelectorAll('input[type="password"]').length,a=e.querySelectorAll('input[name="first_name"], input[name="last_name"], input[name="resume"], textarea[name="cover_letter"], #first_name, #last_name').length;return $n({text:t,passwordCount:n,applyFieldCount:a})}async function Sn(e){const t=Ie(document);return t?(En(t),e.onStatus(`Clicked “${t.label}”. Waiting for the next step…`),await e.sleep(1500),!0):(e.onStatus("No Continue / Next button found on this page.","err"),!1)}async function qn(e,t){const n=$e(document);if(!n.needsAccount)return e.onStatus("No signup wall detected on this page.","err"),!1;if(!e.applyIdentity.canCreateAccount||!e.applyIdentity.applyEmail)return e.onStatus(e.applyIdentity.panelBody,"err"),!1;const a=An();if(!Cn(document,{email:e.applyIdentity.applyEmail,firstName:e.firstName,lastName:e.lastName,password:a}).includes("email"))return e.onStatus("Could not find email field on this signup form.","err"),!1;e.onStatus(`Filled signup with ${e.applyIdentity.applyEmail}. Submit the form or we will try Continue…`),await e.savePortalCredentials(t,e.applyIdentity.applyEmail,a,`agentic:${n.kind}`);const c=Ie(document)||document.querySelector('button[type="submit"], input[type="submit"]');c&&(c.click(),await e.sleep(2e3));for(let d=0;d<8;d++){const h=await e.fetchVerificationCode(t);if(h.code&&In(document,h.code)){e.onStatus(`Entered verification code from ${e.applyIdentity.mode} inbox.`,"ok");const y=Ie(document)||document.querySelector('button[type="submit"], input[type="submit"]');return y==null||y.click(),await e.sleep(1500),!0}await e.sleep(3e3)}return e.onStatus("Account fields saved. Verification code not found yet — check your inbox or timeline.","err"),!1}async function st(e,t){return $e(document).needsAccount&&e.applyIdentity.canCreateAccount?(await qn(e,t),"signup"):Ie(document)?(await Sn(e),"continue"):"noop"}function Et(e){return e.replace(/\s+/g," ").trim().toLowerCase()}function Ln(e){const t=Et(e);return t?/\bif\s+yes\b/.test(t)||/\bif\s+so\b/.test(t)||/\bplease\s+(explain|describe|specify|elaborate|provide)\b/.test(t)||/\bexplain\b/.test(t)||/\badditional\s+(details?|info|information|comments?)\b/.test(t)||/\bcomments?\b/.test(t)||/\bdetails?\b/.test(t)||/\bwhy\b/.test(t)||/\bdescribe\b/.test(t):!1}function Tn(e){const t=Et(e);return/^(no|n|false|none|not applicable|n\/a)$/.test(t)}const Me="N/A";function rt(e,t){const n=e.replace(/\s+/g," ").trim().toLowerCase();if(!n||!t.length)return null;const a=t.find(c=>c.label.toLowerCase()===n||c.value.toLowerCase()===n)||null;if(a)return a;const l=t.find(c=>c.label.toLowerCase().startsWith(n)||c.value.toLowerCase().startsWith(n))||null;return l||t.find(c=>c.label.toLowerCase().includes(n)||c.value.toLowerCase().includes(n))||null}const Bn=["linkedin.com","indeed.com"];function lt(e){try{const t=new URL(e).hostname.toLowerCase();return Bn.some(n=>t===n||t.endsWith(`.${n}`))}catch{return!0}}function _n(e){const t=e.toLowerCase().replace(/\s+/g," ").trim();return!t||/\b(cancel|back|upload|attach|delete|remove|sign out|log out)\b/i.test(t)?0:/submit (your )?application|send application|apply for this job/i.test(t)||/^submit application$/i.test(t)?100:/^submit$/i.test(t)?85:/^apply( now)?$/i.test(t)?80:/submit application/i.test(t)?95:/^(continue|next|save and continue|review)$/i.test(t)?35:/\bsubmit\b/i.test(t)?60:0}function Hn(e){var a;if(e instanceof HTMLInputElement||e instanceof HTMLButtonElement){const l=(e.value||"").trim();if(l)return l}const t=(a=e.getAttribute("aria-label"))==null?void 0:a.trim();return t||(e.innerText||e.textContent||"").replace(/\s+/g," ").trim().slice(0,120)}function ct(e=document){const t=[...e.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"], a.button, a[class*="btn"]')];let n=null;for(const a of t){if(a instanceof HTMLInputElement&&a.type==="hidden")continue;const l=a.getBoundingClientRect();if(l.width<2&&l.height<2||a.disabled)continue;const c=Hn(a),d=_n(c);d<=0||(!n||d>n.score)&&(n={el:a,label:c,score:d})}return n}function jn(e){e.el.scrollIntoView({behavior:"smooth",block:"center"}),e.el.style.outline="3px solid #0d9488",e.el.style.outlineOffset="3px",e.el.click()}const Re="hireiq-panel-root";function pe(){return Kt(document)}function Mn(){var e;(e=document.getElementById(Re))==null||e.remove()}function Nn(e,t){return t<=0?0:Math.round(e/t*100)}function Pn(e){return e.items.length?e.items.slice(0,12).map(n=>{const a=n.filled?"✓":"○";return`<div class="check ${n.filled?"ok":n.required?"need":"opt"}"><span>${a}</span><span>${A(n.label)}</span></div>`}).join(""):'<div class="muted">No form fields detected yet — scroll to the application form.</div>'}function A(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Rn(e){return e==="apply"?"Apply page":e==="posting"?"Job posting":""}function Fn(){if(document.getElementById(Re))return;const e=document.createElement("div");e.id=Re,e.attachShadow({mode:"open"});const t=e.shadowRoot,n=pe(),a=Ce(location.href,document),l=Rn(a.pageKind);t.innerHTML=`
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
            <p class="page-kind" id="hiq-page-kind"${l?"":" hidden"}>${A(l)}</p>
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
  `,document.body?document.body.appendChild(e):document.documentElement.appendChild(e);const c=t.getElementById("hiq-status"),d=t.getElementById("hiq-save"),h=t.getElementById("hiq-saved-chip"),f=t.getElementById("hiq-autofill"),y=t.getElementById("hiq-account"),L=t.getElementById("hiq-account-title"),T=t.getElementById("hiq-account-reason"),E=t.getElementById("hiq-account-body"),I=t.getElementById("hiq-agentic-continue"),$=t.getElementById("hiq-agentic-create"),_=t.getElementById("hiq-ats-email"),J=t.getElementById("hiq-ats-save"),re=t.getElementById("hiq-preview-loading"),le=t.getElementById("hiq-preview"),ce=t.getElementById("hiq-preview-summary"),ze=t.getElementById("hiq-edit-profile"),Ct=t.getElementById("hiq-collapse"),It=t.getElementById("hiq-expand"),$t=t.getElementById("hiq-checks"),St=t.getElementById("hiq-prog-label"),qt=t.getElementById("hiq-prog-pct"),Lt=t.getElementById("hiq-prog-bar"),Oe=t.getElementById("hiq-review"),ne=t.getElementById("hiq-review-list"),Tt=t.getElementById("hiq-resume-slot"),Bt=t.getElementById("hiq-submit-wrap"),C=t.getElementById("hiq-submit"),ue=t.getElementById("hiq-submit-hint"),qe=Tt;let K="",Qe="",De="",Le="",v="",H=null,be=null,k=[],B=null,j=[],Q="",S={};function b(o,i=""){c.className=`status${i?` ${i}`:""}`,c.textContent=o}function Je(o){v=o.jobId,K=o.trackerUrl||K,Qe=o.resumeUrl||K,De=o.coverUrl||K,d.hidden=!0,h.hidden=!1,f.disabled=!1,ve(),z(),Ft()}function _t(o){re.hidden=!0,le.hidden=!1;const i=[o.fullName,o.email,o.location].filter(Boolean).join(" · ");ce.textContent=i||"Master profile loaded";const u=o.experience.filter(r=>r.title||r.company).map(r=>`${r.title}${r.company?` · ${r.company}`:""}`).slice(0,3).join(" · "),s=(o.skills||[]).slice(0,6).map(r=>`<span class="chip">${A(r)}</span>`).join("");le.innerHTML=`
      <div><b>Name</b><span>${A(o.fullName)}</span></div>
      ${o.headline?`<div><b>Title</b><span>${A(o.headline)}</span></div>`:""}
      <div><b>Email</b><span>${A(o.email)}</span></div>
      <div><b>Phone</b><span>${A(o.phone)}</span></div>
      ${o.location?`<div><b>Loc</b><span>${A(o.location)}</span></div>`:""}
      ${o.linkedin?`<div><b>LinkedIn</b><span>${A(o.linkedin)}</span></div>`:""}
      ${u?`<div><b>Exp</b><span>${A(u)}</span></div>`:""}
      ${s?`<div class="chips">${s}</div>`:""}
    `,ze.hidden=!Le}function Te(){return!!(S.hasResumeInput||Y())}function me(){return!!S.resumeAttached}function V(o){let i=o.requiredTotal||o.fillableCount||o.items.length,u=o.requiredTotal?o.requiredFilled:o.filledCount;const s=Te();s&&(i+=1,me()&&(u+=1));const r=Nn(u,i);St.textContent=i?`${u}/${i} ready`:"Form progress",qt.textContent=`${r}%`,Lt.style.width=`${r}%`;let m=Pn(o);if(s){const w=me();m+=`<div class="check ${w?"ok":"need"}"><span>${w?"✓":"○"}</span><span>Resume PDF</span></div>`}$t.innerHTML=m}async function Ke(){const o=await R(),i=await U(),u=await F(`${o.apiBaseUrl.replace(/\/$/,"")}/api/extension/profile`,{headers:{Authorization:`Bearer ${i}`}}),s=u.json||{};if(!u.ok||!s.profile)throw new Error(s.error||u.error||`Profile failed (${u.status})`);return H=s.profile,be=s.applyIdentity??null,Le=s.profileUrl||"",s.autofillPreview&&_t(s.autofillPreview),ve(),s.profile}function Ht(){return!be||!H?null:{applyIdentity:be,firstName:H.firstName,lastName:H.lastName,sleep:o=>new Promise(i=>setTimeout(i,o)),fetchVerificationCode:async o=>{const i=await R(),u=await U(),s=await F(`${i.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${o}/verification-code`,{headers:{Authorization:`Bearer ${u}`}}),r=s.json||{};return{code:r.code??null,error:r.error||s.error}},savePortalCredentials:async(o,i,u,s)=>{const r=await R(),m=await U();await F(`${r.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${o}/ats-account`,{method:"PATCH",headers:{Authorization:`Bearer ${m}`,"Content-Type":"application/json"},body:JSON.stringify({email:i,password:u,note:s})}),_.value=i},onStatus:(o,i)=>b(o,i||"")}}async function Ve(){if(v)return v;throw new Error("Save this job first")}async function jt(){if(v)return v;const o=await R(),i=await U(),u=pe(),s=Ce(u.url,document);if(!s.isJobPage)throw new Error(s.reason);const r=await F(`${o.apiBaseUrl.replace(/\/$/,"")}/api/jobs`,{method:"POST",headers:{Authorization:`Bearer ${i}`,"Content-Type":"application/json"},body:JSON.stringify(u)}),m=r.json||{};if(!r.ok||!m.jobId)throw new Error(m.error||r.error||`Save failed (${r.status})`);return Je({jobId:m.jobId,trackerUrl:m.trackerUrl,resumeUrl:m.resumeUrl,coverUrl:m.coverUrl}),await he(),v}async function Mt(){const o=await R(),i=await U(),u=o.apiBaseUrl.replace(/\/$/,""),s=await F(`${u}/api/extension/jobs/by-url?url=${encodeURIComponent(location.href)}`,{headers:{Authorization:`Bearer ${i}`}}),r=s.json||{};if(!s.ok){b(r.error||s.error||"Could not check saved status","err"),Be();return}r.saved&&r.jobId?(Je({jobId:r.jobId,trackerUrl:r.trackerUrl,resumeUrl:r.resumeUrl,coverUrl:r.coverUrl}),b("Job already saved — Autofill ready.","ok"),await he()):Be()}function Be(){v="",d.hidden=!1,d.disabled=!1,h.hidden=!0,f.disabled=!0,z(),b("Save this job first"),Ut()}async function he(){var o;if(!v){j=[],Q="";return}try{const i=await R(),u=await U(),s=i.apiBaseUrl.replace(/\/$/,""),r=await F(`${s}/api/extension/jobs/${v}/resumes`,{headers:{Authorization:`Bearer ${u}`}}),m=r.json||{};if(!r.ok){j=[],Q="";return}j=Array.isArray(m.resumes)?m.resumes:[],Q=((o=j[0])==null?void 0:o.id)||"",oe({...S,hasResumeInput:!!Y(),hasCoverInput:!!se()})}catch{j=[],Q=""}}function Nt(){var i;const o=t.getElementById("hiq-resume-pick");return o!=null&&o.value?o.value:Q||((i=j[0])==null?void 0:i.id)||""}function ye(o=0){const i=k.findIndex((s,r)=>r>=o&&s.status==="pending");if(i>=0)return i;const u=k.findIndex(s=>s.status==="pending");return u>=0?u:null}function G(){if(z(),!k.length){Oe.classList.remove("show"),ne.innerHTML="",B=null;return}(B==null||!k[B]||k[B].status!=="pending")&&(B=ye()),Oe.classList.add("show"),ne.innerHTML=k.map((o,i)=>{var q;const u=o.status!=="pending",s=!u&&B===i,r=!!(o.choices&&o.choices.length>=2),m=r&&(((q=o.choices)==null?void 0:q.length)||0)>8,w=r?`${m?`<input class="choice-filter" data-filter-idx="${i}" type="search" placeholder="Type to filter…" autocomplete="off" />`:""}<div class="choice-row" data-choices="${i}">${o.choices.map((N,de)=>`<button type="button" class="btn sm secondary choice${o.answer&&(o.answer===N.label||o.answer===N.value)?" picked":""}" data-act="pick" data-idx="${i}" data-choice="${de}">${A(N.label)}</button>`).join("")}</div>`:"",x=r?"":`<textarea data-idx="${i}" placeholder="${A(o.placeholder||(o.manual?"Type your answer…":""))}">${A(o.answer)}</textarea>`,M=r?`<div class="row" data-actions="${i}">
              <button type="button" class="btn sm danger-ghost" data-act="skip" data-idx="${i}">Skip</button>
            </div>`:`<div class="row" data-actions="${i}">
              <button type="button" class="btn sm primary" data-act="accept" data-idx="${i}">${o.missingProfile?"Add & use":"Accept"}</button>
              <button type="button" class="btn sm ghost" data-act="edit" data-idx="${i}">Edit (save)</button>
              <button type="button" class="btn sm danger-ghost" data-act="skip" data-idx="${i}">Skip</button>
            </div>`,g=o.missingProfile?' <span class="muted">(missing from profile)</span>':o.manual&&!r?' <span class="muted">(you answer)</span>':r?' <span class="muted">(pick one)</span>':"";return`
        <div class="review-card ${u?"done":""} ${s?"open":""}" data-idx="${i}">
          <div class="review-head" data-toggle="${i}">
            <p class="q">${A(o.label)}${g}</p>
            ${u?`<span class="muted">${o.status==="accepted"?"Accepted":"Skipped"}</span>`:""}
          </div>
          ${s?`
          <div class="review-body">
            ${w}
            ${x}
            ${M}
            <div class="promote ${o.askPromote?"show":""}" data-promote="${i}">
              <span>Also save to master?</span>
              <div class="row">
                <button type="button" class="btn sm primary" data-act="promote-yes" data-idx="${i}">Yes</button>
                <button type="button" class="btn sm ghost" data-act="promote-no" data-idx="${i}">No</button>
              </div>
            </div>
          </div>`:o.askPromote?`
          <div class="review-body" style="display:flex">
            <div class="promote show" data-promote="${i}">
              <span>Also save to master?</span>
              <div class="row">
                <button type="button" class="btn sm primary" data-act="promote-yes" data-idx="${i}">Yes</button>
                <button type="button" class="btn sm ghost" data-act="promote-no" data-idx="${i}">No</button>
              </div>
            </div>
          </div>`:""}
        </div>`}).join("")}async function Pt(o){let i=0;for(let u=o+1;u<k.length;u++){const s=k[u];if(s.status==="pending"&&!(s.choices&&s.choices.length>=2)&&Ln(s.label)){s.answer=Me,Ae(s.el,Me),s.status="accepted",s.askPromote=!1;try{await _e(s,Me,!1)}catch{}i+=1}}i&&b(`Filled ${i} follow-up${i===1?"":"s"} with N/A.`,"ok")}async function Ge(o,i,u=!1){const s=k[o];if(!s||!i){b(u?"Pick an option.":"Enter an answer before accepting.","err");return}let r=i;if(s.answer=r,s.choices&&s.choices.length>=2){const w=s.choices.find(x=>x.label===r||x.value===r)||rt(r,s.choices)||s.choices.find(x=>x.label.toLowerCase()===r.toLowerCase()||x.value.toLowerCase()===r.toLowerCase());w?(s.choiceMode==="combobox"?await yt(s.el,w)||Ae(s.el,w.label):gt(s.el,w,s.choiceMode==="radio"?"radio":"select"),r=w.label,s.answer=r):Ae(s.el,r)}else Ae(s.el,r);s.status="accepted";const{lasting:m}=await _e(s,r,!1);s.lasting=m||!!s.missingProfile,s.askPromote=s.lasting,Tn(r)&&await Pt(o),B=ye(o+1),G(),H&&V(ae(H)),b(s.askPromote?s.missingProfile?"Added on the form. Save to your HireIQ profile?":"Accepted. Save to master?":"Accepted.","ok")}function We(){return k.filter(o=>o.status==="pending").length}function z(){if(Bt.classList.add("show"),!v){C.disabled=!0,C.className="btn primary",C.textContent="Submit on this site",ue.textContent="Save this job first";return}if(lt(location.href)){C.disabled=!0,C.textContent="Submit yourself on this site",ue.textContent="LinkedIn / Indeed: HireIQ won’t click Submit — finish the application yourself.";return}const o=ct(document),i=We();if(!o){C.disabled=!0,C.textContent="No submit button found",ue.textContent="Scroll the form — when a Submit / Apply button appears, it shows here.";return}if(Te()&&!me()){C.disabled=!0,C.className="btn warn",C.textContent="Finish Autofill to submit",ue.textContent="This form needs a resume — generate on HireIQ, then attach under Autofill Information.";return}C.disabled=!1,C.className=i?"btn warn":"btn primary",C.textContent=i?`Submit anyway (${i} unanswered)`:`Submit: ${o.label.slice(0,40)}`,ue.textContent=i?"Gray drafts still need Accept / Skip. You can submit anyway if you prefer.":`Ready — clicks “${o.label.slice(0,48)}” on the page while you watch.`}async function Rt(){if(v)try{const o=await R(),i=await U();await F(`${o.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${v}/status`,{method:"PATCH",headers:{Authorization:`Bearer ${i}`,"Content-Type":"application/json"},body:JSON.stringify({status:"applied",meta:{source:"extension_submit",url:location.href}})})}catch{}}async function _e(o,i,u){const s=await R(),r=await U(),m=await F(`${s.apiBaseUrl.replace(/\/$/,"")}/api/extension/autofill/accept`,{method:"POST",headers:{Authorization:`Bearer ${r}`,"Content-Type":"application/json"},body:JSON.stringify({jobId:v,key:o.key,question:o.label,answer:i,promoteToMaster:!!u})}),w=m.json||{};if(!m.ok)throw new Error(w.error||m.error||`Accept failed (${m.status})`);return{lasting:!!(w.lasting??o.lasting)}}ne.addEventListener("input",o=>{const i=o.target;if(!(i instanceof HTMLInputElement)||!i.classList.contains("choice-filter"))return;const u=Number(i.getAttribute("data-filter-idx")),s=i.value.replace(/\s+/g," ").trim().toLowerCase(),r=ne.querySelector(`.choice-row[data-choices="${u}"]`);if(r)for(const m of Array.from(r.querySelectorAll("button.choice"))){const w=(m.textContent||"").toLowerCase();m.toggleAttribute("hidden",!!s&&!w.includes(s))}}),ne.addEventListener("click",async o=>{var M;const i=o.target,u=i.closest(".review-card");if(!u)return;const s=Number(u.getAttribute("data-idx")),r=k[s];if(!r)return;const m=i.getAttribute("data-act");if(!m){if(i.closest("textarea"))return;r.status==="pending"&&B!==s&&(B=s,G()),O(r.el);return}o.stopPropagation();const w=ne.querySelector(`textarea[data-idx="${s}"]`),x=((w==null?void 0:w.value)??r.answer).trim();try{if(m==="pick"){const g=Number(i.getAttribute("data-choice")),q=(M=r.choices)==null?void 0:M[g];if(!q)return;await Ge(s,q.label||q.value,!0);return}if(m==="edit"){if(!x){b("Enter an answer before saving the edit.","err");return}r.answer=x,at(r.el,x),b("Updated draft on the form.","ok");return}if(m==="skip"){hn(r.el),r.status="skipped",r.askPromote=!1,B=ye(s+1),G(),H&&V(ae(H)),b("Skipped — field cleared.","");return}if(m==="accept"){await Ge(s,x,!1);return}if(m==="promote-yes"){await _e(r,r.answer,!0),r.askPromote=!1,G(),b("Queued for master profile.","ok");return}if(m==="promote-no"){r.askPromote=!1,G();return}}catch(g){b(g instanceof Error?g.message:"Review action failed","err")}});async function ge(o){if(!v)return{attached:!1,available:!1};const i=o==="resume"?Y():se();if(!i)return{attached:!1,available:!1};const u=await R(),s=await U(),r=u.apiBaseUrl.replace(/\/$/,""),m=o==="resume"?Nt():"",w=`type=${o}${m?`&tailoredResumeId=${encodeURIComponent(m)}`:""}`,x=await F(`${r}/api/extension/jobs/${v}/pdf?${w}`,{method:"GET",headers:{Authorization:`Bearer ${s}`,Accept:"application/pdf"},responseType:"base64"}),M=x.json||{};if(x.base64&&x.ok){const g=o==="resume"?"HireIQ-resume.pdf":"HireIQ-cover.pdf",q=gn(x.base64,g,x.contentType||"application/pdf");return{attached:yn(i,q),available:!0}}return{attached:!1,available:!!M.available}}function Ft(){oe(S)}function Ut(){v||(qe.innerHTML="")}function oe(o){var r,m,w,x,M;if(S={...o,hasResumeInput:o.hasResumeInput??!!Y(),hasCoverInput:o.hasCoverInput??!!se()},!v){qe.innerHTML="";return}const i=!!S.hasResumeInput,u=[];if(u.push(`<div class="doc-actions">
      <button type="button" class="btn secondary" id="hiq-gen-resume">Generate tailored resume</button>
      <button type="button" class="btn secondary" id="hiq-gen-cover">Generate cover letter</button>
      <button type="button" class="btn linkish" id="hiq-open">Open job in HireIQ →</button>
    </div>`),i&&u.push(S.resumeAttached?'<div class="check ok"><span>✓</span><span>Resume PDF attached</span></div>':'<div class="check need"><span>○</span><span>Resume PDF — required for this form</span></div>'),j.length>0){const g=j.map(q=>{var N;return`<option value="${A(q.id)}"${q.id===(Q||((N=j[0])==null?void 0:N.id))?" selected":""}>${A(q.label)}</option>`}).join("");u.push(`<label class="muted" for="hiq-resume-pick" style="display:block;margin-bottom:2px">Resume version</label><select id="hiq-resume-pick">${g}</select>`),i&&!S.resumeAttached&&u.push('<button type="button" class="btn secondary" id="hiq-attach-resume">Attach selected resume</button>')}else i&&u.push('<div class="muted">No tailored resume yet — generate on HireIQ, then come back.</div>');S.hasCoverInput&&(S.coverAttached?u.push('<div class="check ok"><span>✓</span><span>Cover letter attached</span></div>'):S.coverAvailable&&u.push('<button type="button" class="btn secondary" id="hiq-attach-cover">Attach cover letter</button>')),qe.innerHTML=u.join(""),H&&V(ae(H)),(r=t.getElementById("hiq-gen-resume"))==null||r.addEventListener("click",()=>{we(Qe||K),b("Opened HireIQ to generate — come back to attach.","ok")}),(m=t.getElementById("hiq-gen-cover"))==null||m.addEventListener("click",()=>{we(De||K),b("Opened HireIQ for cover letter.","ok")}),(w=t.getElementById("hiq-open"))==null||w.addEventListener("click",()=>we(K));const s=t.getElementById("hiq-resume-pick");s&&s.addEventListener("change",()=>{Q=s.value}),(x=t.getElementById("hiq-attach-resume"))==null||x.addEventListener("click",async()=>{b("Attaching resume…");try{const g=await ge("resume");oe({...S,resumeAttached:g.attached,resumeAvailable:g.available,hasResumeInput:!!Y()}),b(g.attached?"Resume attached.":"Resume PDF not ready yet — generate on HireIQ first.",g.attached?"ok":"err"),z()}catch(g){b(X(g),"err")}}),(M=t.getElementById("hiq-attach-cover"))==null||M.addEventListener("click",async()=>{b("Attaching cover…");try{const g=await ge("cover");oe({...S,coverAttached:g.attached,coverAvailable:g.available,hasCoverInput:!!se()}),b(g.attached?"Cover attached.":"Cover not ready yet.",g.attached?"ok":"err"),z()}catch(g){b(X(g),"err")}})}async function Ye(){var u;if(!v)return;const o=Q||((u=j[0])==null?void 0:u.id)||"";await he();const i=j[0];i&&i.id!==o&&(Q=i.id,b(`New resume ready: ${i.label}`,"ok")),oe({...S,hasResumeInput:!!Y(),hasCoverInput:!!se()})}Ct.addEventListener("click",()=>{e.setAttribute("data-collapsed","1")}),It.addEventListener("click",()=>{e.removeAttribute("data-collapsed")});function we(o){o&&window.open(o,"_blank","noopener,noreferrer")}function ve(){const o=$e(document),i=be;i&&(L.textContent=o.needsAccount?i.panelTitle:"Smart apply",E.textContent=i.panelBody,i.applyEmail&&!_.value.trim()&&(_.value=i.applyEmail)),I.hidden=!0,$.hidden=!0,o.needsAccount?(y.classList.add("show"),T.textContent=o.reason,i!=null&&i.canCreateAccount&&($.hidden=!1)):(T.textContent=o.reason,i&&i.primaryAction!=="autofill-only"?(y.classList.add("show"),I.hidden=!1):y.classList.remove("show"))}async function Xe(o){if(!v){b("Save this job first","err");return}const i=Ht();if(!i){b("Sign in and load your profile first.","err");return}I.disabled=!0,$.disabled=!0;try{o==="signup"?await st(i,v):await st(i,v),ve(),V(ae())}catch(u){b(X(u),"err")}finally{I.disabled=!1,$.disabled=!1}}I.addEventListener("click",()=>void Xe("continue")),$.addEventListener("click",()=>void Xe("signup")),J.addEventListener("click",async()=>{const o=_.value.trim();if(!o){b("Enter the email you used on this employer site.","err");return}if(!v){b("Save the job to HireIQ first, then save the ATS email.","err");return}J.disabled=!0;try{const i=await R(),u=await U(),s=await F(`${i.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${v}/ats-account`,{method:"PATCH",headers:{Authorization:`Bearer ${u}`,"Content-Type":"application/json"},body:JSON.stringify({email:o,note:$e(document).kind})}),r=s.json||{};if(!s.ok)throw new Error(r.error||s.error||"Failed to save ATS email");b(`Saved ATS email ${o} for tracking.`,"ok")}catch(i){b(i instanceof Error?i.message:"Failed to save ATS email","err")}finally{J.disabled=!1}}),ze.addEventListener("click",()=>we(Le)),C.addEventListener("click",async()=>{if(!v){b("Save this job first","err");return}if(lt(location.href)){b("Submit this application yourself on LinkedIn / Indeed.","err");return}const o=ct(document);if(!o){b("No Submit / Apply button found on this page.","err"),z();return}if(Te()&&!me()){b("Attach a resume under Autofill Information first.","err"),z();return}const i=We();if(!(i>0&&!window.confirm(`${i} answer(s) still need Accept or Skip. Submit the employer form anyway?`))){C.disabled=!0,b(`Clicking “${o.label}” on the page…`);try{await Ve(),O(o.el),jn(o),await Rt(),b(`Submitted via “${o.label}”. Marked Applied in HireIQ.`,"ok"),C.textContent="Submitted"}catch(u){b(X(u),"err"),C.disabled=!1,z()}}}),d.addEventListener("click",async()=>{d.disabled=!0,b("Saving to HireIQ…");try{await jt();const o=[pe().title,pe().company].filter(Boolean);b(`Saved${o.length?`: ${o.join(" · ")}`:""}. Next: Autofill or generate docs.`,"ok")}catch(o){b(X(o),"err"),d.disabled=!1}}),f.addEventListener("click",async()=>{var o,i;f.disabled=!0,k=[],B=null,G();try{await Ve();const u=H||await Ke();b("Filling known fields…");const s=await bn(u,{onField:p=>b(`Filling: ${p.slice(0,40)}…`)});V(s);const r=mn().slice(0,25);b("Reading dropdown options…"),await cn(r);const m=p=>!!(p.choices&&p.choices.length>=2),w=r.filter(p=>!m(p)&&Zt(p.kind,u)),x=new Set(w.map(p=>p.key)),M=r.filter(p=>m(p)&&!x.has(p.key)),g=r.filter(p=>!m(p)&&!x.has(p.key)&&!nt(p.label)),q=r.filter(p=>!m(p)&&!x.has(p.key)&&nt(p.label));for(const p of w){const W=Xt(p.kind);k.push({key:p.key,label:p.label,answer:"",lasting:W,el:p.el,status:"pending",askPromote:!1,manual:!0,missingProfile:!0,placeholder:en(p.kind)})}for(const p of M){const W=p.kind==="country"&&u.country&&((o=p.choices)!=null&&o.length)?rt(u.country,p.choices):null;k.push({key:p.key,label:p.label,answer:(W==null?void 0:W.label)||"",lasting:!1,el:p.el,status:"pending",askPromote:!1,choices:p.choices,choiceMode:p.choiceMode})}if(g.length){b(`Drafting ${g.length} unanswered questions…`);const p=await R(),W=await U(),je=pe(),Ee=await F(`${p.apiBaseUrl.replace(/\/$/,"")}/api/extension/autofill/drafts`,{method:"POST",headers:{Authorization:`Bearer ${W}`,"Content-Type":"application/json"},body:JSON.stringify({jobId:v,title:je.title,company:je.company,description:je.description.slice(0,4e3),fields:g.map(ie=>({key:ie.key,label:ie.label,required:ie.required,inputType:ie.inputType}))})}),tt=Ee.json||{};if(!Ee.ok)b(tt.error||Ee.error||`Drafts failed (${Ee.status}) — known fields still filled.`,"err");else{const ie=new Map((tt.drafts||[]).map(P=>[P.key,P]));for(const P of g){const D=ie.get(P.key);if(!D||D.skip||!((i=D.answer)!=null&&i.trim())){k.push({key:P.key,label:P.label,answer:"",lasting:!!(D!=null&&D.lasting),el:P.el,status:"pending",askPromote:!1,manual:!0});continue}at(P.el,D.answer.trim()),k.push({key:P.key,label:P.label,answer:D.answer.trim(),lasting:!!D.lasting,el:P.el,status:"pending",askPromote:!1})}}}for(const p of q)k.push({key:p.key,label:p.label,answer:"",lasting:!1,el:p.el,status:"pending",askPromote:!1,manual:!0});B=ye(),G(),V(ae(u)),await he();const N=Y(),de=se();let xe=!1,ke=!1,Ze=!1,et=!1;if(N){b("Attaching resume PDF…");const p=await ge("resume");xe=!!(p!=null&&p.attached),Ze=!!(p!=null&&p.available||p!=null&&p.attached),xe&&O(N)}if(de){b("Attaching cover letter PDF…");const p=await ge("cover");ke=!!(p!=null&&p.attached),et=!!(p!=null&&p.available||p!=null&&p.attached),ke&&O(de)}oe({hasResumeInput:!!N,hasCoverInput:!!de,resumeAttached:xe,coverAttached:ke,resumeAvailable:Ze,coverAvailable:et});const He=[s.filledCount?`${s.filledCount} known`:"",k.length?`${k.length} to review`:"",xe?"resume attached":"",ke?"cover attached":""].filter(Boolean),Ot=k.some(p=>!p.manual)?" Gray drafts need Accept before submit.":k.length?" Answer the remaining questions in the panel.":"";b(He.length?`Autofill done: ${He.join(" · ")}.${Ot}`:"No matching fields found on this page.",He.length?"ok":"err"),z()}catch(u){b(X(u),"err")}finally{f.disabled=!v}}),ve(),z(),b("Checking save status…"),f.disabled=!0;const zt=()=>{document.visibilityState==="visible"&&Ye()};document.addEventListener("visibilitychange",zt),window.addEventListener("focus",()=>{Ye()}),(async()=>{try{await Mt()}catch(o){b(X(o),"err"),Be()}try{const o=await Ke();V(ae(o))}catch{re.textContent="Connect HireIQ in the popup to load master resume.",ce.textContent="Connect HireIQ…"}})()}function ut(){if(!Ce(location.href,document).isJobPage){Mn();return}Fn()}function At(){ut();let e=location.href;setInterval(()=>{location.href!==e&&(e=location.href,ut())},800),chrome.runtime.sendMessage({type:"HIREIQ_DETECT",detect:Ce(location.href,document)}).catch(()=>{})}function zn(){At()}At();export{zn as onExecute};
