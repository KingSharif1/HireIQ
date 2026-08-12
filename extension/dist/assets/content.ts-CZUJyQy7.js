import{d as ke,g as U}from"./settings-CXfgVSA7.js";const Bt=/\b(back to jobs|create a job alert|quick apply|mygreenhouse|cookie|privacy policy|equal opportunity|eeo)\b/gi;function _t(e,t){const o=t.match(/\bat\s+(.+)$/i);if(o!=null&&o[1])return o[1].replace(/\s*[|\-–—].*$/,"").trim();const a=e.match(/\bat\s+(.+)$/i);return a!=null&&a[1]?a[1].trim():""}function Ht(e){const t=["#content",".job__description",".job-post-content",'[data-qa="job-description"]',".posting-page",".posting",'[class*="JobDescription"]',"[data-job-description]",".job-description","#job-description","div#app_body","article"];let o=null;for(const b of t){const y=e.querySelector(b);if(y&&(y.textContent||"").trim().length>80){o=y;break}}o||(o=e.querySelector("main")||e.body);const a=o.cloneNode(!0);a.querySelectorAll('nav, header, footer, script, style, noscript, iframe, button, form, [class*="cookie"], [class*="alert"]').forEach(b=>b.remove());const u=[],l=b=>{const y=b.replace(Bt," ").replace(/[ \t]+/g," ").trim();y.length>2&&u.push(y)},c=a.querySelectorAll("p, li, h1, h2, h3, h4, section");c.length>3?c.forEach(b=>l(b.textContent||"")):(a.innerText||a.textContent||"").replace(/\r\n?/g,`
`).split(/\n+/).forEach(l);const h=[];for(const b of u)h[h.length-1]!==b&&(/^(apply|back|jobs?|careers?)$/i.test(b)||h.push(b));return h.join(`

`).slice(0,2e4)}function jt(e=document){var S,B,k,I,_,R,D,de,ue,pe;const o=typeof location<"u"?location.href:"",a=((B=(S=e.querySelector('meta[property="og:title"]'))==null?void 0:S.getAttribute("content"))==null?void 0:B.trim())||"",u=((I=(k=e.querySelector("h1"))==null?void 0:k.textContent)==null?void 0:I.trim())||"",l=e.title||"";let c=u||a||l.replace(/\s*[|\-–—].*$/,"").trim()||"Untitled role";c=c.replace(/\s+at\s+.+$/i,"").trim()||c;const h=((R=(_=e.querySelector('[data-company], .company, .employer, [class*="companyName"]'))==null?void 0:_.textContent)==null?void 0:R.trim())||((de=(D=e.querySelector('meta[property="og:site_name"]'))==null?void 0:D.getAttribute("content"))==null?void 0:de.trim())||_t(a||u,l)||"",b=((pe=(ue=e.querySelector('[data-location], .location, [class*="jobLocation"], .job__location, .app-location'))==null?void 0:ue.textContent)==null?void 0:pe.trim())||"";let y=Ht(e);return y.length<40&&(y=`Saved from ${o}`),{url:o,title:c.slice(0,500),company:h.slice(0,500),description:y,location:b.slice(0,500)}}const Mt=[/\brace\b/i,/ethnic/i,/\bgender\b/i,/\bsex\b/i,/veteran/i,/military/i,/disabilit/i,/\blgbt/i,/religion/i,/convict/i,/criminal/i,/felony/i,/misdemeanor/i,/salary/i,/compensation/i,/\bwage\b/i,/pay\s*rate/i,/authorized to work/i,/work authorization/i,/work\s*auth/i,/\bvisa\b/i,/citizenship/i,/sponsorship/i,/\bssn\b/i,/social security/i,/date of birth/i,/\bdob\b/i,/\bage\b/i];function Ve(e){const t=(e||"").trim();return t?Mt.some(o=>o.test(t)):!1}function Pt(e){return e.toLowerCase().replace(/[_\-]+/g," ").replace(/\s+/g," ").trim()}function Rt(e){const t=(e.type||"").toLowerCase();if(t==="hidden"||t==="submit"||t==="button"||t==="checkbox"||t==="radio"||t==="file")return"skip";const o=Pt([e.name,e.id,e.label,e.placeholder,e.autocomplete].filter(Boolean).join(" "));return o?/\b(password|captcha|csrf|token|honeypot)\b/.test(o)||/\b(cover\s*letter|resume|cv|attach)\b/.test(o)&&t==="file"?"skip":t==="email"||/\b(e[\s-]?mail|emailaddress)\b/.test(o)?"email":t==="tel"||/\b(phone|mobile|cell|tel)\b/.test(o)?"phone":/\b(preferred\s*(first\s*)?name|pref\s*name|nickname)\b/.test(o)?"preferred_name":/\b(first\s*name|fname|given\s*name)\b/.test(o)||e.autocomplete==="given-name"?"first_name":/\b(last\s*name|lname|surname|family\s*name)\b/.test(o)||e.autocomplete==="family-name"?"last_name":/^(name|full name)$/.test(o)?"unknown":/\blinkedin\b/.test(o)?"linkedin":/\b(website|portfolio|personal\s*site|github\.com|homepage)\b/.test(o)?"website":/\bcountry\b/.test(o)?"country":/\b(how\s*did\s*you\s*hear|hear\s*about|referral\s*source|source)\b/.test(o)?"how_heard":e.name==="first_name"||e.id==="first_name"?"first_name":e.name==="last_name"||e.id==="last_name"?"last_name":e.name==="preferred_name"?"preferred_name":"unknown":"unknown"}function _e(e,t){switch(e){case"first_name":return t.firstName||null;case"last_name":return t.lastName||null;case"preferred_name":return t.preferredName||t.firstName||null;case"email":return t.email||null;case"phone":return t.phone||null;case"linkedin":return t.linkedin||null;case"website":return t.website||null;case"country":return t.country||null;case"how_heard":return t.howHeard||null;default:return null}}function Ft(e){return e!=="unknown"&&e!=="skip"}function zt(e){return e==="email"||e==="phone"||e==="linkedin"||e==="website"||e==="first_name"||e==="last_name"||e==="preferred_name"||e==="country"}function Ut(e,t){return Ft(e)&&!_e(e,t)}function Nt(e){switch(e){case"email":return"Add your email…";case"phone":return"Add your phone number…";case"linkedin":return"Add your LinkedIn URL…";case"website":return"Add your website / portfolio…";case"first_name":return"Add your first name…";case"last_name":return"Add your last name…";case"preferred_name":return"Add your preferred name…";case"country":return"Add your country…";case"how_heard":return"How did you hear about this role?";default:return"Type your answer…"}}function Le(e){const t=[e.name||"",e.id||"",e.getAttribute("aria-label")||""];e.labels&&Array.from(e.labels).forEach(a=>t.push(a.innerText||""));const o=e.closest("div, label, fieldset, li, td");return o&&t.push(o.textContent||""),t.join(" ").toLowerCase().replace(/\s+/g," ")}function at(){return Array.from(document.querySelectorAll('input[type="file"]')).filter(e=>e instanceof HTMLInputElement)}function Qt(){const e=at(),t=e.find(o=>{const a=Le(o);return/\b(resume|cv|curriculum)\b/.test(a)&&!/\bcover\b/.test(a)});return t||(e.length===1?e[0]:e.find(o=>!/\bcover\b/.test(Le(o)))||null)}function Ot(){return at().find(e=>{const t=Le(e);return/\bcover\s*(letter)?\b/.test(t)})||null}function Dt(e,t){var o;try{const a=new DataTransfer;return a.items.add(t),e.files=a.files,e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),(((o=e.files)==null?void 0:o.length)??0)>0}catch{return!1}}const Jt=650,Kt=180,st="#9ca3af",We="hireiq-autofill-styles";function Ee(){if(document.getElementById(We))return;const e=document.createElement("style");e.id=We,e.textContent=`
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
  `,(document.head||document.documentElement).appendChild(e)}function Z(e){return new Promise(t=>setTimeout(t,e))}function ce(e){if(e.labels&&e.labels[0])return e.labels[0].innerText.replace(/\s+/g," ").trim();const t=e.getAttribute("aria-label");if(t)return t.trim();const o=e.getAttribute("placeholder");return o?o.trim():e.name||e.id||e.type||"field"}function rt(e){if(e.required)return!0;const t=ce(e);return/\*\s*$/.test(t)||/\brequired\b/i.test(t)}function ee(e,t){var u;const o=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,a=Object.getOwnPropertyDescriptor(o,"value");(u=a==null?void 0:a.set)==null||u.call(e,t),e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),e.dispatchEvent(new KeyboardEvent("keyup",{bubbles:!0}))}function Gt(){return Array.from(document.querySelectorAll("input, textarea, select")).filter(e=>!(!(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement)||e instanceof HTMLInputElement&&e.type==="hidden"||e.getAttribute("aria-hidden")==="true"||e instanceof HTMLInputElement&&e.tabIndex<0&&e.getAttribute("role")!=="combobox"))}function Vt(e){return e instanceof HTMLInputElement&&(e.getAttribute("role")==="combobox"||e.classList.contains("select__input")||e.getAttribute("aria-autocomplete")==="list")}function lt(e){const t=e.closest(".select__control")||e.closest('[class*="select__control"]')||e,o=t.getBoundingClientRect(),a=o.left+Math.max(o.width/2,4),u=o.top+Math.max(o.height/2,4);for(const l of["pointerdown","mousedown","pointerup","mouseup","click"])t.dispatchEvent(new MouseEvent(l,{bubbles:!0,cancelable:!0,clientX:a,clientY:u,view:window}));e.focus(),e.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowDown",code:"ArrowDown",bubbles:!0,cancelable:!0}))}function ct(e){e.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:!0,cancelable:!0})),document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:!0,cancelable:!0}))}function Te(e){var c;const t=e.getAttribute("aria-controls"),o=(t?document.getElementById(t):null)||((c=e.closest(".select-shell"))==null?void 0:c.querySelector('.select__menu, [class*="select__menu"]'))||document.querySelector('.select__menu, [class*="MenuList"]'),a=Array.from(o?o.querySelectorAll('.select__option, [class*="select__option"], [role="option"]'):document.querySelectorAll(`[id^="react-select-${CSS.escape(e.id)}-option"], [role="option"]`)),u=new Set,l=[];for(const h of a){const b=(h.textContent||"").replace(/\s+/g," ").trim();if(!b||/^select(\s*\.{0,3}|(\s+one))?$/i.test(b))continue;const y=b.toLowerCase();u.has(y)||(u.add(y),l.push({value:b,label:b}))}return l}async function dt(e,t){const o=(t==null?void 0:t.maxChoices)??8;lt(e),await Z(220);for(let u=0;u<6&&!(e.getAttribute("aria-expanded")==="true"||Te(e).length);u++)await Z(80);const a=Te(e);return ct(e),await Z(80),a.length<2||a.length>o?[]:a}async function Wt(e){for(const t of e)if(t.choiceMode==="combobox"&&t.el instanceof HTMLInputElement)try{const o=t.kind==="country"||/\bcountry\b/i.test(t.label)||/\bnationality\b/i.test(t.label),a=await dt(t.el,{maxChoices:o?300:8});a.length>=2&&(t.choices=a)}catch{}}async function ut(e,t){var h;if(!(e instanceof HTMLInputElement))return!1;lt(e),await Z(200);for(let b=0;b<6&&!(e.getAttribute("aria-expanded")==="true"||Te(e).length);b++)await Z(80);const o=e.getAttribute("aria-controls"),a=(o?document.getElementById(o):null)||((h=e.closest(".select-shell"))==null?void 0:h.querySelector('.select__menu, [class*="select__menu"]'))||document.querySelector(".select__menu"),u=Array.from(a?a.querySelectorAll('.select__option, [class*="select__option"], [role="option"]'):document.querySelectorAll(`[id^="react-select-${CSS.escape(e.id)}-option"]`)),l=t.label.replace(/\s+/g," ").trim().toLowerCase(),c=u.find(b=>(b.textContent||"").replace(/\s+/g," ").trim().toLowerCase()===l);return c instanceof HTMLElement?(c.click(),P(e),await Z(100),!0):(ct(e),!1)}function Ye(e,t,o){return(e.name||e.id||t||`field_${o}`).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,80)||`field_${o}`}function Yt(e){return{name:e.name||"",id:e.id||"",type:e instanceof HTMLInputElement?e.type:e.tagName.toLowerCase(),label:ce(e),placeholder:e.getAttribute("placeholder")||"",autocomplete:e.getAttribute("autocomplete")||""}}function P(e){Ee(),e instanceof HTMLElement&&(e.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"}),e.classList.add("hiq-flash-green"),window.setTimeout(()=>e.classList.remove("hiq-flash-green"),Jt))}function Xt(e){return Array.from(e.options).filter(t=>!t.disabled).map(t=>({value:t.value,label:(t.label||t.textContent||t.value).replace(/\s+/g," ").trim()})).filter(t=>t.label&&!/^select(\s+one)?$/i.test(t.label)&&t.value!=="")}function Zt(e){const t=e.closest("label");if(t){const a=t.cloneNode(!0);a.querySelectorAll("input").forEach(l=>l.remove());const u=(a.textContent||"").replace(/\s+/g," ").trim();if(u&&u.length<80)return u}const o=e.nextSibling;if(o&&o.nodeType===Node.TEXT_NODE){const a=(o.textContent||"").replace(/\s+/g," ").trim();if(a)return a}return e.value||"Option"}function en(e){var l,c;const t=Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(e)}"]`)).filter(h=>h instanceof HTMLInputElement),o=t.map(h=>({value:h.value,label:Zt(h)})),a=t[0],u=a&&(((c=(l=a.closest("fieldset"))==null?void 0:l.querySelector("legend"))==null?void 0:c.textContent)||a.getAttribute("aria-label")||ce(a))||e;return{els:t,choices:o,label:String(u).replace(/\s+/g," ").trim().slice(0,200)||e,required:t.some(h=>rt(h))}}function pt(e,t,o){if(o==="radio"||e instanceof HTMLInputElement&&e.type==="radio"){const a=e.name,u=a?Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(a)}"]`)):[e];for(const l of u){if(!(l instanceof HTMLInputElement))continue;if(l.value===t.value||ce(l).replace(/\s+/g," ").trim().toLowerCase()===t.label.replace(/\s+/g," ").trim().toLowerCase()){l.checked=!0,l.dispatchEvent(new Event("input",{bubbles:!0})),l.dispatchEvent(new Event("change",{bubbles:!0})),l.click(),P(l);return}}return}if(e instanceof HTMLSelectElement){const a=Array.from(e.options).find(u=>u.value===t.value)||Array.from(e.options).find(u=>(u.label||u.textContent||"").replace(/\s+/g," ").trim().toLowerCase()===t.label.replace(/\s+/g," ").trim().toLowerCase());a&&(ee(e,a.value),P(e));return}ee(e,t.label||t.value),P(e)}function He(){var u;const e=[],t=new Set,o=new Set;let a=0;for(const l of Gt()){if(l instanceof HTMLInputElement&&l.type==="radio"){const k=l.name||l.id;if(!k||o.has(k))continue;o.add(k);const I=en(k);if(I.choices.length<2)continue;let _=Ye(l,I.label,a++);t.has(_)&&(_=`${_}_${a}`),t.add(_);const R=I.els.find(D=>D.checked);e.push({key:_,el:I.els[0],label:I.label.slice(0,200),required:I.required,kind:"unknown",inputType:"radio",value:R?(R.value||ce(R)).trim():"",choices:I.choices,choiceMode:"radio"});continue}const c=Yt(l),h=Rt(c);if(h==="skip")continue;let b=Ye(l,c.label,a++);t.has(b)&&(b=`${b}_${a}`),t.add(b);const y=l instanceof HTMLSelectElement?Xt(l):void 0,S=Vt(l);let B=(l.value||"").trim();if(S&&!B){const k=(u=l.closest(".select__control, .select-shell"))==null?void 0:u.querySelector('.select__single-value, [class*="singleValue"]');B=((k==null?void 0:k.textContent)||"").replace(/\s+/g," ").trim()}e.push({key:b,el:l,label:c.label.slice(0,200),required:rt(l),kind:h,inputType:S?"combobox":c.type,value:B,...y&&y.length>=2?{choices:y,choiceMode:"select"}:S?{choiceMode:"combobox"}:{}})}return e}function ft(e){const t=[];let o=0,a=0,u=0,l=0;for(const c of He()){const h=_e(c.kind,e);c.kind!=="unknown"&&!!h&&(a+=1),c.required&&(l+=1);const y=!!c.value;y&&(o+=1,c.required&&(u+=1)),(c.kind!=="unknown"||c.required)&&t.push({kind:c.kind,label:c.label.slice(0,80),required:c.required,filled:y,value:y?c.value.slice(0,60):""})}return{items:t,filledCount:o,fillableCount:a,requiredFilled:u,requiredTotal:l}}async function tn(e,t){var u,l;Ee();const o=(t==null?void 0:t.delayMs)??Kt,a=He();for(const c of a){if(c.kind==="unknown"||c.kind==="skip")continue;const h=_e(c.kind,e);if(!h)continue;let b=(c.el.value||"").trim();if(!b&&c.choiceMode==="combobox"){const y=(u=c.el.closest(".select__control, .select-shell"))==null?void 0:u.querySelector('.select__single-value, [class*="singleValue"]');b=((y==null?void 0:y.textContent)||"").replace(/\s+/g," ").trim()}if(!b){if(P(c.el),c.choiceMode==="combobox"){const y=c.kind==="country"||/\bcountry\b/i.test(c.label),S=await dt(c.el,{maxChoices:y?300:8}),B=S.find(k=>k.label.toLowerCase()===h.toLowerCase())||S.find(k=>k.label.toLowerCase().includes(h.toLowerCase()))||S.find(k=>h.toLowerCase().includes(k.label.toLowerCase()));B?await ut(c.el,B):ee(c.el,h)}else c.choiceMode==="select"&&c.el instanceof HTMLSelectElement?pt(c.el,{value:h,label:h},"select"):ee(c.el,h);(l=t==null?void 0:t.onField)==null||l.call(t,c.label),await Z(o)}}return ft(e)}function ve(e){return e?ft(e):{items:[],filledCount:0,fillableCount:0,requiredFilled:0,requiredTotal:0}}function nn(){return He().filter(e=>{if(e.kind==="skip"||e.value)return!1;const t=e.inputType.toLowerCase();return!(t==="file"||t==="password"||t==="hidden")})}function Xe(e,t){Ee(),ee(e,t),e.setAttribute("data-hiq-state","provisional"),e.style.color=st}function xe(e,t){Ee(),typeof t=="string"&&ee(e,t),e.setAttribute("data-hiq-state","accepted"),e.style.color="",P(e),window.setTimeout(()=>{e.getAttribute("data-hiq-state")==="accepted"&&(e.style.outline="")},1200)}function on(e){e.getAttribute("data-hiq-state")==="provisional"&&ee(e,""),e.removeAttribute("data-hiq-state"),e.style.color="",e.style.outline=""}function Y(){return Qt()}function le(){return Ot()}function an(e,t){return Dt(e,t)}function bt(e){const t=e instanceof Error?e.message:String(e||"");return/extension context invalidated/i.test(t)||/context invalidated/i.test(t)}function ie(e){return bt(e)?"HireIQ was updated — refresh this tab, then try again.":e instanceof Error?e.message:String(e||"Something went wrong")}async function mt(e){try{return await chrome.runtime.sendMessage(e)}catch(t){throw bt(t)?new Error("HireIQ was updated — refresh this tab, then try again."):t}}async function N(e,t){return mt({type:"HIREIQ_FETCH",url:e,init:t})}async function Q(){const e=await mt({type:"HIREIQ_GET_BEARER"});if(!(e!=null&&e.ok)||!e.token)throw new Error((e==null?void 0:e.error)||"Sign in with Google in the HireIQ popup first");return e.token}function sn(e,t,o){const a=atob(e),u=new Uint8Array(a.length);for(let l=0;l<a.length;l++)u[l]=a.charCodeAt(l);return new File([u],t,{type:o})}function rn(e){const t=e.text.replace(/\s+/g," ").slice(0,8e3).toLowerCase(),o=e.passwordCount>0,a=e.applyFieldCount,u=/create (an )?account|sign up|register|new user|join (us|now)|don't have an account|create your profile/i.test(t),l=/sign in|log in|already have an account|welcome back|forgot (your )?password/i.test(t);return o&&u&&a<2?{needsAccount:!0,kind:"signup",reason:"This page asks you to create an account before applying."}:o&&l&&a<2?{needsAccount:!0,kind:"login",reason:"This page asks you to sign in to the employer site."}:e.passwordCount>=2&&a<2?{needsAccount:!0,kind:"signup",reason:"Looks like an account registration form."}:{needsAccount:!1,kind:a>0?"apply":"unknown",reason:"Application form detected (or unknown page)."}}function Ze(e){var u;const t=((u=e.body)==null?void 0:u.innerText)||"",o=e.querySelectorAll('input[type="password"]').length,a=e.querySelectorAll('input[name="first_name"], input[name="last_name"], input[name="resume"], textarea[name="cover_letter"], #first_name, #last_name').length;return rn({text:t,passwordCount:o,applyFieldCount:a})}function ht(e){return e.replace(/\s+/g," ").trim().toLowerCase()}function ln(e){const t=ht(e);return t?/\bif\s+yes\b/.test(t)||/\bif\s+so\b/.test(t)||/\bplease\s+(explain|describe|specify|elaborate|provide)\b/.test(t)||/\bexplain\b/.test(t)||/\badditional\s+(details?|info|information|comments?)\b/.test(t)||/\bcomments?\b/.test(t)||/\bdetails?\b/.test(t)||/\bwhy\b/.test(t)||/\bdescribe\b/.test(t):!1}function cn(e){const t=ht(e);return/^(no|n|false|none|not applicable|n\/a)$/.test(t)}const Se="N/A";function et(e,t){const o=e.replace(/\s+/g," ").trim().toLowerCase();if(!o||!t.length)return null;const a=t.find(l=>l.label.toLowerCase()===o||l.value.toLowerCase()===o)||null;if(a)return a;const u=t.find(l=>l.label.toLowerCase().startsWith(o)||l.value.toLowerCase().startsWith(o))||null;return u||t.find(l=>l.label.toLowerCase().includes(o)||l.value.toLowerCase().includes(o))||null}function tt(e,t=""){const o=`${e}
