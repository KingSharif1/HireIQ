import{d as ke,g as U}from"./settings-CXfgVSA7.js";const _t=/\b(back to jobs|create a job alert|quick apply|mygreenhouse|cookie|privacy policy|equal opportunity|eeo)\b/gi;function Ht(e,t){const o=t.match(/\bat\s+(.+)$/i);if(o!=null&&o[1])return o[1].replace(/\s*[|\-–—].*$/,"").trim();const i=e.match(/\bat\s+(.+)$/i);return i!=null&&i[1]?i[1].trim():""}function jt(e){const t=["#content",".job__description",".job-post-content",'[data-qa="job-description"]',".posting-page",".posting",'[class*="JobDescription"]',"[data-job-description]",".job-description","#job-description","div#app_body","article"];let o=null;for(const b of t){const y=e.querySelector(b);if(y&&(y.textContent||"").trim().length>80){o=y;break}}o||(o=e.querySelector("main")||e.body);const i=o.cloneNode(!0);i.querySelectorAll('nav, header, footer, script, style, noscript, iframe, button, form, [class*="cookie"], [class*="alert"]').forEach(b=>b.remove());const p=[],l=b=>{const y=b.replace(_t," ").replace(/[ \t]+/g," ").trim();y.length>2&&p.push(y)},d=i.querySelectorAll("p, li, h1, h2, h3, h4, section");d.length>3?d.forEach(b=>l(b.textContent||"")):(i.innerText||i.textContent||"").replace(/\r\n?/g,`
`).split(/\n+/).forEach(l);const h=[];for(const b of p)h[h.length-1]!==b&&(/^(apply|back|jobs?|careers?)$/i.test(b)||h.push(b));return h.join(`

`).slice(0,2e4)}function Mt(e=document){var S,T,k,q,B,F,J,de,ue,pe;const o=typeof location<"u"?location.href:"",i=((T=(S=e.querySelector('meta[property="og:title"]'))==null?void 0:S.getAttribute("content"))==null?void 0:T.trim())||"",p=((q=(k=e.querySelector("h1"))==null?void 0:k.textContent)==null?void 0:q.trim())||"",l=e.title||"";let d=p||i||l.replace(/\s*[|\-–—].*$/,"").trim()||"Untitled role";d=d.replace(/\s+at\s+.+$/i,"").trim()||d;const h=((F=(B=e.querySelector('[data-company], .company, .employer, [class*="companyName"]'))==null?void 0:B.textContent)==null?void 0:F.trim())||((de=(J=e.querySelector('meta[property="og:site_name"]'))==null?void 0:J.getAttribute("content"))==null?void 0:de.trim())||Ht(i||p,l)||"",b=((pe=(ue=e.querySelector('[data-location], .location, [class*="jobLocation"], .job__location, .app-location'))==null?void 0:ue.textContent)==null?void 0:pe.trim())||"";let y=jt(e);return y.length<40&&(y=`Saved from ${o}`),{url:o,title:d.slice(0,500),company:h.slice(0,500),description:y,location:b.slice(0,500)}}const Pt=[/\brace\b/i,/ethnic/i,/\bgender\b/i,/\bsex\b/i,/veteran/i,/military/i,/disabilit/i,/\blgbt/i,/religion/i,/convict/i,/criminal/i,/felony/i,/misdemeanor/i,/salary/i,/compensation/i,/\bwage\b/i,/pay\s*rate/i,/authorized to work/i,/work authorization/i,/work\s*auth/i,/\bvisa\b/i,/citizenship/i,/sponsorship/i,/\bssn\b/i,/social security/i,/date of birth/i,/\bdob\b/i,/\bage\b/i];function We(e){const t=(e||"").trim();return t?Pt.some(o=>o.test(t)):!1}function Rt(e){return e.toLowerCase().replace(/[_\-]+/g," ").replace(/\s+/g," ").trim()}function Ft(e){const t=(e.type||"").toLowerCase();if(t==="hidden"||t==="submit"||t==="button"||t==="checkbox"||t==="radio"||t==="file")return"skip";const o=Rt([e.name,e.id,e.label,e.placeholder,e.autocomplete].filter(Boolean).join(" "));return o?/\b(password|captcha|csrf|token|honeypot)\b/.test(o)||/\b(cover\s*letter|resume|cv|attach)\b/.test(o)&&t==="file"?"skip":t==="email"||/\b(e[\s-]?mail|emailaddress)\b/.test(o)?"email":t==="tel"||/\b(phone|mobile|cell|tel)\b/.test(o)?"phone":/\b(preferred\s*(first\s*)?name|pref\s*name|nickname)\b/.test(o)?"preferred_name":/\b(first\s*name|fname|given\s*name)\b/.test(o)||e.autocomplete==="given-name"?"first_name":/\b(last\s*name|lname|surname|family\s*name)\b/.test(o)||e.autocomplete==="family-name"?"last_name":/^(name|full name)$/.test(o)?"unknown":/\blinkedin\b/.test(o)?"linkedin":/\b(website|portfolio|personal\s*site|github\.com|homepage)\b/.test(o)?"website":/\bcountry\b/.test(o)?"country":/\b(how\s*did\s*you\s*hear|hear\s*about|referral\s*source|source)\b/.test(o)?"how_heard":e.name==="first_name"||e.id==="first_name"?"first_name":e.name==="last_name"||e.id==="last_name"?"last_name":e.name==="preferred_name"?"preferred_name":"unknown":"unknown"}function je(e,t){switch(e){case"first_name":return t.firstName||null;case"last_name":return t.lastName||null;case"preferred_name":return t.preferredName||t.firstName||null;case"email":return t.email||null;case"phone":return t.phone||null;case"linkedin":return t.linkedin||null;case"website":return t.website||null;case"country":return t.country||null;case"how_heard":return t.howHeard||null;default:return null}}function zt(e){return e!=="unknown"&&e!=="skip"}function Nt(e){return e==="email"||e==="phone"||e==="linkedin"||e==="website"||e==="first_name"||e==="last_name"||e==="preferred_name"||e==="country"}function Ut(e,t){return zt(e)&&!je(e,t)}function Ot(e){switch(e){case"email":return"Add your email…";case"phone":return"Add your phone number…";case"linkedin":return"Add your LinkedIn URL…";case"website":return"Add your website / portfolio…";case"first_name":return"Add your first name…";case"last_name":return"Add your last name…";case"preferred_name":return"Add your preferred name…";case"country":return"Add your country…";case"how_heard":return"How did you hear about this role?";default:return"Type your answer…"}}function Be(e){const t=[e.name||"",e.id||"",e.getAttribute("aria-label")||""];e.labels&&Array.from(e.labels).forEach(i=>t.push(i.innerText||""));const o=e.closest("div, label, fieldset, li, td");return o&&t.push(o.textContent||""),t.join(" ").toLowerCase().replace(/\s+/g," ")}function at(){return Array.from(document.querySelectorAll('input[type="file"]')).filter(e=>e instanceof HTMLInputElement)}function Qt(){const e=at(),t=e.find(o=>{const i=Be(o);return/\b(resume|cv|curriculum)\b/.test(i)&&!/\bcover\b/.test(i)});return t||(e.length===1?e[0]:e.find(o=>!/\bcover\b/.test(Be(o)))||null)}function Dt(){return at().find(e=>{const t=Be(e);return/\bcover\s*(letter)?\b/.test(t)})||null}function Jt(e,t){var o;try{const i=new DataTransfer;return i.items.add(t),e.files=i.files,e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),(((o=e.files)==null?void 0:o.length)??0)>0}catch{return!1}}const Kt=650,Gt=180,st="#9ca3af",Ye="hireiq-autofill-styles";function Ee(){if(document.getElementById(Ye))return;const e=document.createElement("style");e.id=Ye,e.textContent=`
    [data-hiq-state="provisional"] {
      color: ${st} !important;
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
  `,(document.head||document.documentElement).appendChild(e)}function Y(e){return new Promise(t=>setTimeout(t,e))}function ce(e){if(e.labels&&e.labels[0])return e.labels[0].innerText.replace(/\s+/g," ").trim();const t=e.getAttribute("aria-label");if(t)return t.trim();const o=e.getAttribute("placeholder");return o?o.trim():e.name||e.id||e.type||"field"}function rt(e){if(e.required)return!0;const t=ce(e);return/\*\s*$/.test(t)||/\brequired\b/i.test(t)}function X(e,t){var p;const o=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,i=Object.getOwnPropertyDescriptor(o,"value");(p=i==null?void 0:i.set)==null||p.call(e,t),e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),e.dispatchEvent(new KeyboardEvent("keyup",{bubbles:!0}))}function Vt(){return Array.from(document.querySelectorAll("input, textarea, select")).filter(e=>!(!(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement)||e instanceof HTMLInputElement&&e.type==="hidden"||e.getAttribute("aria-hidden")==="true"||e instanceof HTMLInputElement&&e.tabIndex<0&&e.getAttribute("role")!=="combobox"))}function Wt(e){return e instanceof HTMLInputElement&&(e.getAttribute("role")==="combobox"||e.classList.contains("select__input")||e.getAttribute("aria-autocomplete")==="list")}function lt(e){const t=e.closest(".select__control")||e.closest('[class*="select__control"]')||e,o=t.getBoundingClientRect(),i=o.left+Math.max(o.width/2,4),p=o.top+Math.max(o.height/2,4);for(const l of["pointerdown","mousedown","pointerup","mouseup","click"])t.dispatchEvent(new MouseEvent(l,{bubbles:!0,cancelable:!0,clientX:i,clientY:p,view:window}));e.focus(),e.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowDown",code:"ArrowDown",bubbles:!0,cancelable:!0}))}function ct(e){e.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:!0,cancelable:!0})),document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:!0,cancelable:!0}))}function _e(e){var d;const t=e.getAttribute("aria-controls"),o=(t?document.getElementById(t):null)||((d=e.closest(".select-shell"))==null?void 0:d.querySelector('.select__menu, [class*="select__menu"]'))||document.querySelector('.select__menu, [class*="MenuList"]'),i=Array.from(o?o.querySelectorAll('.select__option, [class*="select__option"], [role="option"]'):document.querySelectorAll(`[id^="react-select-${CSS.escape(e.id)}-option"], [role="option"]`)),p=new Set,l=[];for(const h of i){const b=(h.textContent||"").replace(/\s+/g," ").trim();if(!b||/^select(\s*\.{0,3}|(\s+one))?$/i.test(b))continue;const y=b.toLowerCase();p.has(y)||(p.add(y),l.push({value:b,label:b}))}return l}async function dt(e,t){const o=(t==null?void 0:t.maxChoices)??8;lt(e),await Y(220);for(let p=0;p<6&&!(e.getAttribute("aria-expanded")==="true"||_e(e).length);p++)await Y(80);const i=_e(e);return ct(e),await Y(80),i.length<2||i.length>o?[]:i}async function Yt(e){for(const t of e)if(t.choiceMode==="combobox"&&t.el instanceof HTMLInputElement)try{const o=t.kind==="country"||/\bcountry\b/i.test(t.label)||/\bnationality\b/i.test(t.label),i=await dt(t.el,{maxChoices:o?300:8});i.length>=2&&(t.choices=i)}catch{}}async function ut(e,t){var h;if(!(e instanceof HTMLInputElement))return!1;lt(e),await Y(200);for(let b=0;b<6&&!(e.getAttribute("aria-expanded")==="true"||_e(e).length);b++)await Y(80);const o=e.getAttribute("aria-controls"),i=(o?document.getElementById(o):null)||((h=e.closest(".select-shell"))==null?void 0:h.querySelector('.select__menu, [class*="select__menu"]'))||document.querySelector(".select__menu"),p=Array.from(i?i.querySelectorAll('.select__option, [class*="select__option"], [role="option"]'):document.querySelectorAll(`[id^="react-select-${CSS.escape(e.id)}-option"]`)),l=t.label.replace(/\s+/g," ").trim().toLowerCase(),d=p.find(b=>(b.textContent||"").replace(/\s+/g," ").trim().toLowerCase()===l);return d instanceof HTMLElement?(d.click(),R(e),await Y(100),!0):(ct(e),!1)}function Xe(e,t,o){return(e.name||e.id||t||`field_${o}`).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,80)||`field_${o}`}function Xt(e){return{name:e.name||"",id:e.id||"",type:e instanceof HTMLInputElement?e.type:e.tagName.toLowerCase(),label:ce(e),placeholder:e.getAttribute("placeholder")||"",autocomplete:e.getAttribute("autocomplete")||""}}function R(e){Ee(),e instanceof HTMLElement&&(e.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"}),e.classList.add("hiq-flash-green"),window.setTimeout(()=>e.classList.remove("hiq-flash-green"),Kt))}function Zt(e){return Array.from(e.options).filter(t=>!t.disabled).map(t=>({value:t.value,label:(t.label||t.textContent||t.value).replace(/\s+/g," ").trim()})).filter(t=>t.label&&!/^select(\s+one)?$/i.test(t.label)&&t.value!=="")}function en(e){const t=e.closest("label");if(t){const i=t.cloneNode(!0);i.querySelectorAll("input").forEach(l=>l.remove());const p=(i.textContent||"").replace(/\s+/g," ").trim();if(p&&p.length<80)return p}const o=e.nextSibling;if(o&&o.nodeType===Node.TEXT_NODE){const i=(o.textContent||"").replace(/\s+/g," ").trim();if(i)return i}return e.value||"Option"}function tn(e){var l,d;const t=Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(e)}"]`)).filter(h=>h instanceof HTMLInputElement),o=t.map(h=>({value:h.value,label:en(h)})),i=t[0],p=i&&(((d=(l=i.closest("fieldset"))==null?void 0:l.querySelector("legend"))==null?void 0:d.textContent)||i.getAttribute("aria-label")||ce(i))||e;return{els:t,choices:o,label:String(p).replace(/\s+/g," ").trim().slice(0,200)||e,required:t.some(h=>rt(h))}}function pt(e,t,o){if(o==="radio"||e instanceof HTMLInputElement&&e.type==="radio"){const i=e.name,p=i?Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(i)}"]`)):[e];for(const l of p){if(!(l instanceof HTMLInputElement))continue;if(l.value===t.value||ce(l).replace(/\s+/g," ").trim().toLowerCase()===t.label.replace(/\s+/g," ").trim().toLowerCase()){l.checked=!0,l.dispatchEvent(new Event("input",{bubbles:!0})),l.dispatchEvent(new Event("change",{bubbles:!0})),l.click(),R(l);return}}return}if(e instanceof HTMLSelectElement){const i=Array.from(e.options).find(p=>p.value===t.value)||Array.from(e.options).find(p=>(p.label||p.textContent||"").replace(/\s+/g," ").trim().toLowerCase()===t.label.replace(/\s+/g," ").trim().toLowerCase());i&&(X(e,i.value),R(e));return}X(e,t.label||t.value),R(e)}function Me(){var p;const e=[],t=new Set,o=new Set;let i=0;for(const l of Vt()){if(l instanceof HTMLInputElement&&l.type==="radio"){const k=l.name||l.id;if(!k||o.has(k))continue;o.add(k);const q=tn(k);if(q.choices.length<2)continue;let B=Xe(l,q.label,i++);t.has(B)&&(B=`${B}_${i}`),t.add(B);const F=q.els.find(J=>J.checked);e.push({key:B,el:q.els[0],label:q.label.slice(0,200),required:q.required,kind:"unknown",inputType:"radio",value:F?(F.value||ce(F)).trim():"",choices:q.choices,choiceMode:"radio"});continue}const d=Xt(l),h=Ft(d);if(h==="skip")continue;let b=Xe(l,d.label,i++);t.has(b)&&(b=`${b}_${i}`),t.add(b);const y=l instanceof HTMLSelectElement?Zt(l):void 0,S=Wt(l);let T=(l.value||"").trim();if(S&&!T){const k=(p=l.closest(".select__control, .select-shell"))==null?void 0:p.querySelector('.select__single-value, [class*="singleValue"]');T=((k==null?void 0:k.textContent)||"").replace(/\s+/g," ").trim()}e.push({key:b,el:l,label:d.label.slice(0,200),required:rt(l),kind:h,inputType:S?"combobox":d.type,value:T,...y&&y.length>=2?{choices:y,choiceMode:"select"}:S?{choiceMode:"combobox"}:{}})}return e}function ft(e){const t=[];let o=0,i=0,p=0,l=0;for(const d of Me()){const h=je(d.kind,e);d.kind!=="unknown"&&!!h&&(i+=1),d.required&&(l+=1);const y=!!d.value;y&&(o+=1,d.required&&(p+=1)),(d.kind!=="unknown"||d.required)&&t.push({kind:d.kind,label:d.label.slice(0,80),required:d.required,filled:y,value:y?d.value.slice(0,60):""})}return{items:t,filledCount:o,fillableCount:i,requiredFilled:p,requiredTotal:l}}async function nn(e,t){var p,l;Ee();const o=(t==null?void 0:t.delayMs)??Gt,i=Me();for(const d of i){if(d.kind==="unknown"||d.kind==="skip")continue;const h=je(d.kind,e);if(!h)continue;let b=(d.el.value||"").trim();if(!b&&d.choiceMode==="combobox"){const y=(p=d.el.closest(".select__control, .select-shell"))==null?void 0:p.querySelector('.select__single-value, [class*="singleValue"]');b=((y==null?void 0:y.textContent)||"").replace(/\s+/g," ").trim()}if(!b){if(R(d.el),d.choiceMode==="combobox"){const y=d.kind==="country"||/\bcountry\b/i.test(d.label),S=await dt(d.el,{maxChoices:y?300:8}),T=S.find(k=>k.label.toLowerCase()===h.toLowerCase())||S.find(k=>k.label.toLowerCase().includes(h.toLowerCase()))||S.find(k=>h.toLowerCase().includes(k.label.toLowerCase()));T?await ut(d.el,T):X(d.el,h)}else d.choiceMode==="select"&&d.el instanceof HTMLSelectElement?pt(d.el,{value:h,label:h},"select"):X(d.el,h);(l=t==null?void 0:t.onField)==null||l.call(t,d.label),await Y(o)}}return ft(e)}function re(e){return e?ft(e):{items:[],filledCount:0,fillableCount:0,requiredFilled:0,requiredTotal:0}}function on(){return Me().filter(e=>{if(e.kind==="skip"||e.value)return!1;const t=e.inputType.toLowerCase();return!(t==="file"||t==="password"||t==="hidden")})}function Ze(e,t){Ee(),X(e,t),e.setAttribute("data-hiq-state","provisional"),e.style.color=st}function xe(e,t){Ee(),typeof t=="string"&&X(e,t),e.setAttribute("data-hiq-state","accepted"),e.style.color="",R(e),window.setTimeout(()=>{e.getAttribute("data-hiq-state")==="accepted"&&(e.style.outline="")},1200)}function an(e){e.getAttribute("data-hiq-state")==="provisional"&&X(e,""),e.removeAttribute("data-hiq-state"),e.style.color="",e.style.outline=""}function W(){return Qt()}function oe(){return Dt()}function sn(e,t){return Jt(e,t)}function bt(e){const t=e instanceof Error?e.message:String(e||"");return/extension context invalidated/i.test(t)||/context invalidated/i.test(t)}function ie(e){return bt(e)?"HireIQ was updated — refresh this tab, then try again.":e instanceof Error?e.message:String(e||"Something went wrong")}async function mt(e){try{return await chrome.runtime.sendMessage(e)}catch(t){throw bt(t)?new Error("HireIQ was updated — refresh this tab, then try again."):t}}async function O(e,t){return mt({type:"HIREIQ_FETCH",url:e,init:t})}async function Q(){const e=await mt({type:"HIREIQ_GET_BEARER"});if(!(e!=null&&e.ok)||!e.token)throw new Error((e==null?void 0:e.error)||"Sign in with Google in the HireIQ popup first");return e.token}function rn(e,t,o){const i=atob(e),p=new Uint8Array(i.length);for(let l=0;l<i.length;l++)p[l]=i.charCodeAt(l);return new File([p],t,{type:o})}function ln(e){const t=e.text.replace(/\s+/g," ").slice(0,8e3).toLowerCase(),o=e.passwordCount>0,i=e.applyFieldCount,p=/create (an )?account|sign up|register|new user|join (us|now)|don't have an account|create your profile/i.test(t),l=/sign in|log in|already have an account|welcome back|forgot (your )?password/i.test(t);return o&&p&&i<2?{needsAccount:!0,kind:"signup",reason:"This page asks you to create an account before applying."}:o&&l&&i<2?{needsAccount:!0,kind:"login",reason:"This page asks you to sign in to the employer site."}:e.passwordCount>=2&&i<2?{needsAccount:!0,kind:"signup",reason:"Looks like an account registration form."}:{needsAccount:!1,kind:i>0?"apply":"unknown",reason:"Application form detected (or unknown page)."}}function et(e){var p;const t=((p=e.body)==null?void 0:p.innerText)||"",o=e.querySelectorAll('input[type="password"]').length,i=e.querySelectorAll('input[name="first_name"], input[name="last_name"], input[name="resume"], textarea[name="cover_letter"], #first_name, #last_name').length;return ln({text:t,passwordCount:o,applyFieldCount:i})}function ht(e){return e.replace(/\s+/g," ").trim().toLowerCase()}function cn(e){const t=ht(e);return t?/\bif\s+yes\b/.test(t)||/\bif\s+so\b/.test(t)||/\bplease\s+(explain|describe|specify|elaborate|provide)\b/.test(t)||/\bexplain\b/.test(t)||/\badditional\s+(details?|info|information|comments?)\b/.test(t)||/\bcomments?\b/.test(t)||/\bdetails?\b/.test(t)||/\bwhy\b/.test(t)||/\bdescribe\b/.test(t):!1}function dn(e){const t=ht(e);return/^(no|n|false|none|not applicable|n\/a)$/.test(t)}const Te="N/A";function tt(e,t){const o=e.replace(/\s+/g," ").trim().toLowerCase();if(!o||!t.length)return null;const i=t.find(l=>l.label.toLowerCase()===o||l.value.toLowerCase()===o)||null;if(i)return i;const p=t.find(l=>l.label.toLowerCase().startsWith(o)||l.value.toLowerCase().startsWith(o))||null;return p||t.find(l=>l.label.toLowerCase().includes(o)||l.value.toLowerCase().includes(o))||null}const un=["linkedin.com","indeed.com"];function nt(e){try{const t=new URL(e).hostname.toLowerCase();return un.some(o=>t===o||t.endsWith(`.${o}`))}catch{return!0}}function pn(e){const t=e.toLowerCase().replace(/\s+/g," ").trim();return!t||/\b(cancel|back|upload|attach|delete|remove|sign out|log out)\b/i.test(t)?0:/submit (your )?application|send application|apply for this job/i.test(t)||/^submit application$/i.test(t)?100:/^submit$/i.test(t)?85:/^apply( now)?$/i.test(t)?80:/submit application/i.test(t)?95:/^(continue|next|save and continue|review)$/i.test(t)?35:/\bsubmit\b/i.test(t)?60:0}function fn(e){var i;if(e instanceof HTMLInputElement||e instanceof HTMLButtonElement){const p=(e.value||"").trim();if(p)return p}const t=(i=e.getAttribute("aria-label"))==null?void 0:i.trim();return t||(e.innerText||e.textContent||"").replace(/\s+/g," ").trim().slice(0,120)}function ot(e=document){const t=[...e.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"], a.button, a[class*="btn"]')];let o=null;for(const i of t){if(i instanceof HTMLInputElement&&i.type==="hidden")continue;const p=i.getBoundingClientRect();if(p.width<2&&p.height<2||i.disabled)continue;const l=fn(i),d=pn(l);d<=0||(!o||d>o.score)&&(o={el:i,label:l,score:d})}return o}function bn(e){e.el.scrollIntoView({behavior:"smooth",block:"center"}),e.el.style.outline="3px solid #0d9488",e.el.style.outlineOffset="3px",e.el.click()}const He="hireiq-panel-root";function le(){return Mt(document)}function mn(){var e;(e=document.getElementById(He))==null||e.remove()}function hn(e,t){return t<=0?0:Math.round(e/t*100)}function yn(e){return e.items.length?e.items.slice(0,12).map(o=>{const i=o.filled?"✓":"○";return`<div class="check ${o.filled?"ok":o.required?"need":"opt"}"><span>${i}</span><span>${A(o.label)}</span></div>`}).join(""):'<div class="muted">No form fields detected yet — scroll to the application form.</div>'}function A(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function gn(e){return e==="apply"?"Apply page":e==="posting"?"Job posting":""}function wn(){if(document.getElementById(He))return;const e=document.createElement("div");e.id=He,e.attachShadow({mode:"open"});const t=e.shadowRoot,o=le(),i=ke(location.href,document),p=gn(i.pageKind);t.innerHTML=`
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
            <p class="company" id="hiq-company">${A(o.company||"Job page")}</p>
            <p class="title" id="hiq-title">${A(o.title.slice(0,100))}</p>
            <p class="page-kind" id="hiq-page-kind"${p?"":" hidden"}>${A(p)}</p>
          </div>
          <div class="actions-row">
            <button type="button" class="btn primary" id="hiq-autofill" disabled>Autofill</button>
            <button type="button" class="btn secondary" id="hiq-save">Save to HireIQ</button>
            <span class="saved-chip" id="hiq-saved-chip" hidden>Saved</span>
          </div>
          <div class="account" id="hiq-account">
            <h3 class="section-label" style="color:#92400e;margin:0">Employer account needed</h3>
            <p id="hiq-account-reason">This site wants you to create / sign in to an account.</p>
            <p>Create the account yourself (we don’t invent emails). Then save the email here so HireIQ can help track status.</p>
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
  `,document.body?document.body.appendChild(e):document.documentElement.appendChild(e);const l=t.getElementById("hiq-status"),d=t.getElementById("hiq-save"),h=t.getElementById("hiq-saved-chip"),b=t.getElementById("hiq-autofill"),y=t.getElementById("hiq-account"),S=t.getElementById("hiq-account-reason"),T=t.getElementById("hiq-ats-email"),k=t.getElementById("hiq-ats-save"),q=t.getElementById("hiq-preview-loading"),B=t.getElementById("hiq-preview"),F=t.getElementById("hiq-preview-summary"),J=t.getElementById("hiq-edit-profile"),de=t.getElementById("hiq-collapse"),ue=t.getElementById("hiq-expand"),pe=t.getElementById("hiq-checks"),gt=t.getElementById("hiq-prog-label"),wt=t.getElementById("hiq-prog-pct"),vt=t.getElementById("hiq-prog-bar"),Pe=t.getElementById("hiq-review"),Z=t.getElementById("hiq-review-list"),xt=t.getElementById("hiq-resume-slot"),kt=t.getElementById("hiq-submit-wrap"),$=t.getElementById("hiq-submit"),ae=t.getElementById("hiq-submit-hint"),Ae=xt;let K="",Re="",Fe="",$e="",x="",D=null,E=[],L=null,_=[],z="",I={};function f(n,a=""){l.className=`status${a?` ${a}`:""}`,l.textContent=n}function ze(n){x=n.jobId,K=n.trackerUrl||K,Re=n.resumeUrl||K,Fe=n.coverUrl||K,d.hidden=!0,h.hidden=!1,b.disabled=!1,Je(),P(),St()}function Et(n){q.hidden=!0,B.hidden=!1;const a=[n.fullName,n.email,n.location].filter(Boolean).join(" · ");F.textContent=a||"Master profile loaded";const c=n.experience.filter(r=>r.title||r.company).map(r=>`${r.title}${r.company?` · ${r.company}`:""}`).slice(0,3).join(" · "),s=(n.skills||[]).slice(0,6).map(r=>`<span class="chip">${A(r)}</span>`).join("");B.innerHTML=`
      <div><b>Name</b><span>${A(n.fullName)}</span></div>
      ${n.headline?`<div><b>Title</b><span>${A(n.headline)}</span></div>`:""}
      <div><b>Email</b><span>${A(n.email)}</span></div>
      <div><b>Phone</b><span>${A(n.phone)}</span></div>
      ${n.location?`<div><b>Loc</b><span>${A(n.location)}</span></div>`:""}
      ${n.linkedin?`<div><b>LinkedIn</b><span>${A(n.linkedin)}</span></div>`:""}
      ${c?`<div><b>Exp</b><span>${A(c)}</span></div>`:""}
      ${s?`<div class="chips">${s}</div>`:""}
    `,J.hidden=!$e}function Ie(){return!!(I.hasResumeInput||W())}function fe(){return!!I.resumeAttached}function ee(n){let a=n.requiredTotal||n.fillableCount||n.items.length,c=n.requiredTotal?n.requiredFilled:n.filledCount;const s=Ie();s&&(a+=1,fe()&&(c+=1));const r=hn(c,a);gt.textContent=a?`${c}/${a} ready`:"Form progress",wt.textContent=`${r}%`,vt.style.width=`${r}%`;let m=yn(n);if(s){const w=fe();m+=`<div class="check ${w?"ok":"need"}"><span>${w?"✓":"○"}</span><span>Resume PDF</span></div>`}pe.innerHTML=m}async function Ne(){const n=await U(),a=await Q(),c=await O(`${n.apiBaseUrl.replace(/\/$/,"")}/api/extension/profile`,{headers:{Authorization:`Bearer ${a}`}}),s=c.json||{};if(!c.ok||!s.profile)throw new Error(s.error||c.error||`Profile failed (${c.status})`);return D=s.profile,$e=s.profileUrl||"",s.autofillPreview&&Et(s.autofillPreview),s.profile}async function Ue(){if(x)return x;throw new Error("Save this job first")}async function At(){if(x)return x;const n=await U(),a=await Q(),c=le(),s=ke(c.url,document);if(!s.isJobPage)throw new Error(s.reason);const r=await O(`${n.apiBaseUrl.replace(/\/$/,"")}/api/jobs`,{method:"POST",headers:{Authorization:`Bearer ${a}`,"Content-Type":"application/json"},body:JSON.stringify(c)}),m=r.json||{};if(!r.ok||!m.jobId)throw new Error(m.error||r.error||`Save failed (${r.status})`);return ze({jobId:m.jobId,trackerUrl:m.trackerUrl,resumeUrl:m.resumeUrl,coverUrl:m.coverUrl}),await be(),x}async function $t(){const n=await U(),a=await Q(),c=n.apiBaseUrl.replace(/\/$/,""),s=await O(`${c}/api/extension/jobs/by-url?url=${encodeURIComponent(location.href)}`,{headers:{Authorization:`Bearer ${a}`}}),r=s.json||{};if(!s.ok){f(r.error||s.error||"Could not check saved status","err"),Ce();return}r.saved&&r.jobId?(ze({jobId:r.jobId,trackerUrl:r.trackerUrl,resumeUrl:r.resumeUrl,coverUrl:r.coverUrl}),f("Job already saved — Autofill ready.","ok"),await be()):Ce()}function Ce(){x="",d.hidden=!1,d.disabled=!1,h.hidden=!0,b.disabled=!0,P(),f("Save this job first"),Lt()}async function be(){var n;if(!x){_=[],z="";return}try{const a=await U(),c=await Q(),s=a.apiBaseUrl.replace(/\/$/,""),r=await O(`${s}/api/extension/jobs/${x}/resumes`,{headers:{Authorization:`Bearer ${c}`}}),m=r.json||{};if(!r.ok){_=[],z="";return}_=Array.isArray(m.resumes)?m.resumes:[],z=((n=_[0])==null?void 0:n.id)||"",te({...I,hasResumeInput:!!W(),hasCoverInput:!!oe()})}catch{_=[],z=""}}function It(){var a;const n=t.getElementById("hiq-resume-pick");return n!=null&&n.value?n.value:z||((a=_[0])==null?void 0:a.id)||""}function me(n=0){const a=E.findIndex((s,r)=>r>=n&&s.status==="pending");if(a>=0)return a;const c=E.findIndex(s=>s.status==="pending");return c>=0?c:null}function G(){if(P(),!E.length){Pe.classList.remove("show"),Z.innerHTML="",L=null;return}(L==null||!E[L]||E[L].status!=="pending")&&(L=me()),Pe.classList.add("show"),Z.innerHTML=E.map((n,a)=>{var C;const c=n.status!=="pending",s=!c&&L===a,r=!!(n.choices&&n.choices.length>=2),m=r&&(((C=n.choices)==null?void 0:C.length)||0)>8,w=r?`${m?`<input class="choice-filter" data-filter-idx="${a}" type="search" placeholder="Type to filter…" autocomplete="off" />`:""}<div class="choice-row" data-choices="${a}">${n.choices.map((j,se)=>`<button type="button" class="btn sm secondary choice${n.answer&&(n.answer===j.label||n.answer===j.value)?" picked":""}" data-act="pick" data-idx="${a}" data-choice="${se}">${A(j.label)}</button>`).join("")}</div>`:"",v=r?"":`<textarea data-idx="${a}" placeholder="${A(n.placeholder||(n.manual?"Type your answer…":""))}">${A(n.answer)}</textarea>`,H=r?`<div class="row" data-actions="${a}">
              <button type="button" class="btn sm danger-ghost" data-act="skip" data-idx="${a}">Skip</button>
            </div>`:`<div class="row" data-actions="${a}">
              <button type="button" class="btn sm primary" data-act="accept" data-idx="${a}">${n.missingProfile?"Add & use":"Accept"}</button>
              <button type="button" class="btn sm ghost" data-act="edit" data-idx="${a}">Edit (save)</button>
              <button type="button" class="btn sm danger-ghost" data-act="skip" data-idx="${a}">Skip</button>
            </div>`,g=n.missingProfile?' <span class="muted">(missing from profile)</span>':n.manual&&!r?' <span class="muted">(you answer)</span>':r?' <span class="muted">(pick one)</span>':"";return`
        <div class="review-card ${c?"done":""} ${s?"open":""}" data-idx="${a}">
          <div class="review-head" data-toggle="${a}">
            <p class="q">${A(n.label)}${g}</p>
            ${c?`<span class="muted">${n.status==="accepted"?"Accepted":"Skipped"}</span>`:""}
          </div>
          ${s?`
          <div class="review-body">
            ${w}
            ${v}
            ${H}
            <div class="promote ${n.askPromote?"show":""}" data-promote="${a}">
              <span>Also save to master?</span>
              <div class="row">
                <button type="button" class="btn sm primary" data-act="promote-yes" data-idx="${a}">Yes</button>
                <button type="button" class="btn sm ghost" data-act="promote-no" data-idx="${a}">No</button>
              </div>
            </div>
          </div>`:n.askPromote?`
          <div class="review-body" style="display:flex">
            <div class="promote show" data-promote="${a}">
              <span>Also save to master?</span>
              <div class="row">
                <button type="button" class="btn sm primary" data-act="promote-yes" data-idx="${a}">Yes</button>
                <button type="button" class="btn sm ghost" data-act="promote-no" data-idx="${a}">No</button>
              </div>
            </div>
          </div>`:""}
        </div>`}).join("")}async function Ct(n){let a=0;for(let c=n+1;c<E.length;c++){const s=E[c];if(s.status==="pending"&&!(s.choices&&s.choices.length>=2)&&cn(s.label)){s.answer=Te,xe(s.el,Te),s.status="accepted",s.askPromote=!1;try{await qe(s,Te,!1)}catch{}a+=1}}a&&f(`Filled ${a} follow-up${a===1?"":"s"} with N/A.`,"ok")}async function Oe(n,a,c=!1){const s=E[n];if(!s||!a){f(c?"Pick an option.":"Enter an answer before accepting.","err");return}let r=a;if(s.answer=r,s.choices&&s.choices.length>=2){const w=s.choices.find(v=>v.label===r||v.value===r)||tt(r,s.choices)||s.choices.find(v=>v.label.toLowerCase()===r.toLowerCase()||v.value.toLowerCase()===r.toLowerCase());w?(s.choiceMode==="combobox"?await ut(s.el,w)||xe(s.el,w.label):pt(s.el,w,s.choiceMode==="radio"?"radio":"select"),r=w.label,s.answer=r):xe(s.el,r)}else xe(s.el,r);s.status="accepted";const{lasting:m}=await qe(s,r,!1);s.lasting=m||!!s.missingProfile,s.askPromote=s.lasting,dn(r)&&await Ct(n),L=me(n+1),G(),D&&ee(re(D)),f(s.askPromote?s.missingProfile?"Added on the form. Save to your HireIQ profile?":"Accepted. Save to master?":"Accepted.","ok")}function Qe(){return E.filter(n=>n.status==="pending").length}function P(){if(kt.classList.add("show"),!x){$.disabled=!0,$.className="btn primary",$.textContent="Submit on this site",ae.textContent="Save this job first";return}if(nt(location.href)){$.disabled=!0,$.textContent="Submit yourself on this site",ae.textContent="LinkedIn / Indeed: HireIQ won’t click Submit — finish the application yourself.";return}const n=ot(document),a=Qe();if(!n){$.disabled=!0,$.textContent="No submit button found",ae.textContent="Scroll the form — when a Submit / Apply button appears, it shows here.";return}if(Ie()&&!fe()){$.disabled=!0,$.className="btn warn",$.textContent="Finish Autofill to submit",ae.textContent="This form needs a resume — generate on HireIQ, then attach under Autofill Information.";return}$.disabled=!1,$.className=a?"btn warn":"btn primary",$.textContent=a?`Submit anyway (${a} unanswered)`:`Submit: ${n.label.slice(0,40)}`,ae.textContent=a?"Gray drafts still need Accept / Skip. You can submit anyway if you prefer.":`Ready — clicks “${n.label.slice(0,48)}” on the page while you watch.`}async function qt(){if(x)try{const n=await U(),a=await Q();await O(`${n.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${x}/status`,{method:"PATCH",headers:{Authorization:`Bearer ${a}`,"Content-Type":"application/json"},body:JSON.stringify({status:"applied",meta:{source:"extension_submit",url:location.href}})})}catch{}}async function qe(n,a,c){const s=await U(),r=await Q(),m=await O(`${s.apiBaseUrl.replace(/\/$/,"")}/api/extension/autofill/accept`,{method:"POST",headers:{Authorization:`Bearer ${r}`,"Content-Type":"application/json"},body:JSON.stringify({jobId:x,key:n.key,question:n.label,answer:a,promoteToMaster:!!c})}),w=m.json||{};if(!m.ok)throw new Error(w.error||m.error||`Accept failed (${m.status})`);return{lasting:!!(w.lasting??n.lasting)}}Z.addEventListener("input",n=>{const a=n.target;if(!(a instanceof HTMLInputElement)||!a.classList.contains("choice-filter"))return;const c=Number(a.getAttribute("data-filter-idx")),s=a.value.replace(/\s+/g," ").trim().toLowerCase(),r=Z.querySelector(`.choice-row[data-choices="${c}"]`);if(r)for(const m of Array.from(r.querySelectorAll("button.choice"))){const w=(m.textContent||"").toLowerCase();m.toggleAttribute("hidden",!!s&&!w.includes(s))}}),Z.addEventListener("click",async n=>{var H;const a=n.target,c=a.closest(".review-card");if(!c)return;const s=Number(c.getAttribute("data-idx")),r=E[s];if(!r)return;const m=a.getAttribute("data-act");if(!m){if(a.closest("textarea"))return;r.status==="pending"&&L!==s&&(L=s,G()),R(r.el);return}n.stopPropagation();const w=Z.querySelector(`textarea[data-idx="${s}"]`),v=((w==null?void 0:w.value)??r.answer).trim();try{if(m==="pick"){const g=Number(a.getAttribute("data-choice")),C=(H=r.choices)==null?void 0:H[g];if(!C)return;await Oe(s,C.label||C.value,!0);return}if(m==="edit"){if(!v){f("Enter an answer before saving the edit.","err");return}r.answer=v,Ze(r.el,v),f("Updated draft on the form.","ok");return}if(m==="skip"){an(r.el),r.status="skipped",r.askPromote=!1,L=me(s+1),G(),D&&ee(re(D)),f("Skipped — field cleared.","");return}if(m==="accept"){await Oe(s,v,!1);return}if(m==="promote-yes"){await qe(r,r.answer,!0),r.askPromote=!1,G(),f("Queued for master profile.","ok");return}if(m==="promote-no"){r.askPromote=!1,G();return}}catch(g){f(g instanceof Error?g.message:"Review action failed","err")}});async function he(n){if(!x)return{attached:!1,available:!1};const a=n==="resume"?W():oe();if(!a)return{attached:!1,available:!1};const c=await U(),s=await Q(),r=c.apiBaseUrl.replace(/\/$/,""),m=n==="resume"?It():"",w=`type=${n}${m?`&tailoredResumeId=${encodeURIComponent(m)}`:""}`,v=await O(`${r}/api/extension/jobs/${x}/pdf?${w}`,{method:"GET",headers:{Authorization:`Bearer ${s}`,Accept:"application/pdf"},responseType:"base64"}),H=v.json||{};if(v.base64&&v.ok){const g=n==="resume"?"HireIQ-resume.pdf":"HireIQ-cover.pdf",C=rn(v.base64,g,v.contentType||"application/pdf");return{attached:sn(a,C),available:!0}}return{attached:!1,available:!!H.available}}function St(){te(I)}function Lt(){x||(Ae.innerHTML="")}function te(n){var r,m,w,v,H;if(I={...n,hasResumeInput:n.hasResumeInput??!!W(),hasCoverInput:n.hasCoverInput??!!oe()},!x){Ae.innerHTML="";return}const a=!!I.hasResumeInput,c=[];if(c.push(`<div class="doc-actions">
      <button type="button" class="btn secondary" id="hiq-gen-resume">Generate tailored resume</button>
      <button type="button" class="btn secondary" id="hiq-gen-cover">Generate cover letter</button>
      <button type="button" class="btn linkish" id="hiq-open">Open job in HireIQ →</button>
    </div>`),a&&c.push(I.resumeAttached?'<div class="check ok"><span>✓</span><span>Resume PDF attached</span></div>':'<div class="check need"><span>○</span><span>Resume PDF — required for this form</span></div>'),_.length>0){const g=_.map(C=>{var j;return`<option value="${A(C.id)}"${C.id===(z||((j=_[0])==null?void 0:j.id))?" selected":""}>${A(C.label)}</option>`}).join("");c.push(`<label class="muted" for="hiq-resume-pick" style="display:block;margin-bottom:2px">Resume version</label><select id="hiq-resume-pick">${g}</select>`),a&&!I.resumeAttached&&c.push('<button type="button" class="btn secondary" id="hiq-attach-resume">Attach selected resume</button>')}else a&&c.push('<div class="muted">No tailored resume yet — generate on HireIQ, then come back.</div>');I.hasCoverInput&&(I.coverAttached?c.push('<div class="check ok"><span>✓</span><span>Cover letter attached</span></div>'):I.coverAvailable&&c.push('<button type="button" class="btn secondary" id="hiq-attach-cover">Attach cover letter</button>')),Ae.innerHTML=c.join(""),D&&ee(re(D)),(r=t.getElementById("hiq-gen-resume"))==null||r.addEventListener("click",()=>{ye(Re||K),f("Opened HireIQ to generate — come back to attach.","ok")}),(m=t.getElementById("hiq-gen-cover"))==null||m.addEventListener("click",()=>{ye(Fe||K),f("Opened HireIQ for cover letter.","ok")}),(w=t.getElementById("hiq-open"))==null||w.addEventListener("click",()=>ye(K));const s=t.getElementById("hiq-resume-pick");s&&s.addEventListener("change",()=>{z=s.value}),(v=t.getElementById("hiq-attach-resume"))==null||v.addEventListener("click",async()=>{f("Attaching resume…");try{const g=await he("resume");te({...I,resumeAttached:g.attached,resumeAvailable:g.available,hasResumeInput:!!W()}),f(g.attached?"Resume attached.":"Resume PDF not ready yet — generate on HireIQ first.",g.attached?"ok":"err"),P()}catch(g){f(ie(g),"err")}}),(H=t.getElementById("hiq-attach-cover"))==null||H.addEventListener("click",async()=>{f("Attaching cover…");try{const g=await he("cover");te({...I,coverAttached:g.attached,coverAvailable:g.available,hasCoverInput:!!oe()}),f(g.attached?"Cover attached.":"Cover not ready yet.",g.attached?"ok":"err"),P()}catch(g){f(ie(g),"err")}})}async function De(){var c;if(!x)return;const n=z||((c=_[0])==null?void 0:c.id)||"";await be();const a=_[0];a&&a.id!==n&&(z=a.id,f(`New resume ready: ${a.label}`,"ok")),te({...I,hasResumeInput:!!W(),hasCoverInput:!!oe()})}de.addEventListener("click",()=>{e.setAttribute("data-collapsed","1")}),ue.addEventListener("click",()=>{e.removeAttribute("data-collapsed")});function ye(n){n&&window.open(n,"_blank","noopener,noreferrer")}function Je(){const n=et(document);n.needsAccount?(y.classList.add("show"),S.textContent=n.reason):y.classList.remove("show")}k.addEventListener("click",async()=>{const n=T.value.trim();if(!n){f("Enter the email you used on this employer site.","err");return}if(!x){f("Save the job to HireIQ first, then save the ATS email.","err");return}k.disabled=!0;try{const a=await U(),c=await Q(),s=await O(`${a.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${x}/ats-account`,{method:"PATCH",headers:{Authorization:`Bearer ${c}`,"Content-Type":"application/json"},body:JSON.stringify({email:n,note:et(document).kind})}),r=s.json||{};if(!s.ok)throw new Error(r.error||s.error||"Failed to save ATS email");f(`Saved ATS email ${n} for tracking.`,"ok")}catch(a){f(a instanceof Error?a.message:"Failed to save ATS email","err")}finally{k.disabled=!1}}),J.addEventListener("click",()=>ye($e)),$.addEventListener("click",async()=>{if(!x){f("Save this job first","err");return}if(nt(location.href)){f("Submit this application yourself on LinkedIn / Indeed.","err");return}const n=ot(document);if(!n){f("No Submit / Apply button found on this page.","err"),P();return}if(Ie()&&!fe()){f("Attach a resume under Autofill Information first.","err"),P();return}const a=Qe();if(!(a>0&&!window.confirm(`${a} answer(s) still need Accept or Skip. Submit the employer form anyway?`))){$.disabled=!0,f(`Clicking “${n.label}” on the page…`);try{await Ue(),R(n.el),bn(n),await qt(),f(`Submitted via “${n.label}”. Marked Applied in HireIQ.`,"ok"),$.textContent="Submitted"}catch(c){f(ie(c),"err"),$.disabled=!1,P()}}}),d.addEventListener("click",async()=>{d.disabled=!0,f("Saving to HireIQ…");try{await At();const n=[le().title,le().company].filter(Boolean);f(`Saved${n.length?`: ${n.join(" · ")}`:""}. Next: Autofill or generate docs.`,"ok")}catch(n){f(ie(n),"err"),d.disabled=!1}}),b.addEventListener("click",async()=>{var n,a;b.disabled=!0,E=[],L=null,G();try{await Ue();const c=D||await Ne();f("Filling known fields…");const s=await nn(c,{onField:u=>f(`Filling: ${u.slice(0,40)}…`)});ee(s);const r=on().slice(0,25);f("Reading dropdown options…"),await Yt(r);const m=u=>!!(u.choices&&u.choices.length>=2),w=r.filter(u=>!m(u)&&Ut(u.kind,c)),v=new Set(w.map(u=>u.key)),H=r.filter(u=>m(u)&&!v.has(u.key)),g=r.filter(u=>!m(u)&&!v.has(u.key)&&!We(u.label)),C=r.filter(u=>!m(u)&&!v.has(u.key)&&We(u.label));for(const u of w){const V=Nt(u.kind);E.push({key:u.key,label:u.label,answer:"",lasting:V,el:u.el,status:"pending",askPromote:!1,manual:!0,missingProfile:!0,placeholder:Ot(u.kind)})}for(const u of H){const V=u.kind==="country"&&c.country&&((n=u.choices)!=null&&n.length)?tt(c.country,u.choices):null;E.push({key:u.key,label:u.label,answer:(V==null?void 0:V.label)||"",lasting:!1,el:u.el,status:"pending",askPromote:!1,choices:u.choices,choiceMode:u.choiceMode})}if(g.length){f(`Drafting ${g.length} unanswered questions…`);const u=await U(),V=await Q(),Le=le(),ve=await O(`${u.apiBaseUrl.replace(/\/$/,"")}/api/extension/autofill/drafts`,{method:"POST",headers:{Authorization:`Bearer ${V}`,"Content-Type":"application/json"},body:JSON.stringify({jobId:x,title:Le.title,company:Le.company,description:Le.description.slice(0,4e3),fields:g.map(ne=>({key:ne.key,label:ne.label,required:ne.required,inputType:ne.inputType}))})}),Ve=ve.json||{};if(!ve.ok)f(Ve.error||ve.error||`Drafts failed (${ve.status}) — known fields still filled.`,"err");else{const ne=new Map((Ve.drafts||[]).map(M=>[M.key,M]));for(const M of g){const N=ne.get(M.key);if(!N||N.skip||!((a=N.answer)!=null&&a.trim())){E.push({key:M.key,label:M.label,answer:"",lasting:!!(N!=null&&N.lasting),el:M.el,status:"pending",askPromote:!1,manual:!0});continue}Ze(M.el,N.answer.trim()),E.push({key:M.key,label:M.label,answer:N.answer.trim(),lasting:!!N.lasting,el:M.el,status:"pending",askPromote:!1})}}}for(const u of C)E.push({key:u.key,label:u.label,answer:"",lasting:!1,el:u.el,status:"pending",askPromote:!1,manual:!0});L=me(),G(),ee(re(c)),await be();const j=W(),se=oe();let ge=!1,we=!1,Ke=!1,Ge=!1;if(j){f("Attaching resume PDF…");const u=await he("resume");ge=!!(u!=null&&u.attached),Ke=!!(u!=null&&u.available||u!=null&&u.attached),ge&&R(j)}if(se){f("Attaching cover letter PDF…");const u=await he("cover");we=!!(u!=null&&u.attached),Ge=!!(u!=null&&u.available||u!=null&&u.attached),we&&R(se)}te({hasResumeInput:!!j,hasCoverInput:!!se,resumeAttached:ge,coverAttached:we,resumeAvailable:Ke,coverAvailable:Ge});const Se=[s.filledCount?`${s.filledCount} known`:"",E.length?`${E.length} to review`:"",ge?"resume attached":"",we?"cover attached":""].filter(Boolean),Bt=E.some(u=>!u.manual)?" Gray drafts need Accept before submit.":E.length?" Answer the remaining questions in the panel.":"";f(Se.length?`Autofill done: ${Se.join(" · ")}.${Bt}`:"No matching fields found on this page.",Se.length?"ok":"err"),P()}catch(c){f(ie(c),"err")}finally{b.disabled=!x}}),Je(),P(),f("Checking save status…"),b.disabled=!0;const Tt=()=>{document.visibilityState==="visible"&&De()};document.addEventListener("visibilitychange",Tt),window.addEventListener("focus",()=>{De()}),(async()=>{try{await $t()}catch(n){f(ie(n),"err"),Ce()}try{const n=await Ne();ee(re(n))}catch{q.textContent="Connect HireIQ in the popup to load master resume.",F.textContent="Connect HireIQ…"}})()}function it(){if(!ke(location.href,document).isJobPage){mn();return}wn()}function yt(){it();let e=location.href;setInterval(()=>{location.href!==e&&(e=location.href,it())},800),chrome.runtime.sendMessage({type:"HIREIQ_DETECT",detect:ke(location.href,document)}).catch(()=>{})}function xn(){yt()}yt();export{xn as onExecute};
