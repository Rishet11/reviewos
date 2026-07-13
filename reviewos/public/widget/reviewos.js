"use strict";(()=>{function A(t){let e=t,r=new Set;return{getState:()=>e,setState(a){e={...e,...a},r.forEach(i=>i())},subscribe(a){return r.add(a),()=>r.delete(a)}}}async function y(t){let e=await fetch(t);if(!e.ok)throw new Error(`request failed: ${e.status}`);return e.json()}async function j(t,e){return(await y(`${t}/api/products/${encodeURIComponent(e)}`)).product}async function M(t,e){return(await y(`${t}/api/reviews/summary?product=${encodeURIComponent(e)}`)).summary}async function C(t,e){return(await y(`${t}/api/attributes?category=${encodeURIComponent(e)}`)).attributes.filter(a=>a.display)}async function P(t,e){let r=new URLSearchParams;r.set("product",e.productSlug),r.set("sort",e.sort),r.set("page",String(e.page)),r.set("pageSize",String(e.pageSize)),e.rating&&r.set("rating",String(e.rating));for(let[i,u]of Object.entries(e.attrFilters))r.set(i,u);return await y(`${t}/api/reviews?${r.toString()}`)}async function T(t,e,r){let a=new URLSearchParams;a.set("product",e);for(let[u,c]of Object.entries(r))a.set(u,c);return(await y(`${t}/api/ai/summary?${a.toString()}`)).summary}async function W(t,e){let r=await fetch(`${t}/api/reviews/${encodeURIComponent(e)}/helpful`,{method:"POST"});if(!r.ok)throw new Error(`request failed: ${r.status}`);return r.json()}async function D(t,e){var a;let r=await fetch(`${t}/api/reviews`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!r.ok){let i=await r.json().catch(()=>({}));throw new Error((a=i.error)!=null?a:`request failed: ${r.status}`)}return r.json()}function l(t){return String(t!=null?t:"").replace(/[&<>"']/g,e=>{switch(e){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}function w(t,e=5){let r="";for(let a=1;a<=e;a++)r+=`<span class="rvos-star ${a<=t?"rvos-star--filled":""}">&#9733;</span>`;return r}function O(t){let e=new Date(t);return Number.isNaN(e.getTime())?"":e.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}function I(t){if(t.aiSummaryLoading)return'<div class="rvos-ai-summary rvos-ai-summary--loading">Generating AI summary\u2026</div>';let e=t.aiSummary;if(!e)return"";let r=Object.keys(t.attrFilters).length,a=r>0?`AI summary of ${e.reviewCount} review${e.reviewCount===1?"":"s"} matching ${r} filter${r===1?"":"s"}`:`AI summary of ${e.reviewCount} review${e.reviewCount===1?"":"s"}`,i=e.pros.map(c=>`<li class="rvos-ai-summary__pro">${l(c)}</li>`).join(""),u=e.cons.map(c=>`<li class="rvos-ai-summary__con">${l(c)}</li>`).join("");return`
    <div class="rvos-ai-summary">
      <div class="rvos-ai-summary__header">
        <span class="rvos-ai-summary__badge">&#10022; AI summary</span>
      </div>
      <p class="rvos-ai-summary__text">${l(e.summaryText)}</p>
      ${e.pros.length||e.cons.length?`<div class="rvos-ai-summary__lists">
              ${i?`<ul class="rvos-ai-summary__pros">${i}</ul>`:""}
              ${u?`<ul class="rvos-ai-summary__cons">${u}</ul>`:""}
            </div>`:""}
      <div class="rvos-ai-summary__caption">${l(a)}</div>
    </div>
  `}function H(t){let e=t.summary;return e?`
    <div class="rvos-summary">
      <div class="rvos-summary__score">${e.average.toFixed(1)}</div>
      <div class="rvos-summary__meta">
        <div class="rvos-stars">${w(Math.round(e.average))}</div>
        <div class="rvos-summary__count">${e.count} review${e.count===1?"":"s"}</div>
      </div>
      <button type="button" class="rvos-btn rvos-btn--primary rvos-summary__write" data-action="open-write">
        Write a review
      </button>
    </div>
  `:""}function N(t){let e=t.summary;if(!e||e.count===0)return"";let r=[5,4,3,2,1].map(i=>{var v;let u=(v=e.byStar[String(i)])!=null?v:0,c=e.count>0?Math.round(u/e.count*100):0;return`
        <button type="button" class="rvos-dist-row ${t.ratingFilter===i?"rvos-dist-row--active":""}" data-action="filter-rating" data-rating="${i}">
          <span class="rvos-dist-row__label">${i}&#9733;</span>
          <span class="rvos-dist-row__bar"><span class="rvos-dist-row__fill" style="width:${c}%"></span></span>
          <span class="rvos-dist-row__count">${u}</span>
        </button>
      `}).join(""),a=t.ratingFilter?`<button type="button" class="rvos-link" data-action="filter-rating" data-rating="">Clear rating filter (${l(t.ratingFilter)}&#9733;)</button>`:"";return`<div class="rvos-distribution">${r}${a}</div>`}function q(t){if(t.attributeDefs.length===0)return"";let e=t.attributeDefs.map(i=>{let u=t.attrFilters[i.key],c=i.options.map(s=>`<button type="button" class="rvos-chip ${u===s?"rvos-chip--active":""}" data-action="toggle-filter" data-key="${l(i.key)}" data-value="${l(s)}">${l(s)}</button>`).join("");return`
        <div class="rvos-filter-group">
          <span class="rvos-filter-group__label">${l(i.label)}</span>
          <div class="rvos-filter-group__options">${c}</div>
        </div>
      `}).join(""),r=Object.entries(t.attrFilters);return`<div class="rvos-filters">${r.length>0?`<div class="rvos-active-filters">
          ${r.map(([i,u])=>{let c=t.attributeDefs.find(v=>v.key===i),s=c?c.label:i;return`<span class="rvos-active-chip">${l(s)}: ${l(u)} <button type="button" data-action="toggle-filter" data-key="${l(i)}" data-value="${l(u)}" aria-label="Remove filter">&times;</button></span>`}).join("")}
          <button type="button" class="rvos-link" data-action="clear-filters">Clear all</button>
        </div>`:""}${e}</div>`}var X=[{value:"recent",label:"Most recent"},{value:"helpful",label:"Most helpful"},{value:"rating_desc",label:"Highest rating"},{value:"rating_asc",label:"Lowest rating"}];function tt(t,e){let r=[t.verifiedBuyer?'<span class="rvos-badge">Verified buyer</span>':"",t.verifiedMarketplace?'<span class="rvos-badge rvos-badge--marketplace">Verified marketplace</span>':""].join(""),a=t.media.length?`<div class="rvos-card__media">${t.media.map(u=>`<img class="rvos-card__thumb" src="${l(u.url)}" alt="review media" loading="lazy" />`).join("")}</div>`:"",i=t.merchantReply?`<div class="rvos-card__reply">
        <div class="rvos-card__reply-label">Merchant reply</div>
        <div>${l(t.merchantReply)}</div>
      </div>`:"";return`
    <article class="rvos-card" data-review-id="${l(t.id)}">
      <div class="rvos-card__head">
        <div class="rvos-stars">${w(t.rating)}</div>
        <div class="rvos-card__author">${l(t.customerName)}</div>
        ${r}
        <div class="rvos-card__date">${O(t.createdAt)}</div>
      </div>
      ${t.title?`<h4 class="rvos-card__title">${l(t.title)}</h4>`:""}
      <p class="rvos-card__body">${l(t.body)}</p>
      ${a}
      ${i}
      <button type="button" class="rvos-helpful" data-action="vote-helpful" data-review-id="${l(t.id)}" ${e?"disabled":""}>
        Helpful (<span class="rvos-helpful__count">${t.helpfulCount}</span>)
      </button>
    </article>
  `}function U(t){let e=X.map(c=>`<option value="${c.value}" ${t.sort===c.value?"selected":""}>${c.label}</option>`).join(""),r=`
    <div class="rvos-feed__toolbar">
      <span class="rvos-feed__total">${t.total} review${t.total===1?"":"s"}</span>
      <select class="rvos-select" data-action="set-sort">${e}</select>
    </div>
  `;if(t.reviewsLoading&&t.reviews.length===0)return`${r}<div class="rvos-feed__loading">Loading reviews\u2026</div>`;if(t.reviews.length===0)return`${r}<div class="rvos-empty">No reviews match your filters yet.</div>`;let a=t.reviews.map(c=>tt(c,!!t.votedIds[c.id])).join(""),u=t.page*t.pageSize<t.total?`<button type="button" class="rvos-btn rvos-btn--outline rvos-feed__load-more" data-action="load-more" ${t.reviewsLoading?"disabled":""}>
        ${t.reviewsLoading?"Loading\u2026":"Load more"}
      </button>`:"";return`${r}<div class="rvos-feed__list">${a}</div>${u}`}function z(t){if(!t.writeOpen)return"";if(t.writeSuccess)return`
      <div class="rvos-modal-overlay" data-action="close-write">
        <div class="rvos-modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
          <button type="button" class="rvos-modal__close" data-action="close-write" aria-label="Close">&times;</button>
          <div class="rvos-success">
            <div class="rvos-success__icon">&#10003;</div>
            <h3>Thanks for your review!</h3>
            <p>It's been submitted and will appear once it's approved by moderation.</p>
            <button type="button" class="rvos-btn rvos-btn--primary" data-action="close-write">Done</button>
          </div>
        </div>
      </div>
    `;let e=t.attributeDefs.map(a=>{let i=a.options.map(u=>`<option value="${l(u)}">${l(u)}</option>`).join("");return`
        <label class="rvos-field">
          <span>${l(a.label)}</span>
          <select name="attr__${l(a.key)}" class="rvos-select">
            <option value="">Select\u2026</option>
            ${i}
          </select>
        </label>
      `}).join(""),r=t.writeError?`<div class="rvos-form-error">${l(t.writeError)}</div>`:"";return`
    <div class="rvos-modal-overlay" data-action="close-write">
      <div class="rvos-modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
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
              ${[1,2,3,4,5].map(a=>`<button type="button" class="rvos-star-btn ${a<=t.writeRating?"rvos-star-btn--filled":""}" data-action="set-write-rating" data-value="${a}" aria-label="${a} star">&#9733;</button>`).join("")}
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
          ${r}
          <button type="submit" class="rvos-btn rvos-btn--primary" ${t.writeSubmitting?"disabled":""}>
            ${t.writeSubmitting?"Submitting\u2026":"Submit review"}
          </button>
        </form>
      </div>
    </div>
  `}var B=new Set(["rating","sort","page"]);function V(t){let e=new URLSearchParams(window.location.search),r={},a=new Set(t.map(s=>s.key));for(let[s,v]of e.entries())a.has(s)&&!B.has(s)&&(r[s]=v);let i=e.get("rating"),u=i?Number(i):null,c=e.get("sort")||"recent";return{attrFilters:r,rating:u,sort:c}}function J(t,e,r){let a=new URLSearchParams(window.location.search);for(let c of Array.from(a.keys()))(B.has(c)||t[c]!==void 0)&&a.delete(c);for(let[c,s]of Object.entries(t))a.set(c,s);e&&a.set("rating",String(e)),r!=="recent"&&a.set("sort",r);let i=a.toString(),u=`${window.location.pathname}${i?`?${i}`:""}${window.location.hash}`;window.history.replaceState(null,"",u)}var et=["ai-summary","summary","distribution","filters","feed","write"],G=5;function K(t){var k,F;let e=t.dataset.product;if(!e){console.error("[reviewos] missing data-product attribute");return}let r=e,a=((k=t.dataset.api)!=null?k:"").replace(/\/$/,""),i=((F=t.dataset.blocks)!=null?F:et.join(",")).split(",").map(o=>o.trim()).filter(Boolean),u=new Set(i),s=A({apiBase:a,productSlug:r,blocks:u,loading:!0,error:null,product:null,summary:null,attributeDefs:[],aiSummary:null,aiSummaryLoading:!1,reviews:[],total:0,page:1,pageSize:G,reviewsLoading:!1,votedIds:{},ratingFilter:null,attrFilters:{},sort:"recent",writeOpen:!1,writeRating:0,writeSubmitting:!1,writeSuccess:!1,writeError:null});t.innerHTML='<div class="rvos-widget"></div>';let v=t.querySelector(".rvos-widget");function L(){let o=s.getState();if(o.loading){v.innerHTML='<div class="rvos-loading">Loading reviews\u2026</div>';return}if(o.error){v.innerHTML=`<div class="rvos-error">Couldn't load reviews. Please try again later.</div>`;return}let n=[];o.blocks.has("ai-summary")&&n.push(I(o)),o.blocks.has("summary")&&n.push(H(o)),o.blocks.has("distribution")&&n.push(N(o)),o.blocks.has("filters")&&n.push(q(o)),o.blocks.has("feed")&&n.push(U(o)),v.innerHTML=n.join("")+(o.blocks.has("write")?z(o):"")}s.subscribe(L);let S=0;async function h(o){let n=s.getState(),m=++S;s.setState({reviewsLoading:!0});try{let d=await P(a,{productSlug:r,rating:n.ratingFilter,attrFilters:n.attrFilters,sort:n.sort,page:o?1:n.page,pageSize:G});if(m!==S)return;let g=o?[]:s.getState().reviews;s.setState({reviews:[...g,...d.reviews],total:d.total,page:d.page,reviewsLoading:!1})}catch(d){if(m!==S)return;s.setState({reviewsLoading:!1,error:"reviews_failed"})}}let $=0;async function R(){if(!s.getState().blocks.has("ai-summary"))return;let o=++$;s.setState({aiSummaryLoading:!0});try{let n=await T(a,r,s.getState().attrFilters);if(o!==$)return;s.setState({aiSummary:n,aiSummaryLoading:!1})}catch(n){if(o!==$)return;s.setState({aiSummary:null,aiSummaryLoading:!1})}}async function b(){J(s.getState().attrFilters,s.getState().ratingFilter,s.getState().sort),await Promise.all([h(!0),R()])}async function Q(){try{let o=await j(a,r),[n,m]=await Promise.all([M(a,r),C(a,o.category)]),d=V(m);s.setState({product:o,summary:n,attributeDefs:m,ratingFilter:d.rating,attrFilters:d.attrFilters,sort:d.sort,loading:!1}),await Promise.all([h(!0),R()])}catch(o){console.error("[reviewos] init failed",o),s.setState({loading:!1,error:"init_failed"})}}v.addEventListener("click",async o=>{let n=o.target.closest("[data-action]");if(!n)return;let m=n.dataset.action;if(m==="filter-rating"){let d=n.dataset.rating,g=d?Number(d):null,p=s.getState().ratingFilter;s.setState({ratingFilter:p===g?null:g}),await b();return}if(m==="toggle-filter"){let d=n.dataset.key,g=n.dataset.value,p={...s.getState().attrFilters};p[d]===g?delete p[d]:p[d]=g,s.setState({attrFilters:p}),await b();return}if(m==="clear-filters"){s.setState({attrFilters:{},ratingFilter:null}),await b();return}if(m==="load-more"){if(s.getState().reviewsLoading)return;s.setState({page:s.getState().page+1}),await h(!1);return}if(m==="vote-helpful"){let d=n.dataset.reviewId,g=s.getState();if(g.votedIds[d])return;s.setState({votedIds:{...g.votedIds,[d]:!0},reviews:g.reviews.map(p=>p.id===d?{...p,helpfulCount:p.helpfulCount+1}:p)});try{await W(a,d)}catch(p){}return}if(m==="open-write"){s.setState({writeOpen:!0,writeSuccess:!1,writeError:null,writeRating:0});return}if(m==="close-write"){s.setState({writeOpen:!1});return}if(m==="set-write-rating"){s.setState({writeRating:Number(n.dataset.value)});return}}),v.addEventListener("change",async o=>{let n=o.target;if(n.dataset.action==="set-sort"){let m=n.value;s.setState({sort:m}),await b()}}),v.addEventListener("submit",async o=>{var p,x,E;let n=o.target;if(n.dataset.action!=="submit-write")return;o.preventDefault();let m=s.getState();if(m.writeRating<1){s.setState({writeError:"Please select a star rating."});return}let d=new FormData(n),g={};for(let f of m.attributeDefs){let _=d.get(`attr__${f.key}`);typeof _=="string"&&_&&(g[f.key]=_)}s.setState({writeSubmitting:!0,writeError:null});try{await D(a,{productSlug:r,customerName:String((p=d.get("customerName"))!=null?p:""),rating:m.writeRating,title:String((x=d.get("title"))!=null?x:"")||void 0,body:String((E=d.get("body"))!=null?E:""),attributes:g}),s.setState({writeSubmitting:!1,writeSuccess:!0})}catch(f){s.setState({writeSubmitting:!1,writeError:f instanceof Error?f.message:"Something went wrong."})}}),L(),Q()}function Y(){document.querySelectorAll("[data-reviewos]").forEach(e=>{e.dataset.reviewosMounted||(e.dataset.reviewosMounted="true",K(e))})}function Z(){document.readyState==="complete"?Y():window.addEventListener("load",Y,{once:!0})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Z):Z();})();
