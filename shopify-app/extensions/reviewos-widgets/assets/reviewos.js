"use strict";(()=>{function D(t){let e=t,a=new Set;return{getState:()=>e,setState(s){e={...e,...s},a.forEach(i=>i())},subscribe(s){return a.add(s),()=>a.delete(s)}}}var M=new Set(["rating","sort","page"]);function R(t){let e=new URLSearchParams(window.location.search),a={},s=new Set(t.map(u=>u.key));for(let[u,v]of e.entries())s.has(u)&&!M.has(u)&&(a[u]=v);let i=e.get("rating"),r=i?Number(i):null,c=e.get("sort")||"recent";return{attrFilters:a,rating:r,sort:c}}function A(t,e,a,s=!1){let i=new URLSearchParams(window.location.search);for(let u of Array.from(i.keys()))(M.has(u)||t[u]!==void 0)&&i.delete(u);for(let[u,v]of Object.entries(t))i.set(u,v);e&&i.set("rating",String(e)),a!=="recent"&&i.set("sort",a);let r=i.toString(),c=`${window.location.pathname}${r?`?${r}`:""}${window.location.hash}`;s?window.history.pushState(null,"",c):window.history.replaceState(null,"",c)}function o(t){return String(t!=null?t:"").replace(/[&<>"']/g,e=>{switch(e){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}function S(t,e=5){let a="";for(let s=1;s<=e;s++)a+=`<span class="rvos-star ${s<=t?"rvos-star--filled":""}">&#9733;</span>`;return a}function j(t){let e=new Date(t);return Number.isNaN(e.getTime())?"":e.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}function W(t){let e=t.summary;return e?`
    <div class="rvos-summary">
      <div class="rvos-summary__score">${e.average.toFixed(1)}</div>
      <div class="rvos-summary__meta">
        <div class="rvos-stars">${S(Math.round(e.average))}</div>
        <div class="rvos-summary__count">${e.count.toLocaleString()} review${e.count===1?"":"s"}</div>
      </div>
      <button type="button" class="rvos-btn rvos-btn--primary rvos-summary__write" data-action="open-write">
        Write a review
      </button>
    </div>
  `:""}function H(t){let e=t.summary;if(!e||e.count===0)return"";let a=[5,4,3,2,1].map(i=>{var v;let r=(v=e.byStar[String(i)])!=null?v:0,c=e.count>0?Math.round(r/e.count*100):0;return`
        <button type="button" class="rvos-dist-row ${t.ratingFilter===i?"rvos-dist-row--active":""}" data-action="filter-rating" data-rating="${i}">
          <span class="rvos-dist-row__label">${i}&#9733;</span>
          <span class="rvos-dist-row__bar"><span class="rvos-dist-row__fill" style="width:${c}%"></span></span>
          <span class="rvos-dist-row__count">${r}</span>
        </button>
      `}).join(""),s=t.ratingFilter?`<button type="button" class="rvos-link" data-action="filter-rating" data-rating="">Clear rating filter (${o(t.ratingFilter)}&#9733;)</button>`:"";return`<div class="rvos-distribution">${a}${s}</div>`}var Y=[{value:"recent",label:"Most recent"},{value:"helpful",label:"Most helpful"},{value:"rating_desc",label:"Highest rating"},{value:"rating_asc",label:"Lowest rating"}];function Z(t,e){let a=[t.verifiedBuyer?'<span class="rvos-badge">Verified buyer</span>':"",t.verifiedMarketplace?'<span class="rvos-badge rvos-badge--marketplace">Verified marketplace</span>':""].join(""),s=t.media.length?`<div class="rvos-card__media">${t.media.map(r=>`<img class="rvos-card__thumb" src="${o(r.url)}" alt="review media" loading="lazy" />`).join("")}</div>`:"",i=t.merchantReply?`<div class="rvos-card__reply">
        <div class="rvos-card__reply-label">Merchant reply</div>
        <div>${o(t.merchantReply)}</div>
      </div>`:"";return`
    <article class="rvos-card" data-review-id="${o(t.id)}">
      <div class="rvos-card__head">
        <div class="rvos-stars">${S(t.rating)}</div>
        <div class="rvos-card__author">${o(t.customerName)}</div>
        ${a}
        <div class="rvos-card__date">${j(t.createdAt)}</div>
      </div>
      ${t.title?`<h4 class="rvos-card__title">${o(t.title)}</h4>`:""}
      <p class="rvos-card__body">${o(t.body)}</p>
      ${s}
      ${i}
      <button type="button" class="rvos-helpful" data-action="vote-helpful" data-review-id="${o(t.id)}" ${e?"disabled":""}>
        Helpful (<span class="rvos-helpful__count">${t.helpfulCount}</span>)
      </button>
    </article>
  `}function C(t){let e=Y.map(c=>`<option value="${c.value}" ${t.sort===c.value?"selected":""}>${c.label}</option>`).join(""),a=`
    <div class="rvos-feed__toolbar">
      <span class="rvos-feed__total">${t.total.toLocaleString()} review${t.total===1?"":"s"}</span>
      <select class="rvos-select" data-action="set-sort">${e}</select>
    </div>
  `;if(t.reviewsLoading&&t.reviews.length===0)return`${a}<div class="rvos-feed__loading">Loading reviews\u2026</div>`;if(t.reviews.length===0)return`${a}<div class="rvos-empty">No reviews match your filters yet.</div>`;let s=t.reviews.map(c=>Z(c,!!t.votedIds[c.id])).join(""),r=t.page*t.pageSize<t.total?`<button type="button" class="rvos-btn rvos-btn--outline rvos-feed__load-more" data-action="load-more" ${t.reviewsLoading?"disabled":""}>
        ${t.reviewsLoading?"Loading\u2026":"Load more"}
      </button>`:"";return`${a}<div class="rvos-feed__list">${s}</div>${r}`}function P(t){if(t.attributeDefs.length===0)return"";let e=t.attributeDefs.map(i=>{let r=t.attrFilters[i.key],c=i.options.map(u=>`<button type="button" class="rvos-chip ${r===u?"rvos-chip--active":""}" data-action="toggle-filter" data-key="${o(i.key)}" data-value="${o(u)}">${o(u)}</button>`).join("");return`
        <div class="rvos-filter-group">
          <span class="rvos-filter-group__label">${o(i.label)}</span>
          <div class="rvos-filter-group__options">${c}</div>
        </div>
      `}).join(""),a=Object.entries(t.attrFilters);return`<div class="rvos-filters">${a.length>0?`<div class="rvos-active-filters">
          ${a.map(([i,r])=>{let c=t.attributeDefs.find(v=>v.key===i),u=c?c.label:i;return`<span class="rvos-active-chip">${o(u)}: ${o(r)} <button type="button" data-action="toggle-filter" data-key="${o(i)}" data-value="${o(r)}" aria-label="Remove filter">&times;</button></span>`}).join("")}
          <button type="button" class="rvos-link" data-action="clear-filters">Clear all</button>
        </div>`:""}${e}</div>`}function N(t){if(!t.writeOpen)return"";if(t.writeSuccess)return`
      <div class="rvos-modal-overlay" data-action="close-write">
        <div class="rvos-modal" role="dialog" aria-modal="true">
          <button type="button" class="rvos-modal__close" data-action="close-write" aria-label="Close">&times;</button>
          <div class="rvos-success">
            <div class="rvos-success__icon">&#10003;</div>
            <h3>Thanks for your review!</h3>
            <p>It's been submitted and will appear once it's approved by moderation.</p>
            <button type="button" class="rvos-btn rvos-btn--primary" data-action="close-write">Done</button>
          </div>
        </div>
      </div>
    `;let e=t.attributeDefs.map(s=>{let i=s.options.map(r=>`<option value="${o(r)}">${o(r)}</option>`).join("");return`
        <label class="rvos-field">
          <span>${o(s.label)}</span>
          <select name="attr__${o(s.key)}" class="rvos-select">
            <option value="">Select\u2026</option>
            ${i}
          </select>
        </label>
      `}).join(""),a=t.writeError?`<div class="rvos-form-error">${o(t.writeError)}</div>`:"";return`
    <div class="rvos-modal-overlay" data-action="close-write">
      <div class="rvos-modal" role="dialog" aria-modal="true">
        <button type="button" class="rvos-modal__close" data-action="close-write" aria-label="Close">&times;</button>
        <h3 class="rvos-modal__title">Write a review</h3>
        <form data-action="submit-write" class="rvos-form">
          <label class="rvos-field">
            <span>Your name</span>
            <input type="text" name="customerName" required maxlength="80" />
          </label>
          <div class="rvos-field">
            <span>Rating</span>
            <div class="rvos-rating-input" data-rating-input>
              ${[1,2,3,4,5].map(s=>`<button type="button" class="rvos-star-btn ${s<=t.writeRating?"rvos-star-btn--filled":""}" data-action="set-write-rating" data-value="${s}" aria-label="${s} star">&#9733;</button>`).join("")}
            </div>
            <input type="hidden" name="rating" value="${t.writeRating}" />
          </div>
          <label class="rvos-field">
            <span>Title</span>
            <input type="text" name="title" maxlength="120" />
          </label>
          <label class="rvos-field">
            <span>Review</span>
            <textarea name="body" required rows="4" maxlength="2000"></textarea>
          </label>
          ${e}
          ${a}
          <button type="submit" class="rvos-btn rvos-btn--primary" ${t.writeSubmitting?"disabled":""}>
            ${t.writeSubmitting?"Submitting\u2026":"Submit review"}
          </button>
        </form>
      </div>
    </div>
  `}function O(t){if(t.aiSummaryLoading)return'<div class="rvos-ai-summary rvos-ai-summary--loading">Generating AI summary\u2026</div>';let e=t.aiSummary;if(!e)return"";let a=Object.keys(t.attrFilters).length,s=a>0?`AI summary of ${e.reviewCount} review${e.reviewCount===1?"":"s"} matching ${a} filter${a===1?"":"s"}`:`AI summary of ${e.reviewCount} review${e.reviewCount===1?"":"s"}`,i=e.pros.map(c=>`<li class="rvos-ai-summary__pro">${o(c)}</li>`).join(""),r=e.cons.map(c=>`<li class="rvos-ai-summary__con">${o(c)}</li>`).join("");return`
    <div class="rvos-ai-summary">
      <div class="rvos-ai-summary__header">
        <span class="rvos-ai-summary__badge">&#10022; AI summary</span>
      </div>
      <p class="rvos-ai-summary__text">${o(e.summaryText)}</p>
      ${e.pros.length||e.cons.length?`<div class="rvos-ai-summary__lists">
              ${i?`<ul class="rvos-ai-summary__pros">${i}</ul>`:""}
              ${r?`<ul class="rvos-ai-summary__cons">${r}</ul>`:""}
            </div>`:""}
      <div class="rvos-ai-summary__caption">${o(s)}</div>
    </div>
  `}async function h(t){let e=await fetch(t);if(!e.ok)throw new Error(`request failed: ${e.status}`);return e.json()}async function I(t,e,a={}){let s=new URLSearchParams({product:e});for(let[r,c]of Object.entries(a))s.set(r,c);return(await h(`${t}/summary?${s.toString()}`)).summary}async function U(t,e){let a=new URLSearchParams({product:e});return(await h(`${t}/distribution?${a.toString()}`)).distribution}async function q(t,e){let a=new URLSearchParams({product:e});return(await h(`${t}/attributes?${a.toString()}`)).attributes.filter(i=>i.display)}async function B(t,e){let a=new URLSearchParams;a.set("product",e.productId),a.set("sort",e.sort),a.set("page",String(e.page)),a.set("pageSize",String(e.pageSize)),e.rating&&a.set("rating",String(e.rating));for(let[i,r]of Object.entries(e.attrFilters))a.set(i,r);return await h(`${t}/reviews?${a.toString()}`)}async function z(t,e){var s;let a=await fetch(`${t}/reviews`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!a.ok){let i=await a.json().catch(()=>({}));throw new Error((s=i.error)!=null?s:`request failed: ${a.status}`)}return a.json()}var V="reviewos:filters-changed",Q="/apps/reviewos",X=5;function tt(t,e){return{apiBase:"",productSlug:t,blocks:new Set,loading:!0,error:null,product:null,summary:null,attributeDefs:[],aiSummary:null,aiSummaryLoading:!1,marketplaceStats:[],lightboxIndex:null,lightboxReturnIndex:null,galleryReviews:[],reviews:[],total:0,page:1,pageSize:e,reviewsLoading:!1,votedIds:{},ratingFilter:null,attrFilters:{},sort:"recent",writeOpen:!1,writeRating:0,writeSubmitting:!1,writeSuccess:!1,writeError:null}}function G(t){let e=t.dataset.block,a=t.dataset.productHandle||t.dataset.productId;if(!e||!a){console.error("[reviewos] missing data-block or data-product-handle");return}let s=(t.dataset.apiBase||Q).replace(/\/$/,""),i=Number(t.dataset.pageSize)||X,r=D(tt(a,i)),{attrFilters:c,rating:u,sort:v}=R(r.getState().attributeDefs);r.setState({attrFilters:c,ratingFilter:u,sort:v});function k(){let n=r.getState();if(n.loading){t.innerHTML='<div class="rvos-loading">Loading reviews\u2026</div>';return}if(n.error){t.innerHTML=`<div class="rvos-error">Couldn't load reviews. Please try again later.</div>`;return}switch(e){case"star-badge":t.innerHTML=W(n);break;case"rating-distribution":t.innerHTML=H(n);break;case"review-feed":t.innerHTML=C(n);break;case"filter-chips":t.innerHTML=P(n);break;case"write-review":t.innerHTML='<button type="button" class="rvos-btn rvos-btn--primary" data-action="open-write">Write a review</button>'+N(n);break;case"ai-summary":t.innerHTML=O(n);break;default:t.innerHTML=""}}r.subscribe(k);let $=0;async function _(n){let l=r.getState(),d=++$;r.setState({reviewsLoading:!0});try{let p=await B(s,{productId:a,rating:l.ratingFilter,attrFilters:l.attrFilters,sort:l.sort,page:n?1:l.page,pageSize:i});if(d!==$)return;let m=n?[]:r.getState().reviews;r.setState({reviews:[...m,...p.reviews],total:p.total,page:p.page,reviewsLoading:!1})}catch(p){if(d!==$)return;r.setState({reviewsLoading:!1,error:"reviews_failed"})}}let L=0;async function E(){let n=++L;r.setState({aiSummaryLoading:!0});try{let l=await I(s,a,r.getState().attrFilters);if(n!==L)return;r.setState({aiSummary:l,aiSummaryLoading:!1})}catch(l){if(n!==L)return;r.setState({aiSummary:null,aiSummaryLoading:!1})}}async function b(){e==="review-feed"&&await _(!0),e==="ai-summary"&&await E()}function x(){let n=R(r.getState().attributeDefs);r.setState({attrFilters:n.attrFilters,ratingFilter:n.rating,sort:n.sort}),b()}window.addEventListener("popstate",x),window.addEventListener(V,x);function w(n=!0){let l=r.getState();A(l.attrFilters,l.ratingFilter,l.sort,n),window.dispatchEvent(new Event(V))}t.addEventListener("click",async n=>{let l=n.target.closest("[data-action]");if(!l)return;let d=l.dataset.action;if(!(l.classList.contains("rvos-modal-overlay")&&n.target!==l)){if(d==="filter-rating"){let m=l.dataset.rating,g=m?Number(m):null,f=r.getState().ratingFilter;r.setState({ratingFilter:f===g?null:g}),w(),await b();return}if(d==="toggle-filter"){let m=l.dataset.key,g=l.dataset.value,f={...r.getState().attrFilters};f[m]===g?delete f[m]:f[m]=g,r.setState({attrFilters:f}),w(),await b();return}if(d==="clear-filters"){r.setState({attrFilters:{},ratingFilter:null}),w(),await b();return}if(d==="load-more"){if(r.getState().reviewsLoading)return;r.setState({page:r.getState().page+1}),await _(!1);return}if(d==="open-write"){r.setState({writeOpen:!0,writeSuccess:!1,writeError:null,writeRating:0});return}if(d==="close-write"){r.setState({writeOpen:!1});return}if(d==="set-write-rating"){r.setState({writeRating:Number(l.dataset.value)});return}}}),t.addEventListener("change",async n=>{let l=n.target;l.dataset.action==="set-sort"&&(r.setState({sort:l.value}),w(),await b())}),t.addEventListener("submit",async n=>{var g,f,T;let l=n.target;if(l.dataset.action!=="submit-write")return;n.preventDefault();let d=r.getState();if(d.writeRating<1){r.setState({writeError:"Please select a star rating."});return}let p=new FormData(l),m={};for(let y of d.attributeDefs){let F=p.get(`attr__${y.key}`);typeof F=="string"&&F&&(m[y.key]=F)}r.setState({writeSubmitting:!0,writeError:null});try{await z(s,{productId:a,customerName:String((g=p.get("customerName"))!=null?g:""),rating:d.writeRating,title:String((f=p.get("title"))!=null?f:"")||void 0,body:String((T=p.get("body"))!=null?T:""),attributes:m}),r.setState({writeSubmitting:!1,writeSuccess:!0})}catch(y){r.setState({writeSubmitting:!1,writeError:y instanceof Error?y.message:"Something went wrong."})}});async function K(){try{let n=e==="star-badge"||e==="rating-distribution",l=e==="filter-chips"||e==="write-review",d=e==="review-feed",p=e==="ai-summary",[m,g]=await Promise.all([n?U(s,a):Promise.resolve(null),l?q(s,a):Promise.resolve([])]);r.setState({summary:m?{average:m.average,count:m.count,byStar:m.byStar}:null,attributeDefs:g,loading:!1}),d&&await _(!0),p&&await E()}catch(n){console.error("[reviewos] shopify block init failed",n),r.setState({loading:!1,error:"init_failed"})}}k(),K()}function et(t){t.dataset.reviewosMounted!=="true"&&(t.dataset.reviewosMounted="true",G(t))}function J(){document.querySelectorAll("[data-reviewos]").forEach(et)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",J):J();})();