${t}`.toLowerCase();return!o.trim()||/\b(senior|staff|principal|lead|director|manager|architect)\b/.test(o)&&!/\bintern/.test(o)?!1:/\bintern(ship)?\b/.test(o)||/\bnew\s*grad(uate)?s?\b/.test(o)||/\brecent\s+grad(uate)?s?\b/.test(o)||/\bentry[-\s]?level\b/.test(o)||/\bjunior\b/.test(o)||/\bapprentice\b/.test(o)||/\buniversity\s+grad/.test(o)||/\b0\s*[-–to]+\s*2\s*years?\b/.test(o)||/\bco-?op\b/.test(o)}const dn=["linkedin.com","indeed.com"];function nt(e){try{const t=new URL(e).hostname.toLowerCase();return dn.some(o=>t===o||t.endsWith(`.${o}`))}catch{return!0}}function un(e){const t=e.toLowerCase().replace(/\s+/g," ").trim();return!t||/\b(cancel|back|upload|attach|delete|remove|sign out|log out)\b/i.test(t)?0:/submit (your )?application|send application|apply for this job/i.test(t)||/^submit application$/i.test(t)?100:/^submit$/i.test(t)?85:/^apply( now)?$/i.test(t)?80:/submit application/i.test(t)?95:/^(continue|next|save and continue|review)$/i.test(t)?35:/\bsubmit\b/i.test(t)?60:0}function pn(e){var a;if(e instanceof HTMLInputElement||e instanceof HTMLButtonElement){const u=(e.value||"").trim();if(u)return u}const t=(a=e.getAttribute("aria-label"))==null?void 0:a.trim();return t||(e.innerText||e.textContent||"").replace(/\s+/g," ").trim().slice(0,120)}function ot(e=document){const t=[...e.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"], a.button, a[class*="btn"]')];let o=null;for(const a of t){if(a instanceof HTMLInputElement&&a.type==="hidden")continue;const u=a.getBoundingClientRect();if(u.width<2&&u.height<2||a.disabled)continue;const l=pn(a),c=un(l);c<=0||(!o||c>o.score)&&(o={el:a,label:l,score:c})}return o}function fn(e){e.el.scrollIntoView({behavior:"smooth",block:"center"}),e.el.style.outline="3px solid #0d9488",e.el.style.outlineOffset="3px",e.el.click()}const Be="hireiq-panel-root";function X(){return jt(document)}function bn(){var e;(e=document.getElementById(Be))==null||e.remove()}function mn(e,t){return t<=0?0:Math.round(e/t*100)}function hn(e){return e.items.length?e.items.slice(0,12).map(o=>{const a=o.filled?"✓":"○";return`<div class="check ${o.filled?"ok":o.required?"need":"opt"}"><span>${a}</span><span>${$(o.label)}</span></div>`}).join(""):'<div class="muted">No form fields detected yet — scroll to the application form.</div>'}function $(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function yn(e){return e==="apply"?"Apply page":e==="posting"?"Job posting":""}function gn(){if(document.getElementById(Be))return;const e=document.createElement("div");e.id=Be,e.attachShadow({mode:"open"});const t=e.shadowRoot,o=X(),a=ke(location.href,document),u=yn(a.pageKind);t.innerHTML=`
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
            <p class="company" id="hiq-company">${$(o.company||"Job page")}</p>
            <p class="title" id="hiq-title">${$(o.title.slice(0,100))}</p>
            <p class="page-kind" id="hiq-page-kind"${u?"":" hidden"}>${$(u)}</p>
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
          <details class="section" id="hiq-autofill-info">
            <summary>
              <span class="sum-title">Your Autofill Information</span>
              <span class="muted" id="hiq-preview-summary">Sign in to load…</span>
            </summary>
            <div class="section-body">
              <div class="muted" id="hiq-preview-loading">Sign in to load master resume…</div>
              <div class="kv" id="hiq-preview" hidden></div>
              <button type="button" class="btn linkish" id="hiq-edit-profile" hidden>Edit master profile →</button>
            </div>
          </details>
          <div class="section review" id="hiq-review">
            <h3>Review AI answers</h3>
            <div id="hiq-review-list"></div>
          </div>
          <div class="section submit" id="hiq-submit-wrap">
            <h3>Submit</h3>
            <p class="hint" id="hiq-submit-hint">You watch the click — HireIQ never submits silently.</p>
            <button type="button" class="btn primary" id="hiq-submit" disabled>Submit on this site</button>
          </div>
          <div class="section files" id="hiq-files">
            <h3>Documents</h3>
            <p class="hint" id="hiq-files-hint">Generate on HireIQ, then attach the PDF here.</p>
            <div id="hiq-files-body"></div>
          </div>
          <div class="progress">
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
          <div class="status" id="hiq-status"></div>
        </div>
      </div>
    </div>
    <button type="button" class="fab" id="hiq-expand">HireIQ</button>
  `,document.body?document.body.appendChild(e):document.documentElement.appendChild(e);const l=t.getElementById("hiq-status"),c=t.getElementById("hiq-save"),h=t.getElementById("hiq-saved-chip"),b=t.getElementById("hiq-autofill"),y=t.getElementById("hiq-account"),S=t.getElementById("hiq-account-reason"),B=t.getElementById("hiq-ats-email"),k=t.getElementById("hiq-ats-save"),I=t.getElementById("hiq-preview-loading"),_=t.getElementById("hiq-preview"),R=t.getElementById("hiq-preview-summary"),D=t.getElementById("hiq-edit-profile"),de=t.getElementById("hiq-collapse"),ue=t.getElementById("hiq-expand"),pe=t.getElementById("hiq-checks"),gt=t.getElementById("hiq-prog-label"),wt=t.getElementById("hiq-prog-pct"),vt=t.getElementById("hiq-prog-bar"),je=t.getElementById("hiq-review"),te=t.getElementById("hiq-review-list"),J=t.getElementById("hiq-files"),xt=t.getElementById("hiq-submit-wrap"),A=t.getElementById("hiq-submit"),ae=t.getElementById("hiq-submit-hint"),Me=t.getElementById("hiq-files-body");let K="",Pe="",Re="",$e="",x="",ne=null,E=[],L=null,T=[],F="",j={};function f(n,i=""){l.className=`status${i?` ${i}`:""}`,l.textContent=n}function Fe(n){x=n.jobId,K=n.trackerUrl||K,Pe=n.resumeUrl||K,Re=n.coverUrl||K,c.hidden=!0,h.hidden=!1,b.disabled=!1,De(),M(),qt()}function kt(n){I.hidden=!0,_.hidden=!1;const i=[n.fullName,n.email,n.location].filter(Boolean).join(" · ");R.textContent=i||"Master profile loaded";const p=n.experience.filter(r=>r.title||r.company).map(r=>`${r.title}${r.company?` · ${r.company}`:""}`).slice(0,3).join(" · "),s=(n.skills||[]).slice(0,6).map(r=>`<span class="chip">${$(r)}</span>`).join("");_.innerHTML=`
      <div><b>Name</b><span>${$(n.fullName)}</span></div>
      ${n.headline?`<div><b>Title</b><span>${$(n.headline)}</span></div>`:""}
      <div><b>Email</b><span>${$(n.email)}</span></div>
      <div><b>Phone</b><span>${$(n.phone)}</span></div>
      ${n.location?`<div><b>Loc</b><span>${$(n.location)}</span></div>`:""}
      ${n.linkedin?`<div><b>LinkedIn</b><span>${$(n.linkedin)}</span></div>`:""}
      ${p?`<div><b>Exp</b><span>${$(p)}</span></div>`:""}
      ${s?`<div class="chips">${s}</div>`:""}
    `,D.hidden=!$e}function se(n){const i=n.requiredTotal||n.fillableCount||n.items.length,p=n.requiredTotal?n.requiredFilled:n.filledCount,s=mn(p,i);gt.textContent=i?`${p}/${i} ready`:"Form progress",wt.textContent=`${s}%`,vt.style.width=`${s}%`,pe.innerHTML=hn(n)}async function ze(){const n=await U(),i=await Q(),p=await N(`${n.apiBaseUrl.replace(/\/$/,"")}/api/extension/profile`,{headers:{Authorization:`Bearer ${i}`}}),s=p.json||{};if(!p.ok||!s.profile)throw new Error(s.error||p.error||`Profile failed (${p.status})`);return ne=s.profile,$e=s.profileUrl||"",s.autofillPreview&&kt(s.autofillPreview),s.profile}async function Ue(){if(x)return x;throw new Error("Save this job first")}async function Et(){if(x)return x;const n=await U(),i=await Q(),p=X(),s=ke(p.url,document);if(!s.isJobPage)throw new Error(s.reason);const r=await N(`${n.apiBaseUrl.replace(/\/$/,"")}/api/jobs`,{method:"POST",headers:{Authorization:`Bearer ${i}`,"Content-Type":"application/json"},body:JSON.stringify(p)}),m=r.json||{};if(!r.ok||!m.jobId)throw new Error(m.error||r.error||`Save failed (${r.status})`);return Fe({jobId:m.jobId,trackerUrl:m.trackerUrl,resumeUrl:m.resumeUrl,coverUrl:m.coverUrl}),await fe(),x}async function $t(){const n=await U(),i=await Q(),p=n.apiBaseUrl.replace(/\/$/,""),s=await N(`${p}/api/extension/jobs/by-url?url=${encodeURIComponent(location.href)}`,{headers:{Authorization:`Bearer ${i}`}}),r=s.json||{};if(!s.ok){f(r.error||s.error||"Could not check saved status","err"),Ae();return}r.saved&&r.jobId?(Fe({jobId:r.jobId,trackerUrl:r.trackerUrl,resumeUrl:r.resumeUrl,coverUrl:r.coverUrl}),f("Job already saved — Autofill ready.","ok"),await fe()):Ae()}function Ae(){x="",c.hidden=!1,c.disabled=!1,h.hidden=!0,b.disabled=!0,M(),f("Save this job first"),St()}async function fe(){var n;if(!x){T=[],F="";return}try{const i=await U(),p=await Q(),s=i.apiBaseUrl.replace(/\/$/,""),r=await N(`${s}/api/extension/jobs/${x}/resumes`,{headers:{Authorization:`Bearer ${p}`}}),m=r.json||{};if(!r.ok){T=[],F="";return}T=Array.isArray(m.resumes)?m.resumes:[],F=((n=T[0])==null?void 0:n.id)||"",J.classList.contains("show")?V(j):T.length>0&&V({hasResumeInput:!!Y(),hasCoverInput:!!le()})}catch{T=[],F=""}}function At(){var i;const n=t.getElementById("hiq-resume-pick");return n!=null&&n.value?n.value:F||((i=T[0])==null?void 0:i.id)||""}function be(n=0){const i=E.findIndex((s,r)=>r>=n&&s.status==="pending");if(i>=0)return i;const p=E.findIndex(s=>s.status==="pending");return p>=0?p:null}function G(){if(M(),!E.length){je.classList.remove("show"),te.innerHTML="",L=null;return}(L==null||!E[L]||E[L].status!=="pending")&&(L=be()),je.classList.add("show"),te.innerHTML=E.map((n,i)=>{var q;const p=n.status!=="pending",s=!p&&L===i,r=!!(n.choices&&n.choices.length>=2),m=r&&(((q=n.choices)==null?void 0:q.length)||0)>8,w=r?`${m?`<input class="choice-filter" data-filter-idx="${i}" type="search" placeholder="Type to filter…" autocomplete="off" />`:""}<div class="choice-row" data-choices="${i}">${n.choices.map((O,re)=>`<button type="button" class="btn sm secondary choice${n.answer&&(n.answer===O.label||n.answer===O.value)?" picked":""}" data-act="pick" data-idx="${i}" data-choice="${re}">${$(O.label)}</button>`).join("")}</div>`:"",g=r?"":`<textarea data-idx="${i}" placeholder="${$(n.placeholder||(n.manual?"Type your answer…":""))}">${$(n.answer)}</textarea>`,v=r?`<div class="row" data-actions="${i}">
              <button type="button" class="btn sm danger-ghost" data-act="skip" data-idx="${i}">Skip</button>
            </div>`:`<div class="row" data-actions="${i}">
              <button type="button" class="btn sm primary" data-act="accept" data-idx="${i}">${n.missingProfile?"Add & use":"Accept"}</button>
              <button type="button" class="btn sm ghost" data-act="edit" data-idx="${i}">Edit (save)</button>
              <button type="button" class="btn sm danger-ghost" data-act="skip" data-idx="${i}">Skip</button>
            </div>`,C=n.missingProfile?' <span class="muted">(missing from profile)</span>':n.manual&&!r?' <span class="muted">(you answer)</span>':r?' <span class="muted">(pick one)</span>':"";return`
        <div class="review-card ${p?"done":""} ${s?"open":""}" data-idx="${i}">
          <div class="review-head" data-toggle="${i}">
            <p class="q">${$(n.label)}${C}</p>
            ${p?`<span class="muted">${n.status==="accepted"?"Accepted":"Skipped"}</span>`:""}
          </div>
          ${s?`
          <div class="review-body">
            ${w}
            ${g}
            ${v}
            <div class="promote ${n.askPromote?"show":""}" data-promote="${i}">
              <span>Also save to master?</span>
              <div class="row">
                <button type="button" class="btn sm primary" data-act="promote-yes" data-idx="${i}">Yes</button>
                <button type="button" class="btn sm ghost" data-act="promote-no" data-idx="${i}">No</button>
              </div>
            </div>
          </div>`:n.askPromote?`
          <div class="review-body" style="display:flex">
            <div class="promote show" data-promote="${i}">
              <span>Also save to master?</span>
              <div class="row">
                <button type="button" class="btn sm primary" data-act="promote-yes" data-idx="${i}">Yes</button>
                <button type="button" class="btn sm ghost" data-act="promote-no" data-idx="${i}">No</button>
              </div>
            </div>
          </div>`:""}
        </div>`}).join("")}async function Ct(n){let i=0;for(let p=n+1;p<E.length;p++){const s=E[p];if(s.status==="pending"&&!(s.choices&&s.choices.length>=2)&&ln(s.label)){s.answer=Se,xe(s.el,Se),s.status="accepted",s.askPromote=!1;try{await Ce(s,Se,!1)}catch{}i+=1}}i&&f(`Filled ${i} follow-up${i===1?"":"s"} with N/A.`,"ok")}async function Ne(n,i,p=!1){const s=E[n];if(!s||!i){f(p?"Pick an option.":"Enter an answer before accepting.","err");return}let r=i;if(s.answer=r,s.choices&&s.choices.length>=2){const w=s.choices.find(g=>g.label===r||g.value===r)||et(r,s.choices)||s.choices.find(g=>g.label.toLowerCase()===r.toLowerCase()||g.value.toLowerCase()===r.toLowerCase());w?(s.choiceMode==="combobox"?await ut(s.el,w)||xe(s.el,w.label):pt(s.el,w,s.choiceMode==="radio"?"radio":"select"),r=w.label,s.answer=r):xe(s.el,r)}else xe(s.el,r);s.status="accepted";const{lasting:m}=await Ce(s,r,!1);s.lasting=m||!!s.missingProfile,s.askPromote=s.lasting,cn(r)&&await Ct(n),L=be(n+1),G(),ne&&se(ve(ne)),f(s.askPromote?s.missingProfile?"Added on the form. Save to your HireIQ profile?":"Accepted. Save to master?":"Accepted.","ok")}function Qe(){return E.filter(n=>n.status==="pending").length}function M(){if(xt.classList.add("show"),!x){A.disabled=!0,A.className="btn primary",A.textContent="Submit on this site",ae.textContent="Save this job first";return}if(nt(location.href)){A.disabled=!0,A.textContent="Submit yourself on this site",ae.textContent="LinkedIn / Indeed: HireIQ won’t click Submit — finish the application yourself.";return}const n=ot(document),i=Qe();if(!n){A.disabled=!0,A.textContent="No submit button found",ae.textContent="Scroll the form — when a Submit / Apply button appears, it shows here.";return}const p=X();if(tt(p.title,p.description)&&(j.hasResumeInput||!!Y())&&!j.resumeAttached){A.disabled=!0,A.className="btn warn",A.textContent="Attach resume to submit",ae.textContent="Entry-level / intern / new-grad roles: generate a tailored resume on HireIQ, then attach it here.",J.classList.add("show");return}A.disabled=!1,A.className=i?"btn warn":"btn primary",A.textContent=i?`Submit anyway (${i} unanswered)`:`Submit: ${n.label.slice(0,40)}`,ae.textContent=i?"Gray drafts still need Accept / Skip. You can submit anyway if you prefer.":`Ready — clicks “${n.label.slice(0,48)}” on the page while you watch.`}async function It(){if(x)try{const n=await U(),i=await Q();await N(`${n.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${x}/status`,{method:"PATCH",headers:{Authorization:`Bearer ${i}`,"Content-Type":"application/json"},body:JSON.stringify({status:"applied",meta:{source:"extension_submit",url:location.href}})})}catch{}}async function Ce(n,i,p){const s=await U(),r=await Q(),m=await N(`${s.apiBaseUrl.replace(/\/$/,"")}/api/extension/autofill/accept`,{method:"POST",headers:{Authorization:`Bearer ${r}`,"Content-Type":"application/json"},body:JSON.stringify({jobId:x,key:n.key,question:n.label,answer:i,promoteToMaster:!!p})}),w=m.json||{};if(!m.ok)throw new Error(w.error||m.error||`Accept failed (${m.status})`);return{lasting:!!(w.lasting??n.lasting)}}te.addEventListener("input",n=>{const i=n.target;if(!(i instanceof HTMLInputElement)||!i.classList.contains("choice-filter"))return;const p=Number(i.getAttribute("data-filter-idx")),s=i.value.replace(/\s+/g," ").trim().toLowerCase(),r=te.querySelector(`.choice-row[data-choices="${p}"]`);if(r)for(const m of Array.from(r.querySelectorAll("button.choice"))){const w=(m.textContent||"").toLowerCase();m.toggleAttribute("hidden",!!s&&!w.includes(s))}}),te.addEventListener("click",async n=>{var v;const i=n.target,p=i.closest(".review-card");if(!p)return;const s=Number(p.getAttribute("data-idx")),r=E[s];if(!r)return;const m=i.getAttribute("data-act");if(!m){if(i.closest("textarea"))return;r.status==="pending"&&L!==s&&(L=s,G()),P(r.el);return}n.stopPropagation();const w=te.querySelector(`textarea[data-idx="${s}"]`),g=((w==null?void 0:w.value)??r.answer).trim();try{if(m==="pick"){const C=Number(i.getAttribute("data-choice")),q=(v=r.choices)==null?void 0:v[C];if(!q)return;await Ne(s,q.label||q.value,!0);return}if(m==="edit"){if(!g){f("Enter an answer before saving the edit.","err");return}r.answer=g,Xe(r.el,g),f("Updated draft on the form.","ok");return}if(m==="skip"){on(r.el),r.status="skipped",r.askPromote=!1,L=be(s+1),G(),ne&&se(ve(ne)),f("Skipped — field cleared.","");return}if(m==="accept"){await Ne(s,g,!1);return}if(m==="promote-yes"){await Ce(r,r.answer,!0),r.askPromote=!1,G(),f("Queued for master profile.","ok");return}if(m==="promote-no"){r.askPromote=!1,G();return}}catch(C){f(C instanceof Error?C.message:"Review action failed","err")}});async function me(n){if(!x)return{attached:!1,available:!1};const i=n==="resume"?Y():le();if(!i)return{attached:!1,available:!1};const p=await U(),s=await Q(),r=p.apiBaseUrl.replace(/\/$/,""),m=n==="resume"?At():"",w=`type=${n}${m?`&tailoredResumeId=${encodeURIComponent(m)}`:""}`,g=await N(`${r}/api/extension/jobs/${x}/pdf?${w}`,{method:"GET",headers:{Authorization:`Bearer ${s}`,Accept:"application/pdf"},responseType:"base64"}),v=g.json||{};if(g.base64&&g.ok){const C=n==="resume"?"HireIQ-resume.pdf":"HireIQ-cover.pdf",q=sn(g.base64,C,g.contentType||"application/pdf");return{attached:an(i,q),available:!0}}return{attached:!1,available:!!v.available}}function qt(){J.classList.add("show"),V(j)}function St(){x||(J.classList.remove("show"),Me.innerHTML="")}function V(n){var s,r,m,w,g;if(j=n,!x){J.classList.remove("show");return}const i=[];if(i.push(`<div class="doc-actions">
      <button type="button" class="btn secondary" id="hiq-gen-resume">Generate tailored resume</button>
      <button type="button" class="btn secondary" id="hiq-gen-cover">Generate cover letter</button>
      <button type="button" class="btn linkish" id="hiq-open">Open job in HireIQ →</button>
    </div>`),T.length>0){const v=T.map(C=>{var q;return`<option value="${$(C.id)}"${C.id===(F||((q=T[0])==null?void 0:q.id))?" selected":""}>${$(C.label)}</option>`}).join("");i.push(`<label class="muted" for="hiq-resume-pick" style="display:block;margin-bottom:2px">Resume version</label><select id="hiq-resume-pick">${v}</select>`),n.hasResumeInput&&i.push(n.resumeAttached?'<div class="muted">Resume PDF attached ✓</div>':'<button type="button" class="btn secondary" id="hiq-attach-resume">Attach selected resume</button>')}else i.push('<div class="muted">No tailored resume yet — generate on HireIQ, then come back to attach.</div>');n.hasCoverInput&&(n.coverAttached?i.push('<div class="muted">Cover letter PDF attached ✓</div>'):n.coverAvailable&&i.push('<button type="button" class="btn secondary" id="hiq-attach-cover">Attach cover letter</button>')),J.classList.add("show"),Me.innerHTML=i.join(""),(s=t.getElementById("hiq-gen-resume"))==null||s.addEventListener("click",()=>{he(Pe||K),f("Opened HireIQ to generate — come back to attach.","ok")}),(r=t.getElementById("hiq-gen-cover"))==null||r.addEventListener("click",()=>{he(Re||K),f("Opened HireIQ for cover letter.","ok")}),(m=t.getElementById("hiq-open"))==null||m.addEventListener("click",()=>he(K));const p=t.getElementById("hiq-resume-pick");p&&p.addEventListener("change",()=>{F=p.value}),(w=t.getElementById("hiq-attach-resume"))==null||w.addEventListener("click",async()=>{f("Attaching resume…");try{const v=await me("resume");V({...j,resumeAttached:v.attached,resumeAvailable:v.available,hasResumeInput:!!Y()}),f(v.attached?"Resume attached.":"Resume PDF not ready yet — generate on HireIQ first.",v.attached?"ok":"err"),M()}catch(v){f(ie(v),"err")}}),(g=t.getElementById("hiq-attach-cover"))==null||g.addEventListener("click",async()=>{f("Attaching cover…");try{const v=await me("cover");V({...j,coverAttached:v.attached,coverAvailable:v.available,hasCoverInput:!!le()}),f(v.attached?"Cover attached.":"Cover not ready yet.",v.attached?"ok":"err"),M()}catch(v){f(ie(v),"err")}})}async function Oe(){var p;if(!x)return;const n=F||((p=T[0])==null?void 0:p.id)||"";await fe();const i=T[0];i&&i.id!==n&&(F=i.id,f(`New resume ready: ${i.label}`,"ok")),V({...j,hasResumeInput:!!Y(),hasCoverInput:!!le()})}de.addEventListener("click",()=>{e.setAttribute("data-collapsed","1")}),ue.addEventListener("click",()=>{e.removeAttribute("data-collapsed")});function he(n){n&&window.open(n,"_blank","noopener,noreferrer")}function De(){const n=Ze(document);n.needsAccount?(y.classList.add("show"),S.textContent=n.reason):y.classList.remove("show")}k.addEventListener("click",async()=>{const n=B.value.trim();if(!n){f("Enter the email you used on this employer site.","err");return}if(!x){f("Save the job to HireIQ first, then save the ATS email.","err");return}k.disabled=!0;try{const i=await U(),p=await Q(),s=await N(`${i.apiBaseUrl.replace(/\/$/,"")}/api/extension/jobs/${x}/ats-account`,{method:"PATCH",headers:{Authorization:`Bearer ${p}`,"Content-Type":"application/json"},body:JSON.stringify({email:n,note:Ze(document).kind})}),r=s.json||{};if(!s.ok)throw new Error(r.error||s.error||"Failed to save ATS email");f(`Saved ATS email ${n} for tracking.`,"ok")}catch(i){f(i instanceof Error?i.message:"Failed to save ATS email","err")}finally{k.disabled=!1}}),D.addEventListener("click",()=>he($e)),A.addEventListener("click",async()=>{if(!x){f("Save this job first","err");return}if(nt(location.href)){f("Submit this application yourself on LinkedIn / Indeed.","err");return}const n=ot(document);if(!n){f("No Submit / Apply button found on this page.","err"),M();return}const i=X();if(tt(i.title,i.description)&&(j.hasResumeInput||Y())&&!j.resumeAttached){f("Attach a tailored resume first (entry-level / intern / new-grad).","err"),M(),J.classList.add("show");return}const s=Qe();if(!(s>0&&!window.confirm(`${s} answer(s) still need Accept or Skip. Submit the employer form anyway?`))){A.disabled=!0,f(`Clicking “${n.label}” on the page…`);try{await Ue(),P(n.el),fn(n),await It(),f(`Submitted via “${n.label}”. Marked Applied in HireIQ.`,"ok"),A.textContent="Submitted"}catch(r){f(ie(r),"err"),A.disabled=!1,M()}}}),c.addEventListener("click",async()=>{c.disabled=!0,f("Saving to HireIQ…");try{await Et();const n=[X().title,X().company].filter(Boolean);f(`Saved${n.length?`: ${n.join(" · ")}`:""}. Next: Autofill or generate docs.`,"ok")}catch(n){f(ie(n),"err"),c.disabled=!1}}),b.addEventListener("click",async()=>{var n,i;b.disabled=!0,E=[],L=null,G();try{await Ue();const p=ne||await ze();f("Filling known fields…");const s=await tn(p,{onField:d=>f(`Filling: ${d.slice(0,40)}…`)});se(s);const r=nn().slice(0,25);f("Reading dropdown options…"),await Wt(r);const m=d=>!!(d.choices&&d.choices.length>=2),w=r.filter(d=>!m(d)&&Ut(d.kind,p)),g=new Set(w.map(d=>d.key)),v=r.filter(d=>m(d)&&!g.has(d.key)),C=r.filter(d=>!m(d)&&!g.has(d.key)&&!Ve(d.label)),q=r.filter(d=>!m(d)&&!g.has(d.key)&&Ve(d.label));for(const d of w){const W=zt(d.kind);E.push({key:d.key,label:d.label,answer:"",lasting:W,el:d.el,status:"pending",askPromote:!1,manual:!0,missingProfile:!0,placeholder:Nt(d.kind)})}for(const d of v){const W=d.kind==="country"&&p.country&&((n=d.choices)!=null&&n.length)?et(p.country,d.choices):null;E.push({key:d.key,label:d.label,answer:(W==null?void 0:W.label)||"",lasting:!1,el:d.el,status:"pending",askPromote:!1,choices:d.choices,choiceMode:d.choiceMode})}if(C.length){f(`Drafting ${C.length} unanswered questions…`);const d=await U(),W=await Q(),qe=X(),we=await N(`${d.apiBaseUrl.replace(/\/$/,"")}/api/extension/autofill/drafts`,{method:"POST",headers:{Authorization:`Bearer ${W}`,"Content-Type":"application/json"},body:JSON.stringify({jobId:x,title:qe.title,company:qe.company,description:qe.description.slice(0,4e3),fields:C.map(oe=>({key:oe.key,label:oe.label,required:oe.required,inputType:oe.inputType}))})}),Ge=we.json||{};if(!we.ok)f(Ge.error||we.error||`Drafts failed (${we.status}) — known fields still filled.`,"err");else{const oe=new Map((Ge.drafts||[]).map(H=>[H.key,H]));for(const H of C){const z=oe.get(H.key);if(!z||z.skip||!((i=z.answer)!=null&&i.trim())){E.push({key:H.key,label:H.label,answer:"",lasting:!!(z!=null&&z.lasting),el:H.el,status:"pending",askPromote:!1,manual:!0});continue}Xe(H.el,z.answer.trim()),E.push({key:H.key,label:H.label,answer:z.answer.trim(),lasting:!!z.lasting,el:H.el,status:"pending",askPromote:!1})}}}for(const d of q)E.push({key:d.key,label:d.label,answer:"",lasting:!1,el:d.el,status:"pending",askPromote:!1,manual:!0});L=be(),G(),se(ve(p)),await fe();const O=Y(),re=le();let ye=!1,ge=!1,Je=!1,Ke=!1;if(O){f("Attaching resume PDF…");const d=await me("resume");ye=!!(d!=null&&d.attached),Je=!!(d!=null&&d.available||d!=null&&d.attached),ye&&P(O)}if(re){f("Attaching cover letter PDF…");const d=await me("cover");ge=!!(d!=null&&d.attached),Ke=!!(d!=null&&d.available||d!=null&&d.attached),ge&&P(re)}V({hasResumeInput:!!O,hasCoverInput:!!re,resumeAttached:ye,coverAttached:ge,resumeAvailable:Je,coverAvailable:Ke});const Ie=[s.filledCount?`${s.filledCount} known`:"",E.length?`${E.length} to review`:"",ye?"resume attached":"",ge?"cover attached":""].filter(Boolean),Tt=E.some(d=>!d.manual)?" Gray drafts need Accept before submit.":E.length?" Answer the remaining questions in the panel.":"";f(Ie.length?`Autofill done: ${Ie.join(" · ")}.${Tt}`:"No matching fields found on this page.",Ie.length?"ok":"err"),M()}catch(p){f(ie(p),"err")}finally{b.disabled=!x}}),De(),M(),f("Checking save status…"),b.disabled=!0;const Lt=()=>{document.visibilityState==="visible"&&Oe()};document.addEventListener("visibilitychange",Lt),window.addEventListener("focus",()=>{Oe()}),(async()=>{try{await $t()}catch(n){f(ie(n),"err"),Ae()}try{const n=await ze();se(ve(n))}catch{I.textContent="Connect HireIQ in the popup to load master resume.",R.textContent="Connect HireIQ…"}})()}function it(){if(!ke(location.href,document).isJobPage){bn();return}gn()}function yt(){it();let e=location.href;setInterval(()=>{location.href!==e&&(e=location.href,it())},800),chrome.runtime.sendMessage({type:"HIREIQ_DETECT",detect:ke(location.href,document)}).catch(()=>{})}function vn(){yt()}yt();export{vn as onExecute};
