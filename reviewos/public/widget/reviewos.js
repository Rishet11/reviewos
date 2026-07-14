"use strict";(()=>{function W(t){let e=t,a=new Set;return{getState:()=>e,setState(r){e={...e,...r},a.forEach(o=>o())},subscribe(r){return a.add(r),()=>a.delete(r)}}}async function b(t){let e=await fetch(t);if(!e.ok)throw new Error(`request failed: ${e.status}`);return e.json()}async function j(t,e){return(await b(`${t}/api/products/${encodeURIComponent(e)}`)).product}async function T(t,e){return(await b(`${t}/api/reviews/summary?product=${encodeURIComponent(e)}`)).summary}async function D(t,e){return(await b(`${t}/api/attributes?category=${encodeURIComponent(e)}`)).attributes.filter(r=>r.display)}async function L(t,e){let a=new URLSearchParams;a.set("product",e.productSlug),a.set("sort",e.sort),a.set("page",String(e.page)),a.set("pageSize",String(e.pageSize)),e.rating&&a.set("rating",String(e.rating));for(let[o,u]of Object.entries(e.attrFilters))a.set(o,u);return await b(`${t}/api/reviews?${a.toString()}`)}async function N(t,e,a){let r=new URLSearchParams;r.set("product",e);for(let[u,d]of Object.entries(a))r.set(u,d);return(await b(`${t}/api/ai/summary?${r.toString()}`)).summary}async function O(t,e){return(await b(`${t}/api/marketplace?product=${encodeURIComponent(e)}`)).stats}async function U(t,e){let a=await fetch(`${t}/api/reviews/${encodeURIComponent(e)}/helpful`,{method:"POST"});if(!a.ok)throw new Error(`request failed: ${a.status}`);return a.json()}async function H(t,e){var r;let a=await fetch(`${t}/api/reviews`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!a.ok){let o=await a.json().catch(()=>({}));throw new Error((r=o.error)!=null?r:`request failed: ${a.status}`)}return a.json()}function l(t){return String(t!=null?t:"").replace(/[&<>"']/g,e=>{switch(e){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}function f(t,e=5){let a="";for(let r=1;r<=e;r++)a+=`<span class="rvos-star ${r<=t?"rvos-star--filled":""}">&#9733;</span>`;return a}function q(t){let e=new Date(t);return Number.isNaN(e.getTime())?"":e.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}function z(t){if(t.aiSummaryLoading)return'<div class="rvos-ai-summary rvos-ai-summary--loading">Generating AI summary\u2026</div>';let e=t.aiSummary;if(!e)return"";let a=Object.keys(t.attrFilters).length,r=a>0?`AI summary of ${e.reviewCount} review${e.reviewCount===1?"":"s"} matching ${a} filter${a===1?"":"s"}`:`AI summary of ${e.reviewCount} review${e.reviewCount===1?"":"s"}`,o=e.pros.map(d=>`<li class="rvos-ai-summary__pro">${l(d)}</li>`).join(""),u=e.cons.map(d=>`<li class="rvos-ai-summary__con">${l(d)}</li>`).join("");return`
    <div class="rvos-ai-summary">
      <div class="rvos-ai-summary__header">
        <span class="rvos-ai-summary__badge">&#10022; AI summary</span>
      </div>
      <p class="rvos-ai-summary__text">${l(e.summaryText)}</p>
      ${e.pros.length||e.cons.length?`<div class="rvos-ai-summary__lists">
              ${o?`<ul class="rvos-ai-summary__pros">${o}</ul>`:""}
              ${u?`<ul class="rvos-ai-summary__cons">${u}</ul>`:""}
            </div>`:""}
      <div class="rvos-ai-summary__caption">${l(r)}</div>
    </div>
  `}function G(t){let e=t.summary;return e?`
    <div class="rvos-summary">
      <div class="rvos-summary__score">${e.average.toFixed(1)}</div>
      <div class="rvos-summary__meta">
        <div class="rvos-stars">${f(Math.round(e.average))}</div>
        <div class="rvos-summary__count">${e.count} review${e.count===1?"":"s"}</div>
      </div>
      <button type="button" class="rvos-btn rvos-btn--primary rvos-summary__write" data-action="open-write">
        Write a review
      </button>
    </div>
  `:""}function B(t){let e=t.marketplaceStats;return!e||e.length===0?"":`
    <div class="rvos-trust-badges">
      <div class="rvos-trust-badges__row">${e.map(r=>{let o=l(r.source.name.trim().charAt(0).toUpperCase()||"?"),u=r.source.logoUrl?`<img class="rvos-trust-badge__logo" src="${l(r.source.logoUrl)}" alt="${l(r.source.name)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'rvos-trust-badge__fallback',textContent:'${o}'}))" />`:`<div class="rvos-trust-badge__fallback">${o}</div>`;return`
        <a class="rvos-trust-badge" href="${l(r.url)}" target="_blank" rel="noopener noreferrer">
          ${u}
          <div class="rvos-trust-badge__body">
            <div class="rvos-trust-badge__name">${l(r.source.name)}</div>
            <div class="rvos-stars">${f(Math.round(r.rating))}</div>
            <div class="rvos-trust-badge__count">${l(r.rating.toFixed(1))} | ${r.reviewCount.toLocaleString()} reviews</div>
          </div>
        </a>
      `}).join("")}</div>
      <div class="rvos-trust-badges__combined">Rated across ${e.length} marketplace${e.length===1?"":"s"}</div>
    </div>
  `}function V(t){let e=t.summary;if(!e||e.count===0)return"";let a=[5,4,3,2,1].map(o=>{var v;let u=(v=e.byStar[String(o)])!=null?v:0,d=e.count>0?Math.round(u/e.count*100):0;return`
        <button type="button" class="rvos-dist-row ${t.ratingFilter===o?"rvos-dist-row--active":""}" data-action="filter-rating" data-rating="${o}">
          <span class="rvos-dist-row__label">${o}&#9733;</span>
          <span class="rvos-dist-row__bar"><span class="rvos-dist-row__fill" style="width:${d}%"></span></span>
          <span class="rvos-dist-row__count">${u}</span>
        </button>
      `}).join(""),r=t.ratingFilter?`<button type="button" class="rvos-link" data-action="filter-rating" data-rating="">Clear rating filter (${l(t.ratingFilter)}&#9733;)</button>`:"";return`<div class="rvos-distribution">${a}${r}</div>`}function J(t){if(t.attributeDefs.length===0)return"";let e=t.attributeDefs.map(o=>{let u=t.attrFilters[o.key],d=o.options.map(s=>`<button type="button" class="rvos-chip ${u===s?"rvos-chip--active":""}" data-action="toggle-filter" data-key="${l(o.key)}" data-value="${l(s)}">${l(s)}</button>`).join("");return`
        <div class="rvos-filter-group">
          <span class="rvos-filter-group__label">${l(o.label)}</span>
          <div class="rvos-filter-group__options">${d}</div>
        </div>
      `}).join(""),a=Object.entries(t.attrFilters);return`<div class="rvos-filters">${a.length>0?`<div class="rvos-active-filters">
          ${a.map(([o,u])=>{let d=t.attributeDefs.find(v=>v.key===o),s=d?d.label:o;return`<span class="rvos-active-chip">${l(s)}: ${l(u)} <button type="button" data-action="toggle-filter" data-key="${l(o)}" data-value="${l(u)}" aria-label="Remove filter">&times;</button></span>`}).join("")}
          <button type="button" class="rvos-link" data-action="clear-filters">Clear all</button>
        </div>`:""}${e}</div>`}var nt=8;function S(t){let e=[];for(let a of t.galleryReviews)for(let r of a.media)r.type==="image"&&e.push({url:r.url,review:a});return e}function K(t){let e=S(t);if(e.length===0)return"";let a=e.slice(0,nt),r=e.length-a.length,o=a.map((d,s)=>`
        <button type="button" class="rvos-gallery__thumb" data-action="open-lightbox" data-photo-index="${s}">
          <img src="${l(d.url)}" alt="Photo from ${l(d.review.customerName)}" loading="lazy" />
        </button>
      `).join(""),u=r>0?`<button type="button" class="rvos-gallery__thumb rvos-gallery__more" data-action="open-lightbox" data-photo-index="${a.length}">
          <span>+${r} more</span>
        </button>`:"";return`
    <div class="rvos-gallery">
      <div class="rvos-gallery__title">Photos from customers</div>
      <div class="rvos-gallery__strip">${o}${u}</div>
    </div>
  `}function Y(t){if(!t.blocks.has("ugc-gallery")||t.lightboxIndex===null)return"";let e=S(t),a=t.lightboxIndex,r=e[a];if(!r)return"";let{review:o}=r,u=o.title||o.body;return`
    <div class="rvos-lightbox" data-action="close-lightbox" role="dialog" aria-modal="true">
      <button type="button" class="rvos-lightbox__close" data-action="close-lightbox" aria-label="Close">&times;</button>
      ${a>0?'<button type="button" class="rvos-lightbox__nav rvos-lightbox__nav--prev" data-action="lightbox-prev" aria-label="Previous photo">&#8249;</button>':""}
      ${a<e.length-1?'<button type="button" class="rvos-lightbox__nav rvos-lightbox__nav--next" data-action="lightbox-next" aria-label="Next photo">&#8250;</button>':""}
      <div class="rvos-lightbox__content" onclick="event.stopPropagation()">
        <img class="rvos-lightbox__image" src="${l(r.url)}" alt="Photo from ${l(o.customerName)}" />
        <div class="rvos-lightbox__meta">
          <div class="rvos-lightbox__author">${l(o.customerName)}</div>
          <div class="rvos-stars">${f(o.rating)}</div>
          <div class="rvos-lightbox__snippet">${l(u)}</div>
        </div>
      </div>
    </div>
  `}var lt=[{value:"recent",label:"Most recent"},{value:"helpful",label:"Most helpful"},{value:"rating_desc",label:"Highest rating"},{value:"rating_asc",label:"Lowest rating"}];function ct(t,e){let a=[t.verifiedBuyer?'<span class="rvos-badge">Verified buyer</span>':"",t.verifiedMarketplace?'<span class="rvos-badge rvos-badge--marketplace">Verified marketplace</span>':""].join(""),r=t.media.length?`<div class="rvos-card__media">${t.media.map(u=>`<img class="rvos-card__thumb" src="${l(u.url)}" alt="review media" loading="lazy" />`).join("")}</div>`:"",o=t.merchantReply?`<div class="rvos-card__reply">
        <div class="rvos-card__reply-label">Merchant reply</div>
        <div>${l(t.merchantReply)}</div>
      </div>`:"";return`
    <article class="rvos-card" data-review-id="${l(t.id)}">
      <div class="rvos-card__head">
        <div class="rvos-stars">${f(t.rating)}</div>
        <div class="rvos-card__author">${l(t.customerName)}</div>
        ${a}
        <div class="rvos-card__date">${q(t.createdAt)}</div>
      </div>
      ${t.title?`<h4 class="rvos-card__title">${l(t.title)}</h4>`:""}
      <p class="rvos-card__body">${l(t.body)}</p>
      ${r}
      ${o}
      <button type="button" class="rvos-helpful" data-action="vote-helpful" data-review-id="${l(t.id)}" ${e?"disabled":""}>
        Helpful (<span class="rvos-helpful__count">${t.helpfulCount}</span>)
      </button>
    </article>
  `}function Z(t){let e=lt.map(d=>`<option value="${d.value}" ${t.sort===d.value?"selected":""}>${d.label}</option>`).join(""),a=`
    <div class="rvos-feed__toolbar">
      <span class="rvos-feed__total">${t.total} review${t.total===1?"":"s"}</span>
      <select class="rvos-select" data-action="set-sort">${e}</select>
    </div>
  `;if(t.reviewsLoading&&t.reviews.length===0)return`${a}<div class="rvos-feed__loading">Loading reviews\u2026</div>`;if(t.reviews.length===0)return`${a}<div class="rvos-empty">No reviews match your filters yet.</div>`;let r=t.reviews.map(d=>ct(d,!!t.votedIds[d.id])).join(""),u=t.page*t.pageSize<t.total?`<button type="button" class="rvos-btn rvos-btn--outline rvos-feed__load-more" data-action="load-more" ${t.reviewsLoading?"disabled":""}>
        ${t.reviewsLoading?"Loading\u2026":"Load more"}
      </button>`:"";return`${a}<div class="rvos-feed__list">${r}</div>${u}`}function Q(t){if(!t.writeOpen)return"";if(t.writeSuccess)return`
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
    `;let e=t.attributeDefs.map(r=>{let o=r.options.map(u=>`<option value="${l(u)}">${l(u)}</option>`).join("");return`
        <label class="rvos-field">
          <span>${l(r.label)}</span>
          <select name="attr__${l(r.key)}" class="rvos-select">
            <option value="">Select\u2026</option>
            ${o}
          </select>
        </label>
      `}).join(""),a=t.writeError?`<div class="rvos-form-error">${l(t.writeError)}</div>`:"";return`
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
              ${[1,2,3,4,5].map(r=>`<button type="button" class="rvos-star-btn ${r<=t.writeRating?"rvos-star-btn--filled":""}" data-action="set-write-rating" data-value="${r}" aria-label="${r} star">&#9733;</button>`).join("")}
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
  `}var X=new Set(["rating","sort","page"]);function tt(t){let e=new URLSearchParams(window.location.search),a={},r=new Set(t.map(s=>s.key));for(let[s,v]of e.entries())r.has(s)&&!X.has(s)&&(a[s]=v);let o=e.get("rating"),u=o?Number(o):null,d=e.get("sort")||"recent";return{attrFilters:a,rating:u,sort:d}}function et(t,e,a){let r=new URLSearchParams(window.location.search);for(let d of Array.from(r.keys()))(X.has(d)||t[d]!==void 0)&&r.delete(d);for(let[d,s]of Object.entries(t))r.set(d,s);e&&r.set("rating",String(e)),a!=="recent"&&r.set("sort",a);let o=r.toString(),u=`${window.location.pathname}${o?`?${o}`:""}${window.location.hash}`;window.history.replaceState(null,"",u)}var ut=["ai-summary","summary","trust-badges","distribution","filters","ugc-gallery","feed","write"],rt=5;function at(t){var P,M;let e=t.dataset.product;if(!e){console.error("[reviewos] missing data-product attribute");return}let a=e,r=((P=t.dataset.api)!=null?P:"").replace(/\/$/,""),o=((M=t.dataset.blocks)!=null?M:ut.join(",")).split(",").map(i=>i.trim()).filter(Boolean),u=new Set(o),s=W({apiBase:r,productSlug:a,blocks:u,loading:!0,error:null,product:null,summary:null,attributeDefs:[],aiSummary:null,aiSummaryLoading:!1,marketplaceStats:[],lightboxIndex:null,lightboxReturnIndex:null,galleryReviews:[],reviews:[],total:0,page:1,pageSize:rt,reviewsLoading:!1,votedIds:{},ratingFilter:null,attrFilters:{},sort:"recent",writeOpen:!1,writeRating:0,writeSubmitting:!1,writeSuccess:!1,writeError:null});t.innerHTML='<div class="rvos-widget"></div>';let v=t.querySelector(".rvos-widget");function I(){let i=s.getState();if(i.loading){v.innerHTML='<div class="rvos-loading">Loading reviews\u2026</div>';return}if(i.error){v.innerHTML=`<div class="rvos-error">Couldn't load reviews. Please try again later.</div>`;return}let n=[];if(i.blocks.has("ai-summary")&&n.push(z(i)),i.blocks.has("summary")&&n.push(G(i)),i.blocks.has("trust-badges")&&n.push(B(i)),i.blocks.has("distribution")&&n.push(V(i)),i.blocks.has("filters")&&n.push(J(i)),i.blocks.has("ugc-gallery")&&n.push(K(i)),i.blocks.has("feed")&&n.push(Z(i)),v.innerHTML=n.join("")+(i.blocks.has("write")?Q(i):"")+Y(i),y!==null){let g=y;y=null;let c=v.querySelector(`[data-photo-index="${g}"]`);c==null||c.focus()}}let y=null;s.subscribe(I);let $=0;async function _(i){let n=s.getState(),g=++$;s.setState({reviewsLoading:!0});try{let c=await L(r,{productSlug:a,rating:n.ratingFilter,attrFilters:n.attrFilters,sort:n.sort,page:i?1:n.page,pageSize:rt});if(g!==$)return;let m=i?[]:s.getState().reviews;s.setState({reviews:[...m,...c.reviews],total:c.total,page:c.page,reviewsLoading:!1})}catch(c){if(g!==$)return;s.setState({reviewsLoading:!1,error:"reviews_failed"})}}let x=0;async function F(){if(!s.getState().blocks.has("ugc-gallery"))return;let i=s.getState(),n=++x;try{let g=await L(r,{productSlug:a,rating:i.ratingFilter,attrFilters:i.attrFilters,sort:i.sort,page:1,pageSize:200});if(n!==x)return;s.setState({galleryReviews:g.reviews})}catch(g){if(n!==x)return;s.setState({galleryReviews:[]})}}let k=0;async function E(){if(!s.getState().blocks.has("ai-summary"))return;let i=++k;s.setState({aiSummaryLoading:!0});try{let n=await N(r,a,s.getState().attrFilters);if(i!==k)return;s.setState({aiSummary:n,aiSummaryLoading:!1})}catch(n){if(i!==k)return;s.setState({aiSummary:null,aiSummaryLoading:!1})}}async function w(){s.getState().lightboxIndex!==null&&s.setState({lightboxIndex:null,lightboxReturnIndex:null}),et(s.getState().attrFilters,s.getState().ratingFilter,s.getState().sort),await Promise.all([_(!0),E(),F()])}async function it(){try{let i=await j(r,a),[n,g]=await Promise.all([T(r,a),D(r,i.category)]),c=tt(g);s.setState({product:i,summary:n,attributeDefs:g,ratingFilter:c.rating,attrFilters:c.attrFilters,sort:c.sort,loading:!1}),s.getState().blocks.has("trust-badges")&&O(r,a).then(m=>s.setState({marketplaceStats:m})).catch(()=>s.setState({marketplaceStats:[]})),await Promise.all([_(!0),E(),F()])}catch(i){console.error("[reviewos] init failed",i),s.setState({loading:!1,error:"init_failed"})}}v.addEventListener("click",async i=>{let n=i.target.closest("[data-action]");if(!n)return;let g=n.dataset.action;if(g==="filter-rating"){let c=n.dataset.rating,m=c?Number(c):null,p=s.getState().ratingFilter;s.setState({ratingFilter:p===m?null:m}),await w();return}if(g==="toggle-filter"){let c=n.dataset.key,m=n.dataset.value,p={...s.getState().attrFilters};p[c]===m?delete p[c]:p[c]=m,s.setState({attrFilters:p}),await w();return}if(g==="clear-filters"){s.setState({attrFilters:{},ratingFilter:null}),await w();return}if(g==="load-more"){if(s.getState().reviewsLoading)return;s.setState({page:s.getState().page+1}),await _(!1);return}if(g==="vote-helpful"){let c=n.dataset.reviewId,m=s.getState();if(m.votedIds[c])return;s.setState({votedIds:{...m.votedIds,[c]:!0},reviews:m.reviews.map(p=>p.id===c?{...p,helpfulCount:p.helpfulCount+1}:p)});try{await U(r,c)}catch(p){}return}if(g==="open-write"){s.setState({writeOpen:!0,writeSuccess:!1,writeError:null,writeRating:0});return}if(g==="close-write"){s.setState({writeOpen:!1});return}if(g==="set-write-rating"){s.setState({writeRating:Number(n.dataset.value)});return}if(g==="open-lightbox"){let c=Number(n.dataset.photoIndex);s.setState({lightboxIndex:c,lightboxReturnIndex:c});return}if(g==="close-lightbox"){y=s.getState().lightboxReturnIndex,s.setState({lightboxIndex:null,lightboxReturnIndex:null});return}if(g==="lightbox-prev"){let c=s.getState().lightboxIndex;c!==null&&c>0&&s.setState({lightboxIndex:c-1});return}if(g==="lightbox-next"){let c=s.getState(),m=S(c).length;c.lightboxIndex!==null&&c.lightboxIndex<m-1&&s.setState({lightboxIndex:c.lightboxIndex+1});return}}),document.addEventListener("keydown",i=>{let n=s.getState();if(n.lightboxIndex!==null){if(i.key==="Escape")y=n.lightboxReturnIndex,s.setState({lightboxIndex:null,lightboxReturnIndex:null});else if(i.key==="ArrowLeft")n.lightboxIndex>0&&s.setState({lightboxIndex:n.lightboxIndex-1});else if(i.key==="ArrowRight"){let g=S(n).length;n.lightboxIndex<g-1&&s.setState({lightboxIndex:n.lightboxIndex+1})}}}),v.addEventListener("change",async i=>{let n=i.target;if(n.dataset.action==="set-sort"){let g=n.value;s.setState({sort:g}),await w()}}),v.addEventListener("submit",async i=>{var p,A,C;let n=i.target;if(n.dataset.action!=="submit-write")return;i.preventDefault();let g=s.getState();if(g.writeRating<1){s.setState({writeError:"Please select a star rating."});return}let c=new FormData(n),m={};for(let h of g.attributeDefs){let R=c.get(`attr__${h.key}`);typeof R=="string"&&R&&(m[h.key]=R)}s.setState({writeSubmitting:!0,writeError:null});try{await H(r,{productSlug:a,customerName:String((p=c.get("customerName"))!=null?p:""),rating:g.writeRating,title:String((A=c.get("title"))!=null?A:"")||void 0,body:String((C=c.get("body"))!=null?C:""),attributes:m}),s.setState({writeSubmitting:!1,writeSuccess:!0})}catch(h){s.setState({writeSubmitting:!1,writeError:h instanceof Error?h.message:"Something went wrong."})}}),I(),it()}function st(){document.querySelectorAll("[data-reviewos]").forEach(e=>{e.dataset.reviewosMounted||(e.dataset.reviewosMounted="true",at(e))})}function ot(){document.readyState==="complete"?st():window.addEventListener("load",st,{once:!0})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ot):ot();})();
