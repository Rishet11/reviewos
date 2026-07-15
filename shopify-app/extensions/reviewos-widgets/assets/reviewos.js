"use strict";(()=>{function T(t){let e=t,a=new Set;return{getState:()=>e,setState(s){e={...e,...s},a.forEach(i=>i())},subscribe(s){return a.add(s),()=>a.delete(s)}}}var D=new Set(["rating","sort","page"]);function F(t){let e=new URLSearchParams(window.location.search),a={},s=new Set(t.map(d=>d.key));for(let[d,g]of e.entries())s.has(d)&&!D.has(d)&&(a[d]=g);let i=e.get("rating"),r=i?Number(i):null,c=e.get("sort")||"recent";return{attrFilters:a,rating:r,sort:c}}function A(t,e,a,s=!1){let i=new URLSearchParams(window.location.search);for(let d of Array.from(i.keys()))(D.has(d)||t[d]!==void 0)&&i.delete(d);for(let[d,g]of Object.entries(t))i.set(d,g);e&&i.set("rating",String(e)),a!=="recent"&&i.set("sort",a);let r=i.toString(),c=`${window.location.pathname}${r?`?${r}`:""}${window.location.hash}`;s?window.history.pushState(null,"",c):window.history.replaceState(null,"",c)}function o(t){return String(t!=null?t:"").replace(/[&<>"']/g,e=>{switch(e){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}function b(t,e=5){let a="";for(let s=1;s<=e;s++)a+=`<span class="rvos-star ${s<=t?"rvos-star--filled":""}">&#9733;</span>`;return a}function W(t){let e=new Date(t);return Number.isNaN(e.getTime())?"":e.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}function j(t){let e=t.summary;return e?`
    <div class="rvos-summary">
      <div class="rvos-summary__score">${e.average.toFixed(1)}</div>
      <div class="rvos-summary__meta">
        <div class="rvos-stars">${b(Math.round(e.average))}</div>
        <div class="rvos-summary__count">${e.count.toLocaleString()} review${e.count===1?"":"s"}</div>
      </div>
      <button type="button" class="rvos-btn rvos-btn--primary rvos-summary__write" data-action="open-write">
        Write a review
      </button>
    </div>
  `:""}function C(t){let e=t.summary;if(!e||e.count===0)return"";let a=[5,4,3,2,1].map(i=>{var g;let r=(g=e.byStar[String(i)])!=null?g:0,c=e.count>0?Math.round(r/e.count*100):0;return`
        <button type="button" class="rvos-dist-row ${t.ratingFilter===i?"rvos-dist-row--active":""}" data-action="filter-rating" data-rating="${i}">
          <span class="rvos-dist-row__label">${i}&#9733;</span>
          <span class="rvos-dist-row__bar"><span class="rvos-dist-row__fill" style="width:${c}%"></span></span>
          <span class="rvos-dist-row__count">${r}</span>
        </button>
      `}).join(""),s=t.ratingFilter?`<button type="button" class="rvos-link" data-action="filter-rating" data-rating="">Clear rating filter (${o(t.ratingFilter)}&#9733;)</button>`:"";return`<div class="rvos-distribution">${a}${s}</div>`}var Q=[{value:"recent",label:"Most recent"},{value:"helpful",label:"Most helpful"},{value:"rating_desc",label:"Highest rating"},{value:"rating_asc",label:"Lowest rating"}];function X(t,e){let a=[t.verifiedBuyer?'<span class="rvos-badge">Verified buyer</span>':"",t.verifiedMarketplace?'<span class="rvos-badge rvos-badge--marketplace">Verified marketplace</span>':""].join(""),s=t.media.length?`<div class="rvos-card__media">${t.media.map(r=>`<img class="rvos-card__thumb" src="${o(r.url)}" alt="review media" loading="lazy" />`).join("")}</div>`:"",i=t.merchantReply?`<div class="rvos-card__reply">
        <div class="rvos-card__reply-label">Merchant reply</div>
        <div>${o(t.merchantReply)}</div>
      </div>`:"";return`
    <article class="rvos-card" data-review-id="${o(t.id)}">
      <div class="rvos-card__head">
        <div class="rvos-stars">${b(t.rating)}</div>
        <div class="rvos-card__author">${o(t.customerName)}</div>
        ${a}
        <div class="rvos-card__date">${W(t.createdAt)}</div>
      </div>
      ${t.title?`<h4 class="rvos-card__title">${o(t.title)}</h4>`:""}
      <p class="rvos-card__body">${o(t.body)}</p>
      ${s}
      ${i}
      <button type="button" class="rvos-helpful" data-action="vote-helpful" data-review-id="${o(t.id)}" ${e?"disabled":""}>
        Helpful (<span class="rvos-helpful__count">${t.helpfulCount}</span>)
      </button>
    </article>
  `}function H(t){let e=Q.map(c=>`<option value="${c.value}" ${t.sort===c.value?"selected":""}>${c.label}</option>`).join(""),a=`
    <div class="rvos-feed__toolbar">
      <span class="rvos-feed__total">${t.total.toLocaleString()} review${t.total===1?"":"s"}</span>
      <select class="rvos-select" data-action="set-sort">${e}</select>
    </div>
  `;if(t.reviewsLoading&&t.reviews.length===0)return`${a}<div class="rvos-feed__loading">Loading reviews\u2026</div>`;if(t.reviews.length===0)return`${a}<div class="rvos-empty">No reviews match your filters yet.</div>`;let s=t.reviews.map(c=>X(c,!!t.votedIds[c.id])).join(""),r=t.page*t.pageSize<t.total?`<button type="button" class="rvos-btn rvos-btn--outline rvos-feed__load-more" data-action="load-more" ${t.reviewsLoading?"disabled":""}>
        ${t.reviewsLoading?"Loading\u2026":"Load more"}
      </button>`:"";return`${a}<div class="rvos-feed__list">${s}</div>${r}`}function P(t){if(t.attributeDefs.length===0)return"";let e=t.attributeDefs.map(i=>{let r=t.attrFilters[i.key],c=i.options.map(d=>`<button type="button" class="rvos-chip ${r===d?"rvos-chip--active":""}" data-action="toggle-filter" data-key="${o(i.key)}" data-value="${o(d)}">${o(d)}</button>`).join("");return`
        <div class="rvos-filter-group">
          <span class="rvos-filter-group__label">${o(i.label)}</span>
          <div class="rvos-filter-group__options">${c}</div>
        </div>
      `}).join(""),a=Object.entries(t.attrFilters);return`<div class="rvos-filters">${a.length>0?`<div class="rvos-active-filters">
          ${a.map(([i,r])=>{let c=t.attributeDefs.find(g=>g.key===i),d=c?c.label:i;return`<span class="rvos-active-chip">${o(d)}: ${o(r)} <button type="button" data-action="toggle-filter" data-key="${o(i)}" data-value="${o(r)}" aria-label="Remove filter">&times;</button></span>`}).join("")}
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
  `}function I(t){let e=t.marketplaceStats;return!e||e.length===0?"":`
    <div class="rvos-trust-badges">
      <div class="rvos-trust-badges__row">${e.map(s=>{let i=o(s.source.name.trim().charAt(0).toUpperCase()||"?"),r=s.source.logoUrl?`<img class="rvos-trust-badge__logo" src="${o(s.source.logoUrl)}" alt="${o(s.source.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display=''" /><div class="rvos-trust-badge__fallback" style="display:none">${i}</div>`:`<div class="rvos-trust-badge__fallback">${i}</div>`;return`
        <a class="rvos-trust-badge" href="${o(s.url)}" target="_blank" rel="noopener noreferrer">
          ${r}
          <div class="rvos-trust-badge__body">
            <div class="rvos-trust-badge__name">${o(s.source.name)}</div>
            <div class="rvos-stars">${b(Math.round(s.rating))}</div>
            <div class="rvos-trust-badge__count">${o(s.rating.toFixed(1))} | ${s.reviewCount.toLocaleString()} reviews</div>
          </div>
        </a>
      `}).join("")}</div>
      <div class="rvos-trust-badges__combined">Rated across ${e.length} marketplace${e.length===1?"":"s"}</div>
    </div>
  `}async function S(t){let e=await fetch(t);if(!e.ok)throw new Error(`request failed: ${e.status}`);return e.json()}async function U(t,e,a={}){let s=new URLSearchParams({product:e});for(let[r,c]of Object.entries(a))s.set(r,c);return(await S(`${t}/summary?${s.toString()}`)).summary}async function B(t,e){let a=new URLSearchParams({product:e});return(await S(`${t}/distribution?${a.toString()}`)).distribution}async function q(t,e){let a=new URLSearchParams({product:e});return(await S(`${t}/attributes?${a.toString()}`)).attributes.filter(i=>i.display)}async function z(t,e){let a=new URLSearchParams({product:e});return(await S(`${t}/marketplace?${a.toString()}`)).stats}async function V(t,e){let a=new URLSearchParams;a.set("product",e.productId),a.set("sort",e.sort),a.set("page",String(e.page)),a.set("pageSize",String(e.pageSize)),e.rating&&a.set("rating",String(e.rating));for(let[i,r]of Object.entries(e.attrFilters))a.set(i,r);return await S(`${t}/reviews?${a.toString()}`)}async function G(t,e){var s;let a=await fetch(`${t}/reviews`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!a.ok){let i=await a.json().catch(()=>({}));throw new Error((s=i.error)!=null?s:`request failed: ${a.status}`)}return a.json()}var J="reviewos:filters-changed",tt="/apps/reviewos",et=5;function rt(t,e){return{apiBase:"",productSlug:t,blocks:new Set,loading:!0,error:null,product:null,summary:null,attributeDefs:[],aiSummary:null,aiSummaryLoading:!1,marketplaceStats:[],lightboxIndex:null,lightboxReturnIndex:null,galleryReviews:[],reviews:[],total:0,page:1,pageSize:e,reviewsLoading:!1,votedIds:{},ratingFilter:null,attrFilters:{},sort:"recent",writeOpen:!1,writeRating:0,writeSubmitting:!1,writeSuccess:!1,writeError:null}}function K(t){let e=t.dataset.block,a=t.dataset.productHandle||t.dataset.productId;if(!e||!a){console.error("[reviewos] missing data-block or data-product-handle");return}let s=(t.dataset.apiBase||tt).replace(/\/$/,""),i=Number(t.dataset.pageSize)||et,r=T(rt(a,i)),{attrFilters:c,rating:d,sort:g}=F(r.getState().attributeDefs);r.setState({attrFilters:c,ratingFilter:d,sort:g});function x(){let n=r.getState();if(n.loading){t.innerHTML='<div class="rvos-loading">Loading reviews\u2026</div>';return}if(n.error){t.innerHTML=`<div class="rvos-error">Couldn't load reviews. Please try again later.</div>`;return}switch(e){case"star-badge":t.innerHTML=j(n);break;case"rating-distribution":t.innerHTML=C(n);break;case"review-feed":t.innerHTML=H(n);break;case"filter-chips":t.innerHTML=P(n);break;case"write-review":t.innerHTML='<button type="button" class="rvos-btn rvos-btn--primary" data-action="open-write">Write a review</button>'+N(n);break;case"ai-summary":t.innerHTML=O(n);break;case"trust-badges":t.innerHTML=I(n);break;default:t.innerHTML=""}}r.subscribe(x);let _=0;async function L(n){let l=r.getState(),u=++_;r.setState({reviewsLoading:!0});try{let p=await V(s,{productId:a,rating:l.ratingFilter,attrFilters:l.attrFilters,sort:l.sort,page:n?1:l.page,pageSize:i});if(u!==_)return;let m=n?[]:r.getState().reviews;r.setState({reviews:[...m,...p.reviews],total:p.total,page:p.page,reviewsLoading:!1})}catch(p){if(u!==_)return;r.setState({reviewsLoading:!1,error:"reviews_failed"})}}let k=0;async function E(){let n=++k;r.setState({aiSummaryLoading:!0});try{let l=await U(s,a,r.getState().attrFilters);if(n!==k)return;r.setState({aiSummary:l,aiSummaryLoading:!1})}catch(l){if(n!==k)return;r.setState({aiSummary:null,aiSummaryLoading:!1})}}async function y(){e==="review-feed"&&await L(!0),e==="ai-summary"&&await E()}function M(){let n=F(r.getState().attributeDefs);r.setState({attrFilters:n.attrFilters,ratingFilter:n.rating,sort:n.sort}),y()}window.addEventListener("popstate",M),window.addEventListener(J,M);function h(n=!0){let l=r.getState();A(l.attrFilters,l.ratingFilter,l.sort,n),window.dispatchEvent(new Event(J))}t.addEventListener("click",async n=>{let l=n.target.closest("[data-action]");if(!l)return;let u=l.dataset.action;if(!(l.classList.contains("rvos-modal-overlay")&&n.target!==l)){if(u==="filter-rating"){let m=l.dataset.rating,v=m?Number(m):null,f=r.getState().ratingFilter;r.setState({ratingFilter:f===v?null:v}),h(),await y();return}if(u==="toggle-filter"){let m=l.dataset.key,v=l.dataset.value,f={...r.getState().attrFilters};f[m]===v?delete f[m]:f[m]=v,r.setState({attrFilters:f}),h(),await y();return}if(u==="clear-filters"){r.setState({attrFilters:{},ratingFilter:null}),h(),await y();return}if(u==="load-more"){if(r.getState().reviewsLoading)return;r.setState({page:r.getState().page+1}),await L(!1);return}if(u==="open-write"){r.setState({writeOpen:!0,writeSuccess:!1,writeError:null,writeRating:0});return}if(u==="close-write"){r.setState({writeOpen:!1});return}if(u==="set-write-rating"){r.setState({writeRating:Number(l.dataset.value)});return}}}),t.addEventListener("change",async n=>{let l=n.target;l.dataset.action==="set-sort"&&(r.setState({sort:l.value}),h(),await y())}),t.addEventListener("submit",async n=>{var v,f,$;let l=n.target;if(l.dataset.action!=="submit-write")return;n.preventDefault();let u=r.getState();if(u.writeRating<1){r.setState({writeError:"Please select a star rating."});return}let p=new FormData(l),m={};for(let w of u.attributeDefs){let R=p.get(`attr__${w.key}`);typeof R=="string"&&R&&(m[w.key]=R)}r.setState({writeSubmitting:!0,writeError:null});try{await G(s,{productId:a,customerName:String((v=p.get("customerName"))!=null?v:""),rating:u.writeRating,title:String((f=p.get("title"))!=null?f:"")||void 0,body:String(($=p.get("body"))!=null?$:""),attributes:m}),r.setState({writeSubmitting:!1,writeSuccess:!0})}catch(w){r.setState({writeSubmitting:!1,writeError:w instanceof Error?w.message:"Something went wrong."})}});async function Z(){try{let n=e==="star-badge"||e==="rating-distribution",l=e==="filter-chips"||e==="write-review",u=e==="review-feed",p=e==="ai-summary",m=e==="trust-badges",[v,f,$]=await Promise.all([n?B(s,a):Promise.resolve(null),l?q(s,a):Promise.resolve([]),m?z(s,a):Promise.resolve([])]);r.setState({summary:v?{average:v.average,count:v.count,byStar:v.byStar}:null,attributeDefs:f,marketplaceStats:$,loading:!1}),u&&await L(!0),p&&await E()}catch(n){console.error("[reviewos] shopify block init failed",n),r.setState({loading:!1,error:"init_failed"})}}x(),Z()}function at(t){t.dataset.reviewosMounted!=="true"&&(t.dataset.reviewosMounted="true",K(t))}function Y(){document.querySelectorAll("[data-reviewos]").forEach(at)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Y):Y();})();
