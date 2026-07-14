"use strict";(()=>{function O(t){let e=t,a=new Set;return{getState:()=>e,setState(s){e={...e,...s},a.forEach(o=>o())},subscribe(s){return a.add(s),()=>a.delete(s)}}}async function y(t){let e=await fetch(t);if(!e.ok)throw new Error(`request failed: ${e.status}`);return e.json()}async function D(t,e){return(await y(`${t}/api/products/${encodeURIComponent(e)}`)).product}async function H(t,e){return(await y(`${t}/api/reviews/summary?product=${encodeURIComponent(e)}`)).summary}async function N(t,e){return(await y(`${t}/api/attributes?category=${encodeURIComponent(e)}`)).attributes.filter(s=>s.display)}async function I(t,e){let a=new URLSearchParams;a.set("product",e.productSlug),a.set("sort",e.sort),a.set("page",String(e.page)),a.set("pageSize",String(e.pageSize)),e.rating&&a.set("rating",String(e.rating));for(let[o,c]of Object.entries(e.attrFilters))a.set(o,c);return await y(`${t}/api/reviews?${a.toString()}`)}async function q(t,e,a){let s=new URLSearchParams;s.set("product",e);for(let[c,g]of Object.entries(a))s.set(c,g);return(await y(`${t}/api/ai/summary?${s.toString()}`)).summary}async function U(t,e){return(await y(`${t}/api/marketplace?product=${encodeURIComponent(e)}`)).stats}async function z(t,e){let a=await fetch(`${t}/api/reviews/${encodeURIComponent(e)}/helpful`,{method:"POST"});if(!a.ok)throw new Error(`request failed: ${a.status}`);return a.json()}async function B(t,e){var s;let a=await fetch(`${t}/api/reviews`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!a.ok){let o=await a.json().catch(()=>({}));throw new Error((s=o.error)!=null?s:`request failed: ${a.status}`)}return a.json()}function l(t){return String(t!=null?t:"").replace(/[&<>"']/g,e=>{switch(e){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}function b(t,e=5){let a="";for(let s=1;s<=e;s++)a+=`<span class="rvos-star ${s<=t?"rvos-star--filled":""}">&#9733;</span>`;return a}function G(t){let e=new Date(t);return Number.isNaN(e.getTime())?"":e.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}function V(t){if(t.aiSummaryLoading)return'<div class="rvos-ai-summary rvos-ai-summary--loading">Generating AI summary\u2026</div>';let e=t.aiSummary;if(!e)return"";let a=Object.keys(t.attrFilters).length,s=a>0?`AI summary of ${e.reviewCount} review${e.reviewCount===1?"":"s"} matching ${a} filter${a===1?"":"s"}`:`AI summary of ${e.reviewCount} review${e.reviewCount===1?"":"s"}`,o=e.pros.map(g=>`<li class="rvos-ai-summary__pro">${l(g)}</li>`).join(""),c=e.cons.map(g=>`<li class="rvos-ai-summary__con">${l(g)}</li>`).join("");return`
    <div class="rvos-ai-summary">
      <div class="rvos-ai-summary__header">
        <span class="rvos-ai-summary__badge">&#10022; AI summary</span>
      </div>
      <p class="rvos-ai-summary__text">${l(e.summaryText)}</p>
      ${e.pros.length||e.cons.length?`<div class="rvos-ai-summary__lists">
              ${o?`<ul class="rvos-ai-summary__pros">${o}</ul>`:""}
              ${c?`<ul class="rvos-ai-summary__cons">${c}</ul>`:""}
            </div>`:""}
      <div class="rvos-ai-summary__caption">${l(s)}</div>
    </div>
  `}function Q(t){let e=t.summary;return e?`
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
  `:""}function J(t){let e=t.marketplaceStats;return!e||e.length===0?"":`
    <div class="rvos-trust-badges">
      <div class="rvos-trust-badges__row">${e.map(s=>{let o=l(s.source.name.trim().charAt(0).toUpperCase()||"?"),c=s.source.logoUrl?`<img class="rvos-trust-badge__logo" src="${l(s.source.logoUrl)}" alt="${l(s.source.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display=''" /><div class="rvos-trust-badge__fallback" style="display:none">${o}</div>`:`<div class="rvos-trust-badge__fallback">${o}</div>`;return`
        <a class="rvos-trust-badge" href="${l(s.url)}" target="_blank" rel="noopener noreferrer">
          ${c}
          <div class="rvos-trust-badge__body">
            <div class="rvos-trust-badge__name">${l(s.source.name)}</div>
            <div class="rvos-stars">${b(Math.round(s.rating))}</div>
            <div class="rvos-trust-badge__count">${l(s.rating.toFixed(1))} | ${s.reviewCount.toLocaleString()} reviews</div>
          </div>
        </a>
      `}).join("")}</div>
      <div class="rvos-trust-badges__combined">Rated across ${e.length} marketplace${e.length===1?"":"s"}</div>
    </div>
  `}function K(t){let e=t.summary;if(!e||e.count===0)return"";let a=[5,4,3,2,1].map(o=>{var m;let c=(m=e.byStar[String(o)])!=null?m:0,g=e.count>0?Math.round(c/e.count*100):0;return`
        <button type="button" class="rvos-dist-row ${t.ratingFilter===o?"rvos-dist-row--active":""}" data-action="filter-rating" data-rating="${o}">
          <span class="rvos-dist-row__label">${o}&#9733;</span>
          <span class="rvos-dist-row__bar"><span class="rvos-dist-row__fill" style="width:${g}%"></span></span>
          <span class="rvos-dist-row__count">${c}</span>
        </button>
      `}).join(""),s=t.ratingFilter?`<button type="button" class="rvos-link" data-action="filter-rating" data-rating="">Clear rating filter (${l(t.ratingFilter)}&#9733;)</button>`:"";return`<div class="rvos-distribution">${a}${s}</div>`}function Y(t){if(t.attributeDefs.length===0)return"";let e=t.attributeDefs.map(o=>{let c=t.attrFilters[o.key],g=o.options.map(r=>`<button type="button" class="rvos-chip ${c===r?"rvos-chip--active":""}" data-action="toggle-filter" data-key="${l(o.key)}" data-value="${l(r)}">${l(r)}</button>`).join("");return`
        <div class="rvos-filter-group">
          <span class="rvos-filter-group__label">${l(o.label)}</span>
          <div class="rvos-filter-group__options">${g}</div>
        </div>
      `}).join(""),a=Object.entries(t.attrFilters);return`<div class="rvos-filters">${a.length>0?`<div class="rvos-active-filters">
          ${a.map(([o,c])=>{let g=t.attributeDefs.find(m=>m.key===o),r=g?g.label:o;return`<span class="rvos-active-chip">${l(r)}: ${l(c)} <button type="button" data-action="toggle-filter" data-key="${l(o)}" data-value="${l(c)}" aria-label="Remove filter">&times;</button></span>`}).join("")}
          <button type="button" class="rvos-link" data-action="clear-filters">Clear all</button>
        </div>`:""}${e}</div>`}var ct=8;function x(t){let e=[];for(let a of t.galleryReviews)for(let s of a.media)s.type==="image"&&e.push({url:s.url,review:a});return e}function Z(t){let e=x(t);if(e.length===0)return"";let a=e.slice(0,ct),s=e.length-a.length,o=a.map((g,r)=>`
        <button type="button" class="rvos-gallery__thumb" data-action="open-lightbox" data-photo-index="${r}">
          <img src="${l(g.url)}" alt="Photo from ${l(g.review.customerName)}" loading="lazy" />
        </button>
      `).join(""),c=s>0?`<button type="button" class="rvos-gallery__thumb rvos-gallery__more" data-action="open-lightbox" data-photo-index="${a.length}">
          <span>+${s} more</span>
        </button>`:"";return`
    <div class="rvos-gallery">
      <div class="rvos-gallery__title">Photos from customers</div>
      <div class="rvos-gallery__strip">${o}${c}</div>
    </div>
  `}function X(t){if(!t.blocks.has("ugc-gallery")||t.lightboxIndex===null)return"";let e=x(t),a=t.lightboxIndex,s=e[a];if(!s)return"";let{review:o}=s,c=o.title||o.body;return`
    <div class="rvos-lightbox" data-action="close-lightbox" tabindex="-1" role="dialog" aria-modal="true">
      <button type="button" class="rvos-lightbox__close" data-action="close-lightbox" aria-label="Close">&times;</button>
      ${a>0?'<button type="button" class="rvos-lightbox__nav rvos-lightbox__nav--prev" data-action="lightbox-prev" aria-label="Previous photo">&#8249;</button>':""}
      ${a<e.length-1?'<button type="button" class="rvos-lightbox__nav rvos-lightbox__nav--next" data-action="lightbox-next" aria-label="Next photo">&#8250;</button>':""}
      <div class="rvos-lightbox__content">
        <img class="rvos-lightbox__image" src="${l(s.url)}" alt="Photo from ${l(o.customerName)}" />
        <div class="rvos-lightbox__meta">
          <div class="rvos-lightbox__author">${l(o.customerName)}</div>
          <div class="rvos-stars">${b(o.rating)}</div>
          <div class="rvos-lightbox__snippet">${l(c)}</div>
        </div>
      </div>
    </div>
  `}var ut=[{value:"recent",label:"Most recent"},{value:"helpful",label:"Most helpful"},{value:"rating_desc",label:"Highest rating"},{value:"rating_asc",label:"Lowest rating"}];function dt(t,e){let a=[t.verifiedBuyer?'<span class="rvos-badge">Verified buyer</span>':"",t.verifiedMarketplace?'<span class="rvos-badge rvos-badge--marketplace">Verified marketplace</span>':""].join(""),s=t.media.length?`<div class="rvos-card__media">${t.media.map(c=>`<img class="rvos-card__thumb" src="${l(c.url)}" alt="review media" loading="lazy" />`).join("")}</div>`:"",o=t.merchantReply?`<div class="rvos-card__reply">
        <div class="rvos-card__reply-label">Merchant reply</div>
        <div>${l(t.merchantReply)}</div>
      </div>`:"";return`
    <article class="rvos-card" data-review-id="${l(t.id)}">
      <div class="rvos-card__head">
        <div class="rvos-stars">${b(t.rating)}</div>
        <div class="rvos-card__author">${l(t.customerName)}</div>
        ${a}
        <div class="rvos-card__date">${G(t.createdAt)}</div>
      </div>
      ${t.title?`<h4 class="rvos-card__title">${l(t.title)}</h4>`:""}
      <p class="rvos-card__body">${l(t.body)}</p>
      ${s}
      ${o}
      <button type="button" class="rvos-helpful" data-action="vote-helpful" data-review-id="${l(t.id)}" ${e?"disabled":""}>
        Helpful (<span class="rvos-helpful__count">${t.helpfulCount}</span>)
      </button>
    </article>
  `}function tt(t){let e=ut.map(g=>`<option value="${g.value}" ${t.sort===g.value?"selected":""}>${g.label}</option>`).join(""),a=`
    <div class="rvos-feed__toolbar">
      <span class="rvos-feed__total">${t.total.toLocaleString()} review${t.total===1?"":"s"}</span>
      <select class="rvos-select" data-action="set-sort">${e}</select>
    </div>
  `;if(t.reviewsLoading&&t.reviews.length===0)return`${a}<div class="rvos-feed__loading">Loading reviews\u2026</div>`;if(t.reviews.length===0)return`${a}<div class="rvos-empty">No reviews match your filters yet.</div>`;let s=t.reviews.map(g=>dt(g,!!t.votedIds[g.id])).join(""),c=t.page*t.pageSize<t.total?`<button type="button" class="rvos-btn rvos-btn--outline rvos-feed__load-more" data-action="load-more" ${t.reviewsLoading?"disabled":""}>
        ${t.reviewsLoading?"Loading\u2026":"Load more"}
      </button>`:"";return`${a}<div class="rvos-feed__list">${s}</div>${c}`}function et(t){if(!t.writeOpen)return"";if(t.writeSuccess)return`
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
    `;let e=t.attributeDefs.map(s=>{let o=s.options.map(c=>`<option value="${l(c)}">${l(c)}</option>`).join("");return`
        <label class="rvos-field">
          <span>${l(s.label)}</span>
          <select name="attr__${l(s.key)}" class="rvos-select">
            <option value="">Select\u2026</option>
            ${o}
          </select>
        </label>
      `}).join(""),a=t.writeError?`<div class="rvos-form-error">${l(t.writeError)}</div>`:"";return`
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
  `}var rt=new Set(["rating","sort","page"]);function F(t){let e=new URLSearchParams(window.location.search),a={},s=new Set(t.map(r=>r.key));for(let[r,m]of e.entries())s.has(r)&&!rt.has(r)&&(a[r]=m);let o=e.get("rating"),c=o?Number(o):null,g=e.get("sort")||"recent";return{attrFilters:a,rating:c,sort:g}}function at(t,e,a,s=!1){let o=new URLSearchParams(window.location.search);for(let r of Array.from(o.keys()))(rt.has(r)||t[r]!==void 0)&&o.delete(r);for(let[r,m]of Object.entries(t))o.set(r,m);e&&o.set("rating",String(e)),a!=="recent"&&o.set("sort",a);let c=o.toString(),g=`${window.location.pathname}${c?`?${c}`:""}${window.location.hash}`;s?window.history.pushState(null,"",g):window.history.replaceState(null,"",g)}var gt=["ai-summary","summary","trust-badges","distribution","filters","ugc-gallery","feed","write"],st=5;function it(t){var W,C;let e=t.dataset.product;if(!e){console.error("[reviewos] missing data-product attribute");return}let a=e,s=((W=t.dataset.api)!=null?W:"").replace(/\/$/,""),o=((C=t.dataset.blocks)!=null?C:gt.join(",")).split(",").map(i=>i.trim()).filter(Boolean),c=new Set(o),r=O({apiBase:s,productSlug:a,blocks:c,loading:!0,error:null,product:null,summary:null,attributeDefs:[],aiSummary:null,aiSummaryLoading:!1,marketplaceStats:[],lightboxIndex:null,lightboxReturnIndex:null,galleryReviews:[],reviews:[],total:0,page:1,pageSize:st,reviewsLoading:!1,votedIds:{},ratingFilter:null,attrFilters:{},sort:"recent",writeOpen:!1,writeRating:0,writeSubmitting:!1,writeSuccess:!1,writeError:null});t.innerHTML='<div class="rvos-widget"></div>';let m=t.querySelector(".rvos-widget");function M(){var d;let i=r.getState();if(i.loading){m.innerHTML='<div class="rvos-loading">Loading reviews\u2026</div>';return}if(i.error){m.innerHTML=`<div class="rvos-error">Couldn't load reviews. Please try again later.</div>`;return}let n=[];if(i.blocks.has("ai-summary")&&n.push(V(i)),i.blocks.has("summary")&&n.push(Q(i)),i.blocks.has("trust-badges")&&n.push(J(i)),i.blocks.has("distribution")&&n.push(K(i)),i.blocks.has("filters")&&n.push(Y(i)),i.blocks.has("ugc-gallery")&&n.push(Z(i)),i.blocks.has("feed")&&n.push(tt(i)),m.innerHTML=n.join("")+(i.blocks.has("write")?et(i):"")+X(i),h!==null){let v=h;h=null;let u=m.querySelector(`[data-photo-index="${v}"]`);u==null||u.focus()}else i.lightboxIndex!==null&&A===null&&((d=m.querySelector(".rvos-lightbox"))==null||d.focus());A=i.lightboxIndex}let h=null,A=null;r.subscribe(M);let $=0;async function _(i){let n=r.getState(),d=++$;r.setState({reviewsLoading:!0});try{let v=await I(s,{productSlug:a,rating:n.ratingFilter,attrFilters:n.attrFilters,sort:n.sort,page:i?1:n.page,pageSize:st});if(d!==$)return;let u=i?[]:r.getState().reviews;r.setState({reviews:[...u,...v.reviews],total:v.total,page:v.page,reviewsLoading:!1})}catch(v){if(d!==$)return;r.setState({reviewsLoading:!1,error:"reviews_failed"})}}let R=0;async function T(){if(!r.getState().blocks.has("ugc-gallery"))return;let i=r.getState(),n=++R;try{let d=await I(s,{productSlug:a,rating:i.ratingFilter,attrFilters:i.attrFilters,sort:i.sort,page:1,pageSize:200});if(n!==R)return;r.setState({galleryReviews:d.reviews})}catch(d){if(n!==R)return;r.setState({galleryReviews:[]})}}let L=0;async function P(){if(!r.getState().blocks.has("ai-summary"))return;let i=++L;r.setState({aiSummaryLoading:!0});try{let n=await q(s,a,r.getState().attrFilters);if(i!==L)return;r.setState({aiSummary:n,aiSummaryLoading:!1})}catch(n){if(i!==L)return;r.setState({aiSummary:null,aiSummaryLoading:!1})}}async function S(i=!0){r.getState().lightboxIndex!==null&&r.setState({lightboxIndex:null,lightboxReturnIndex:null}),i&&at(r.getState().attrFilters,r.getState().ratingFilter,r.getState().sort,!0),await Promise.all([_(!0),P(),T()])}window.addEventListener("popstate",()=>{let i=F(r.getState().attributeDefs);r.setState({attrFilters:i.attrFilters,ratingFilter:i.rating,sort:i.sort}),S(!1)});async function lt(){try{let i=await D(s,a),[n,d]=await Promise.all([H(s,a),N(s,i.category)]),v=F(d);r.setState({product:i,summary:n,attributeDefs:d,ratingFilter:v.rating,attrFilters:v.attrFilters,sort:v.sort,loading:!1}),r.getState().blocks.has("trust-badges")&&U(s,a).then(u=>r.setState({marketplaceStats:u})).catch(()=>r.setState({marketplaceStats:[]})),await Promise.all([_(!0),P(),T()])}catch(i){console.error("[reviewos] init failed",i),r.setState({loading:!1,error:"init_failed"})}}m.addEventListener("click",async i=>{let n=i.target.closest("[data-action]");if(!n)return;let d=n.dataset.action;if(!((n.classList.contains("rvos-modal-overlay")||n.classList.contains("rvos-lightbox"))&&i.target!==n)){if(d==="filter-rating"){let u=n.dataset.rating,f=u?Number(u):null,p=r.getState().ratingFilter;r.setState({ratingFilter:p===f?null:f}),await S();return}if(d==="toggle-filter"){let u=n.dataset.key,f=n.dataset.value,p={...r.getState().attrFilters};p[u]===f?delete p[u]:p[u]=f,r.setState({attrFilters:p}),await S();return}if(d==="clear-filters"){r.setState({attrFilters:{},ratingFilter:null}),await S();return}if(d==="load-more"){if(r.getState().reviewsLoading)return;r.setState({page:r.getState().page+1}),await _(!1);return}if(d==="vote-helpful"){let u=n.dataset.reviewId,f=r.getState();if(f.votedIds[u])return;r.setState({votedIds:{...f.votedIds,[u]:!0},reviews:f.reviews.map(p=>p.id===u?{...p,helpfulCount:p.helpfulCount+1}:p)});try{await z(s,u)}catch(p){}return}if(d==="open-write"){r.setState({writeOpen:!0,writeSuccess:!1,writeError:null,writeRating:0});return}if(d==="close-write"){r.setState({writeOpen:!1});return}if(d==="set-write-rating"){r.setState({writeRating:Number(n.dataset.value)});return}if(d==="open-lightbox"){let u=Number(n.dataset.photoIndex);r.setState({lightboxIndex:u,lightboxReturnIndex:u});return}if(d==="close-lightbox"){h=r.getState().lightboxReturnIndex,r.setState({lightboxIndex:null,lightboxReturnIndex:null});return}if(d==="lightbox-prev"){let u=r.getState().lightboxIndex;u!==null&&u>0&&r.setState({lightboxIndex:u-1});return}if(d==="lightbox-next"){let u=r.getState(),f=x(u).length;u.lightboxIndex!==null&&u.lightboxIndex<f-1&&r.setState({lightboxIndex:u.lightboxIndex+1});return}}}),document.addEventListener("keydown",i=>{let n=r.getState();if(n.lightboxIndex!==null){if(i.key==="Escape")h=n.lightboxReturnIndex,r.setState({lightboxIndex:null,lightboxReturnIndex:null});else if(i.key==="ArrowLeft")n.lightboxIndex>0&&r.setState({lightboxIndex:n.lightboxIndex-1});else if(i.key==="ArrowRight"){let d=x(n).length;n.lightboxIndex<d-1&&r.setState({lightboxIndex:n.lightboxIndex+1})}}}),m.addEventListener("change",async i=>{let n=i.target;if(n.dataset.action==="set-sort"){let d=n.value;r.setState({sort:d}),await S()}}),m.addEventListener("submit",async i=>{var f,p,j;let n=i.target;if(n.dataset.action!=="submit-write")return;i.preventDefault();let d=r.getState();if(d.writeRating<1){r.setState({writeError:"Please select a star rating."});return}let v=new FormData(n),u={};for(let w of d.attributeDefs){let k=v.get(`attr__${w.key}`);typeof k=="string"&&k&&(u[w.key]=k)}r.setState({writeSubmitting:!0,writeError:null});try{await B(s,{productSlug:a,customerName:String((f=v.get("customerName"))!=null?f:""),rating:d.writeRating,title:String((p=v.get("title"))!=null?p:"")||void 0,body:String((j=v.get("body"))!=null?j:""),attributes:u}),r.setState({writeSubmitting:!1,writeSuccess:!0})}catch(w){r.setState({writeSubmitting:!1,writeError:w instanceof Error?w.message:"Something went wrong."})}}),M(),lt()}function E(t){t.querySelector(".rvos-widget")||it(t)}function mt(t){if(t){E(t);return}document.querySelectorAll("[data-reviewos]").forEach(E)}function ot(){document.querySelectorAll("[data-reviewos]:not([data-reviewos-manual])").forEach(E)}window.ReviewOS={mount:mt};if(window.ReviewOSQueue){let t=window.ReviewOSQueue;window.ReviewOSQueue=[],t.forEach(e=>e())}function nt(){document.readyState==="complete"?ot():window.addEventListener("load",()=>ot(),{once:!0})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",nt):nt();})();
