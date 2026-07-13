"use strict";(()=>{function E(t){let e=t,r=new Set;return{getState:()=>e,setState(a){e={...e,...a},r.forEach(i=>i())},subscribe(a){return r.add(a),()=>r.delete(a)}}}async function w(t){let e=await fetch(t);if(!e.ok)throw new Error(`request failed: ${e.status}`);return e.json()}async function x(t,e){return(await w(`${t}/api/products/${encodeURIComponent(e)}`)).product}async function M(t,e){return(await w(`${t}/api/reviews/summary?product=${encodeURIComponent(e)}`)).summary}async function D(t,e){return(await w(`${t}/api/attributes?category=${encodeURIComponent(e)}`)).attributes.filter(a=>a.display)}async function T(t,e){let r=new URLSearchParams;r.set("product",e.productSlug),r.set("sort",e.sort),r.set("page",String(e.page)),r.set("pageSize",String(e.pageSize)),e.rating&&r.set("rating",String(e.rating));for(let[i,d]of Object.entries(e.attrFilters))r.set(i,d);return await w(`${t}/api/reviews?${r.toString()}`)}async function j(t,e){let r=await fetch(`${t}/api/reviews/${encodeURIComponent(e)}/helpful`,{method:"POST"});if(!r.ok)throw new Error(`request failed: ${r.status}`);return r.json()}async function W(t,e){var a;let r=await fetch(`${t}/api/reviews`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!r.ok){let i=await r.json().catch(()=>({}));throw new Error((a=i.error)!=null?a:`request failed: ${r.status}`)}return r.json()}function c(t){return String(t!=null?t:"").replace(/[&<>"']/g,e=>{switch(e){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}function y(t,e=5){let r="";for(let a=1;a<=e;a++)r+=`<span class="rvos-star ${a<=t?"rvos-star--filled":""}">&#9733;</span>`;return r}function P(t){let e=new Date(t);return Number.isNaN(e.getTime())?"":e.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}function C(t){let e=t.summary;return e?`
    <div class="rvos-summary">
      <div class="rvos-summary__score">${e.average.toFixed(1)}</div>
      <div class="rvos-summary__meta">
        <div class="rvos-stars">${y(Math.round(e.average))}</div>
        <div class="rvos-summary__count">${e.count} review${e.count===1?"":"s"}</div>
      </div>
      <button type="button" class="rvos-btn rvos-btn--primary rvos-summary__write" data-action="open-write">
        Write a review
      </button>
    </div>
  `:""}function O(t){let e=t.summary;if(!e||e.count===0)return"";let r=[5,4,3,2,1].map(i=>{var g;let d=(g=e.byStar[String(i)])!=null?g:0,u=e.count>0?Math.round(d/e.count*100):0;return`
        <button type="button" class="rvos-dist-row ${t.ratingFilter===i?"rvos-dist-row--active":""}" data-action="filter-rating" data-rating="${i}">
          <span class="rvos-dist-row__label">${i}&#9733;</span>
          <span class="rvos-dist-row__bar"><span class="rvos-dist-row__fill" style="width:${u}%"></span></span>
          <span class="rvos-dist-row__count">${d}</span>
        </button>
      `}).join(""),a=t.ratingFilter?`<button type="button" class="rvos-link" data-action="filter-rating" data-rating="">Clear rating filter (${c(t.ratingFilter)}&#9733;)</button>`:"";return`<div class="rvos-distribution">${r}${a}</div>`}function A(t){if(t.attributeDefs.length===0)return"";let e=t.attributeDefs.map(i=>{let d=t.attrFilters[i.key],u=i.options.map(s=>`<button type="button" class="rvos-chip ${d===s?"rvos-chip--active":""}" data-action="toggle-filter" data-key="${c(i.key)}" data-value="${c(s)}">${c(s)}</button>`).join("");return`
        <div class="rvos-filter-group">
          <span class="rvos-filter-group__label">${c(i.label)}</span>
          <div class="rvos-filter-group__options">${u}</div>
        </div>
      `}).join(""),r=Object.entries(t.attrFilters);return`<div class="rvos-filters">${r.length>0?`<div class="rvos-active-filters">
          ${r.map(([i,d])=>{let u=t.attributeDefs.find(g=>g.key===i),s=u?u.label:i;return`<span class="rvos-active-chip">${c(s)}: ${c(d)} <button type="button" data-action="toggle-filter" data-key="${c(i)}" data-value="${c(d)}" aria-label="Remove filter">&times;</button></span>`}).join("")}
          <button type="button" class="rvos-link" data-action="clear-filters">Clear all</button>
        </div>`:""}${e}</div>`}var G=[{value:"recent",label:"Most recent"},{value:"helpful",label:"Most helpful"},{value:"rating_desc",label:"Highest rating"},{value:"rating_asc",label:"Lowest rating"}];function K(t,e){let r=[t.verifiedBuyer?'<span class="rvos-badge">Verified buyer</span>':"",t.verifiedMarketplace?'<span class="rvos-badge rvos-badge--marketplace">Verified marketplace</span>':""].join(""),a=t.media.length?`<div class="rvos-card__media">${t.media.map(d=>`<img class="rvos-card__thumb" src="${c(d.url)}" alt="review media" loading="lazy" />`).join("")}</div>`:"",i=t.merchantReply?`<div class="rvos-card__reply">
        <div class="rvos-card__reply-label">Merchant reply</div>
        <div>${c(t.merchantReply)}</div>
      </div>`:"";return`
    <article class="rvos-card" data-review-id="${c(t.id)}">
      <div class="rvos-card__head">
        <div class="rvos-stars">${y(t.rating)}</div>
        <div class="rvos-card__author">${c(t.customerName)}</div>
        ${r}
        <div class="rvos-card__date">${P(t.createdAt)}</div>
      </div>
      ${t.title?`<h4 class="rvos-card__title">${c(t.title)}</h4>`:""}
      <p class="rvos-card__body">${c(t.body)}</p>
      ${a}
      ${i}
      <button type="button" class="rvos-helpful" data-action="vote-helpful" data-review-id="${c(t.id)}" ${e?"disabled":""}>
        Helpful (<span class="rvos-helpful__count">${t.helpfulCount}</span>)
      </button>
    </article>
  `}function H(t){let e=G.map(u=>`<option value="${u.value}" ${t.sort===u.value?"selected":""}>${u.label}</option>`).join(""),r=`
    <div class="rvos-feed__toolbar">
      <span class="rvos-feed__total">${t.total} review${t.total===1?"":"s"}</span>
      <select class="rvos-select" data-action="set-sort">${e}</select>
    </div>
  `;if(t.reviewsLoading&&t.reviews.length===0)return`${r}<div class="rvos-feed__loading">Loading reviews\u2026</div>`;if(t.reviews.length===0)return`${r}<div class="rvos-empty">No reviews match your filters yet.</div>`;let a=t.reviews.map(u=>K(u,!!t.votedIds[u.id])).join(""),d=t.page*t.pageSize<t.total?`<button type="button" class="rvos-btn rvos-btn--outline rvos-feed__load-more" data-action="load-more" ${t.reviewsLoading?"disabled":""}>
        ${t.reviewsLoading?"Loading\u2026":"Load more"}
      </button>`:"";return`${r}<div class="rvos-feed__list">${a}</div>${d}`}function N(t){if(!t.writeOpen)return"";if(t.writeSuccess)return`
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
    `;let e=t.attributeDefs.map(a=>{let i=a.options.map(d=>`<option value="${c(d)}">${c(d)}</option>`).join("");return`
        <label class="rvos-field">
          <span>${c(a.label)}</span>
          <select name="attr__${c(a.key)}" class="rvos-select">
            <option value="">Select\u2026</option>
            ${i}
          </select>
        </label>
      `}).join(""),r=t.writeError?`<div class="rvos-form-error">${c(t.writeError)}</div>`:"";return`
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
  `}var I=new Set(["rating","sort","page"]);function q(t){let e=new URLSearchParams(window.location.search),r={},a=new Set(t.map(s=>s.key));for(let[s,g]of e.entries())a.has(s)&&!I.has(s)&&(r[s]=g);let i=e.get("rating"),d=i?Number(i):null,u=e.get("sort")||"recent";return{attrFilters:r,rating:d,sort:u}}function U(t,e,r){let a=new URLSearchParams(window.location.search);for(let u of Array.from(a.keys()))(I.has(u)||t[u]!==void 0)&&a.delete(u);for(let[u,s]of Object.entries(t))a.set(u,s);e&&a.set("rating",String(e)),r!=="recent"&&a.set("sort",r);let i=a.toString(),d=`${window.location.pathname}${i?`?${i}`:""}${window.location.hash}`;window.history.replaceState(null,"",d)}var Y=["summary","distribution","filters","feed","write"],z=5;function B(t){var R,L;let e=t.dataset.product;if(!e){console.error("[reviewos] missing data-product attribute");return}let r=e,a=((R=t.dataset.api)!=null?R:"").replace(/\/$/,""),i=((L=t.dataset.blocks)!=null?L:Y.join(",")).split(",").map(o=>o.trim()).filter(Boolean),d=new Set(i),s=E({apiBase:a,productSlug:r,blocks:d,loading:!0,error:null,product:null,summary:null,attributeDefs:[],reviews:[],total:0,page:1,pageSize:z,reviewsLoading:!1,votedIds:{},ratingFilter:null,attrFilters:{},sort:"recent",writeOpen:!1,writeRating:0,writeSubmitting:!1,writeSuccess:!1,writeError:null});t.innerHTML='<div class="rvos-widget"></div>';let g=t.querySelector(".rvos-widget");function _(){let o=s.getState();if(o.loading){g.innerHTML='<div class="rvos-loading">Loading reviews\u2026</div>';return}if(o.error){g.innerHTML=`<div class="rvos-error">Couldn't load reviews. Please try again later.</div>`;return}let n=[];o.blocks.has("summary")&&n.push(C(o)),o.blocks.has("distribution")&&n.push(O(o)),o.blocks.has("filters")&&n.push(A(o)),o.blocks.has("feed")&&n.push(H(o)),g.innerHTML=n.join("")+(o.blocks.has("write")?N(o):"")}s.subscribe(_);let S=0;async function h(o){let n=s.getState(),p=++S;s.setState({reviewsLoading:!0});try{let l=await T(a,{productSlug:r,rating:n.ratingFilter,attrFilters:n.attrFilters,sort:n.sort,page:o?1:n.page,pageSize:z});if(p!==S)return;let m=o?[]:s.getState().reviews;s.setState({reviews:[...m,...l.reviews],total:l.total,page:l.page,reviewsLoading:!1})}catch(l){if(p!==S)return;s.setState({reviewsLoading:!1,error:"reviews_failed"})}}async function b(){U(s.getState().attrFilters,s.getState().ratingFilter,s.getState().sort),await h(!0)}async function J(){try{let o=await x(a,r),[n,p]=await Promise.all([M(a,r),D(a,o.category)]),l=q(p);s.setState({product:o,summary:n,attributeDefs:p,ratingFilter:l.rating,attrFilters:l.attrFilters,sort:l.sort,loading:!1}),await h(!0)}catch(o){console.error("[reviewos] init failed",o),s.setState({loading:!1,error:"init_failed"})}}g.addEventListener("click",async o=>{let n=o.target.closest("[data-action]");if(!n)return;let p=n.dataset.action;if(p==="filter-rating"){let l=n.dataset.rating,m=l?Number(l):null,v=s.getState().ratingFilter;s.setState({ratingFilter:v===m?null:m}),await b();return}if(p==="toggle-filter"){let l=n.dataset.key,m=n.dataset.value,v={...s.getState().attrFilters};v[l]===m?delete v[l]:v[l]=m,s.setState({attrFilters:v}),await b();return}if(p==="clear-filters"){s.setState({attrFilters:{},ratingFilter:null}),await b();return}if(p==="load-more"){if(s.getState().reviewsLoading)return;s.setState({page:s.getState().page+1}),await h(!1);return}if(p==="vote-helpful"){let l=n.dataset.reviewId,m=s.getState();if(m.votedIds[l])return;s.setState({votedIds:{...m.votedIds,[l]:!0},reviews:m.reviews.map(v=>v.id===l?{...v,helpfulCount:v.helpfulCount+1}:v)});try{await j(a,l)}catch(v){}return}if(p==="open-write"){s.setState({writeOpen:!0,writeSuccess:!1,writeError:null,writeRating:0});return}if(p==="close-write"){s.setState({writeOpen:!1});return}if(p==="set-write-rating"){s.setState({writeRating:Number(n.dataset.value)});return}}),g.addEventListener("change",async o=>{let n=o.target;if(n.dataset.action==="set-sort"){let p=n.value;s.setState({sort:p}),await b()}}),g.addEventListener("submit",async o=>{var v,F,k;let n=o.target;if(n.dataset.action!=="submit-write")return;o.preventDefault();let p=s.getState();if(p.writeRating<1){s.setState({writeError:"Please select a star rating."});return}let l=new FormData(n),m={};for(let f of p.attributeDefs){let $=l.get(`attr__${f.key}`);typeof $=="string"&&$&&(m[f.key]=$)}s.setState({writeSubmitting:!0,writeError:null});try{await W(a,{productSlug:r,customerName:String((v=l.get("customerName"))!=null?v:""),rating:p.writeRating,title:String((F=l.get("title"))!=null?F:"")||void 0,body:String((k=l.get("body"))!=null?k:""),attributes:m}),s.setState({writeSubmitting:!1,writeSuccess:!0})}catch(f){s.setState({writeSubmitting:!1,writeError:f instanceof Error?f.message:"Something went wrong."})}}),_(),J()}function V(){document.querySelectorAll("[data-reviewos]").forEach(e=>{e.dataset.reviewosMounted||(e.dataset.reviewosMounted="true",B(e))})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",V):V();})();
