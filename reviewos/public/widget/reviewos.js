"use strict";(()=>{function q(t){let e=t,a=new Set;return{getState:()=>e,setState(i){e={...e,...i},a.forEach(s=>s())},subscribe(i){return a.add(i),()=>a.delete(i)}}}async function h(t){let e=await fetch(t);if(!e.ok)throw new Error(`request failed: ${e.status}`);return e.json()}async function z(t,e){return(await h(`${t}/api/products/${encodeURIComponent(e)}`)).product}async function B(t,e){return(await h(`${t}/api/reviews/summary?product=${encodeURIComponent(e)}`)).summary}async function G(t,e){return(await h(`${t}/api/attributes?category=${encodeURIComponent(e)}`)).attributes.filter(i=>i.display)}async function P(t,e){let a=new URLSearchParams;a.set("product",e.productSlug),a.set("sort",e.sort),a.set("page",String(e.page)),a.set("pageSize",String(e.pageSize)),e.rating&&a.set("rating",String(e.rating));for(let[s,g]of Object.entries(e.attrFilters))a.set(s,g);return await h(`${t}/api/reviews?${a.toString()}`)}async function V(t,e,a){let i=new URLSearchParams;i.set("product",e);for(let[g,c]of Object.entries(a))i.set(g,c);return(await h(`${t}/api/ai/summary?${i.toString()}`)).summary}async function K(t,e){return(await h(`${t}/api/marketplace?product=${encodeURIComponent(e)}`)).stats}async function J(t,e){let a=await fetch(`${t}/api/reviews/${encodeURIComponent(e)}/helpful`,{method:"POST"});if(!a.ok)throw new Error(`request failed: ${a.status}`);return a.json()}async function Q(t,e){var i;let a=await fetch(`${t}/api/media/presign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!a.ok){let s=await a.json().catch(()=>({}));throw new Error((i=s.error)!=null?i:`request failed: ${a.status}`)}return a.json()}async function X(t,e){var i;let a=await fetch(`${t}/api/reviews`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!a.ok){let s=await a.json().catch(()=>({}));throw new Error((i=s.error)!=null?i:`request failed: ${a.status}`)}return a.json()}var M=new WeakMap;function Y(t){let e=M.get(t);return e||(e=URL.createObjectURL(t),M.set(t,e)),e}function A(t){let e=M.get(t);e&&(URL.revokeObjectURL(e),M.delete(t))}function T(t){for(let e of t)A(e)}async function Z(t,e){let a=[];for(let i of t){let s=await e({filename:i.name,contentType:i.type,sizeBytes:i.size});if(!(await fetch(s.uploadUrl,{method:s.method,headers:s.headers,body:i})).ok)throw new Error(`upload_failed:${i.name}`);a.push({type:s.type,url:s.publicUrl,storageKey:s.storageKey,mimeType:i.type,sizeBytes:i.size})}return a}function l(t){return String(t!=null?t:"").replace(/[&<>"']/g,e=>{switch(e){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}function w(t,e=5){let a="";for(let i=1;i<=e;i++)a+=`<span class="rvos-star ${i<=t?"rvos-star--filled":""}">&#9733;</span>`;return a}function tt(t){let e=new Date(t);return Number.isNaN(e.getTime())?"":e.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}function et(t){if(t.aiSummaryLoading)return'<div class="rvos-ai-summary rvos-ai-summary--loading">Generating AI summary\u2026</div>';let e=t.aiSummary;if(!e)return"";let a=Object.keys(t.attrFilters).length,i=a>0?`AI summary of ${e.reviewCount} review${e.reviewCount===1?"":"s"} matching ${a} filter${a===1?"":"s"}`:`AI summary of ${e.reviewCount} review${e.reviewCount===1?"":"s"}`,s=e.pros.map(c=>`<li class="rvos-ai-summary__pro">${l(c)}</li>`).join(""),g=e.cons.map(c=>`<li class="rvos-ai-summary__con">${l(c)}</li>`).join("");return`
    <div class="rvos-ai-summary">
      <div class="rvos-ai-summary__header">
        <span class="rvos-ai-summary__badge">&#10022; AI summary</span>
      </div>
      <p class="rvos-ai-summary__text">${l(e.summaryText)}</p>
      ${e.pros.length||e.cons.length?`<div class="rvos-ai-summary__lists">
              ${s?`<ul class="rvos-ai-summary__pros">${s}</ul>`:""}
              ${g?`<ul class="rvos-ai-summary__cons">${g}</ul>`:""}
            </div>`:""}
      <div class="rvos-ai-summary__caption">${l(i)}</div>
    </div>
  `}function rt(t){let e=t.summary;return e?`
    <div class="rvos-summary">
      <div class="rvos-summary__score">${e.average.toFixed(1)}</div>
      <div class="rvos-summary__meta">
        <div class="rvos-stars">${w(Math.round(e.average))}</div>
        <div class="rvos-summary__count">${e.count.toLocaleString()} review${e.count===1?"":"s"}</div>
      </div>
      <button type="button" class="rvos-btn rvos-btn--primary rvos-summary__write" data-action="open-write">
        Write a review
      </button>
    </div>
  `:""}function at(t){let e=t.marketplaceStats;return!e||e.length===0?"":`
    <div class="rvos-trust-badges">
      <div class="rvos-trust-badges__row">${e.map(i=>{let s=l(i.source.name.trim().charAt(0).toUpperCase()||"?"),g=i.source.logoUrl?`<img class="rvos-trust-badge__logo" src="${l(i.source.logoUrl)}" alt="${l(i.source.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display=''" /><div class="rvos-trust-badge__fallback" style="display:none">${s}</div>`:`<div class="rvos-trust-badge__fallback">${s}</div>`;return`
        <a class="rvos-trust-badge" href="${l(i.url)}" target="_blank" rel="noopener noreferrer">
          ${g}
          <div class="rvos-trust-badge__body">
            <div class="rvos-trust-badge__name">${l(i.source.name)}</div>
            <div class="rvos-stars">${w(Math.round(i.rating))}</div>
            <div class="rvos-trust-badge__count">${l(i.rating.toFixed(1))} | ${i.reviewCount.toLocaleString()} reviews</div>
          </div>
        </a>
      `}).join("")}</div>
      <div class="rvos-trust-badges__combined">Rated across ${e.length} marketplace${e.length===1?"":"s"}</div>
    </div>
  `}function it(t){let e=t.summary;if(!e||e.count===0)return"";let a=[5,4,3,2,1].map(s=>{var p;let g=(p=e.byStar[String(s)])!=null?p:0,c=e.count>0?Math.round(g/e.count*100):0;return`
        <button type="button" class="rvos-dist-row ${t.ratingFilter===s?"rvos-dist-row--active":""}" data-action="filter-rating" data-rating="${s}">
          <span class="rvos-dist-row__label">${s}&#9733;</span>
          <span class="rvos-dist-row__bar"><span class="rvos-dist-row__fill" style="width:${c}%"></span></span>
          <span class="rvos-dist-row__count">${g}</span>
        </button>
      `}).join(""),i=t.ratingFilter?`<button type="button" class="rvos-link" data-action="filter-rating" data-rating="">Clear rating filter (${l(t.ratingFilter)}&#9733;)</button>`:"";return`<div class="rvos-distribution">${a}${i}</div>`}function st(t){if(t.attributeDefs.length===0)return"";let e=t.attributeDefs.map(s=>{let g=t.attrFilters[s.key],c=s.options.map(r=>`<button type="button" class="rvos-chip ${g===r?"rvos-chip--active":""}" data-action="toggle-filter" data-key="${l(s.key)}" data-value="${l(r)}">${l(r)}</button>`).join("");return`
        <div class="rvos-filter-group">
          <span class="rvos-filter-group__label">${l(s.label)}</span>
          <div class="rvos-filter-group__options">${c}</div>
        </div>
      `}).join(""),a=Object.entries(t.attrFilters);return`<div class="rvos-filters">${a.length>0?`<div class="rvos-active-filters">
          ${a.map(([s,g])=>{let c=t.attributeDefs.find(p=>p.key===s),r=c?c.label:s;return`<span class="rvos-active-chip">${l(r)}: ${l(g)} <button type="button" data-action="toggle-filter" data-key="${l(s)}" data-value="${l(g)}" aria-label="Remove filter">&times;</button></span>`}).join("")}
          <button type="button" class="rvos-link" data-action="clear-filters">Clear all</button>
        </div>`:""}${e}</div>`}var bt=8;function $(t){let e=[];for(let a of t.galleryReviews)for(let i of a.media)i.type==="image"&&e.push({url:i.url,review:a});return e}function ot(t){let e=$(t);if(e.length===0)return"";let a=e.slice(0,bt),i=e.length-a.length,s=a.map((c,r)=>`
        <button type="button" class="rvos-gallery__thumb" data-action="open-lightbox" data-photo-index="${r}">
          <img src="${l(c.url)}" alt="Photo from ${l(c.review.customerName)}" loading="lazy" />
        </button>
      `).join(""),g=i>0?`<button type="button" class="rvos-gallery__thumb rvos-gallery__more" data-action="open-lightbox" data-photo-index="${a.length}">
          <span>+${i} more</span>
        </button>`:"";return`
    <div class="rvos-gallery">
      <div class="rvos-gallery__title">Photos from customers</div>
      <div class="rvos-gallery__strip">${s}${g}</div>
    </div>
  `}function nt(t){if(!t.blocks.has("ugc-gallery")||t.lightboxIndex===null)return"";let e=$(t),a=t.lightboxIndex,i=e[a];if(!i)return"";let{review:s}=i,g=s.title||s.body;return`
    <div class="rvos-lightbox" data-action="close-lightbox" tabindex="-1" role="dialog" aria-modal="true">
      <button type="button" class="rvos-lightbox__close" data-action="close-lightbox" aria-label="Close">&times;</button>
      ${a>0?'<button type="button" class="rvos-lightbox__nav rvos-lightbox__nav--prev" data-action="lightbox-prev" aria-label="Previous photo">&#8249;</button>':""}
      ${a<e.length-1?'<button type="button" class="rvos-lightbox__nav rvos-lightbox__nav--next" data-action="lightbox-next" aria-label="Next photo">&#8250;</button>':""}
      <div class="rvos-lightbox__content">
        <img class="rvos-lightbox__image" src="${l(i.url)}" alt="Photo from ${l(s.customerName)}" />
        <div class="rvos-lightbox__meta">
          <div class="rvos-lightbox__author">${l(s.customerName)}</div>
          <div class="rvos-stars">${w(s.rating)}</div>
          <div class="rvos-lightbox__snippet">${l(g)}</div>
        </div>
      </div>
    </div>
  `}var yt=[{value:"recent",label:"Most recent"},{value:"helpful",label:"Most helpful"},{value:"rating_desc",label:"Highest rating"},{value:"rating_asc",label:"Lowest rating"}];function wt(t,e){let a=[t.verifiedBuyer?'<span class="rvos-badge">Verified buyer</span>':"",t.verifiedMarketplace?'<span class="rvos-badge rvos-badge--marketplace">Verified marketplace</span>':""].join(""),i=t.media.length?`<div class="rvos-card__media">${t.media.map(g=>g.type==="video"?`<video class="rvos-card__thumb" src="${l(g.url)}" muted preload="metadata"></video>`:`<img class="rvos-card__thumb" src="${l(g.url)}" alt="review media" loading="lazy" />`).join("")}</div>`:"",s=t.merchantReply?`<div class="rvos-card__reply">
        <div class="rvos-card__reply-label">Merchant reply</div>
        <div>${l(t.merchantReply)}</div>
      </div>`:"";return`
    <article class="rvos-card" data-review-id="${l(t.id)}">
      <div class="rvos-card__head">
        <div class="rvos-stars">${w(t.rating)}</div>
        <div class="rvos-card__author">${l(t.customerName)}</div>
        ${a}
        <div class="rvos-card__date">${tt(t.createdAt)}</div>
      </div>
      ${t.title?`<h4 class="rvos-card__title">${l(t.title)}</h4>`:""}
      <p class="rvos-card__body">${l(t.body)}</p>
      ${i}
      ${s}
      <button type="button" class="rvos-helpful" data-action="vote-helpful" data-review-id="${l(t.id)}" ${e?"disabled":""}>
        Helpful (<span class="rvos-helpful__count">${t.helpfulCount}</span>)
      </button>
    </article>
  `}function lt(t){let e=yt.map(c=>`<option value="${c.value}" ${t.sort===c.value?"selected":""}>${c.label}</option>`).join(""),a=`
    <div class="rvos-feed__toolbar">
      <span class="rvos-feed__total">${t.total.toLocaleString()} review${t.total===1?"":"s"}</span>
      <select class="rvos-select" data-action="set-sort">${e}</select>
    </div>
  `;if(t.reviewsLoading&&t.reviews.length===0)return`${a}<div class="rvos-feed__loading">Loading reviews\u2026</div>`;if(t.reviews.length===0)return`${a}<div class="rvos-empty">No reviews match your filters yet.</div>`;let i=t.reviews.map(c=>wt(c,!!t.votedIds[c.id])).join(""),g=t.page*t.pageSize<t.total?`<button type="button" class="rvos-btn rvos-btn--outline rvos-feed__load-more" data-action="load-more" ${t.reviewsLoading?"disabled":""}>
        ${t.reviewsLoading?"Loading\u2026":"Load more"}
      </button>`:"";return`${a}<div class="rvos-feed__list">${i}</div>${g}`}function ct(t){if(!t.writeOpen)return"";if(t.writeSuccess)return`
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
    `;let e=t.attributeDefs.map(c=>{let r=c.options.map(p=>`<option value="${l(p)}">${l(p)}</option>`).join("");return`
        <label class="rvos-field">
          <span>${l(c.label)}</span>
          <select name="attr__${l(c.key)}" class="rvos-select">
            <option value="">Select\u2026</option>
            ${r}
          </select>
        </label>
      `}).join(""),a=t.writeError?`<div class="rvos-form-error">${l(t.writeError)}</div>`:"",i=t.writeMediaFiles.map((c,r)=>`
        <div class="rvos-media-preview">
          ${c.type.startsWith("image/")?`<img src="${Y(c)}" alt="${l(c.name)}" class="rvos-media-preview__thumb" />`:'<div class="rvos-media-preview__video-icon" aria-hidden="true">&#9654;</div>'}
          <span class="rvos-media-preview__name">${l(c.name)}</span>
          <button type="button" class="rvos-media-preview__remove" data-action="remove-write-media" data-index="${r}" aria-label="Remove ${l(c.name)}" ${t.writeMediaUploading?"disabled":""}>&times;</button>
        </div>
      `).join(""),s=t.writeMediaUploading,g=t.writeMediaFiles.length<5;return`
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
              ${[1,2,3,4,5].map(c=>`<button type="button" class="rvos-star-btn ${c<=t.writeRating?"rvos-star-btn--filled":""}" data-action="set-write-rating" data-value="${c}" aria-label="${c} star">&#9733;</button>`).join("")}
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
          <div class="rvos-field">
            <span>Photos / videos (optional, up to ${5})</span>
            ${i?`<div class="rvos-media-previews">${i}</div>`:""}
            ${g?`<input type="file" data-action="add-write-media" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime" multiple ${s?"disabled":""} />`:""}
          </div>
          ${a}
          <button type="submit" class="rvos-btn rvos-btn--primary" ${t.writeSubmitting||s?"disabled":""}>
            ${s?"Uploading\u2026":t.writeSubmitting?"Submitting\u2026":"Submit review"}
          </button>
        </form>
      </div>
    </div>
  `}var dt=new Set(["rating","sort","page"]);function W(t){let e=new URLSearchParams(window.location.search),a={},i=new Set(t.map(r=>r.key));for(let[r,p]of e.entries())i.has(r)&&!dt.has(r)&&(a[r]=p);let s=e.get("rating"),g=s?Number(s):null,c=e.get("sort")||"recent";return{attrFilters:a,rating:g,sort:c}}function ut(t,e,a,i=!1){let s=new URLSearchParams(window.location.search);for(let r of Array.from(s.keys()))(dt.has(r)||t[r]!==void 0)&&s.delete(r);for(let[r,p]of Object.entries(t))s.set(r,p);e&&s.set("rating",String(e)),a!=="recent"&&s.set("sort",a);let g=s.toString(),c=`${window.location.pathname}${g?`?${g}`:""}${window.location.hash}`;i?window.history.pushState(null,"",c):window.history.replaceState(null,"",c)}var ht=["ai-summary","summary","trust-badges","distribution","filters","ugc-gallery","feed","write"],gt=5;function mt(t){var H,N;let e=t.dataset.product;if(!e){console.error("[reviewos] missing data-product attribute");return}let a=e,i=((H=t.dataset.api)!=null?H:"").replace(/\/$/,""),s=((N=t.dataset.blocks)!=null?N:ht.join(",")).split(",").map(o=>o.trim()).filter(Boolean),g=new Set(s),r=q({apiBase:i,productSlug:a,blocks:g,loading:!0,error:null,product:null,summary:null,attributeDefs:[],aiSummary:null,aiSummaryLoading:!1,marketplaceStats:[],lightboxIndex:null,lightboxReturnIndex:null,galleryReviews:[],reviews:[],total:0,page:1,pageSize:gt,reviewsLoading:!1,votedIds:{},ratingFilter:null,attrFilters:{},sort:"recent",writeOpen:!1,writeRating:0,writeSubmitting:!1,writeSuccess:!1,writeError:null,writeMediaFiles:[],writeMediaUploaded:null,writeMediaUploading:!1});t.innerHTML='<div class="rvos-widget"></div>';let p=t.querySelector(".rvos-widget");function R(){var u;let o=r.getState();if(o.loading){p.innerHTML='<div class="rvos-loading">Loading reviews\u2026</div>';return}if(o.error){p.innerHTML=`<div class="rvos-error">Couldn't load reviews. Please try again later.</div>`;return}let n=[];if(o.blocks.has("ai-summary")&&n.push(et(o)),o.blocks.has("summary")&&n.push(rt(o)),o.blocks.has("trust-badges")&&n.push(at(o)),o.blocks.has("distribution")&&n.push(it(o)),o.blocks.has("filters")&&n.push(st(o)),o.blocks.has("ugc-gallery")&&n.push(ot(o)),o.blocks.has("feed")&&n.push(lt(o)),p.innerHTML=n.join("")+(o.blocks.has("write")?ct(o):"")+nt(o),S!==null){let f=S;S=null;let d=p.querySelector(`[data-photo-index="${f}"]`);d==null||d.focus()}else o.lightboxIndex!==null&&C===null&&((u=p.querySelector(".rvos-lightbox"))==null||u.focus());C=o.lightboxIndex}let S=null,C=null;r.subscribe(R);let k=0;async function F(o){let n=r.getState(),u=++k;r.setState({reviewsLoading:!0});try{let f=await P(i,{productSlug:a,rating:n.ratingFilter,attrFilters:n.attrFilters,sort:n.sort,page:o?1:n.page,pageSize:gt});if(u!==k)return;let d=o?[]:r.getState().reviews;r.setState({reviews:[...d,...f.reviews],total:f.total,page:f.page,reviewsLoading:!1})}catch(f){if(u!==k)return;r.setState({reviewsLoading:!1,error:"reviews_failed"})}}let L=0;async function O(){if(!r.getState().blocks.has("ugc-gallery"))return;let o=r.getState(),n=++L;try{let u=await P(i,{productSlug:a,rating:o.ratingFilter,attrFilters:o.attrFilters,sort:o.sort,page:1,pageSize:200});if(n!==L)return;r.setState({galleryReviews:u.reviews})}catch(u){if(n!==L)return;r.setState({galleryReviews:[]})}}let E=0;async function D(){if(!r.getState().blocks.has("ai-summary"))return;let o=++E;r.setState({aiSummaryLoading:!0});try{let n=await V(i,a,r.getState().attrFilters);if(o!==E)return;r.setState({aiSummary:n,aiSummaryLoading:!1})}catch(n){if(o!==E)return;r.setState({aiSummary:null,aiSummaryLoading:!1})}}async function _(o=!0){r.getState().lightboxIndex!==null&&r.setState({lightboxIndex:null,lightboxReturnIndex:null}),o&&ut(r.getState().attrFilters,r.getState().ratingFilter,r.getState().sort,!0),await Promise.all([F(!0),D(),O()])}window.addEventListener("popstate",()=>{let o=W(r.getState().attributeDefs);r.setState({attrFilters:o.attrFilters,ratingFilter:o.rating,sort:o.sort}),_(!1)});async function ft(){try{let o=await z(i,a),[n,u]=await Promise.all([B(i,a),G(i,o.category)]),f=W(u);r.setState({product:o,summary:n,attributeDefs:u,ratingFilter:f.rating,attrFilters:f.attrFilters,sort:f.sort,loading:!1}),r.getState().blocks.has("trust-badges")&&K(i,a).then(d=>r.setState({marketplaceStats:d})).catch(()=>r.setState({marketplaceStats:[]})),await Promise.all([F(!0),D(),O()])}catch(o){console.error("[reviewos] init failed",o),r.setState({loading:!1,error:"init_failed"})}}p.addEventListener("click",async o=>{let n=o.target.closest("[data-action]");if(!n)return;let u=n.dataset.action;if(!((n.classList.contains("rvos-modal-overlay")||n.classList.contains("rvos-lightbox"))&&o.target!==n)){if(u==="filter-rating"){let d=n.dataset.rating,m=d?Number(d):null,v=r.getState().ratingFilter;r.setState({ratingFilter:v===m?null:m}),await _();return}if(u==="toggle-filter"){let d=n.dataset.key,m=n.dataset.value,v={...r.getState().attrFilters};v[d]===m?delete v[d]:v[d]=m,r.setState({attrFilters:v}),await _();return}if(u==="clear-filters"){r.setState({attrFilters:{},ratingFilter:null}),await _();return}if(u==="load-more"){if(r.getState().reviewsLoading)return;r.setState({page:r.getState().page+1}),await F(!1);return}if(u==="vote-helpful"){let d=n.dataset.reviewId,m=r.getState();if(m.votedIds[d])return;r.setState({votedIds:{...m.votedIds,[d]:!0},reviews:m.reviews.map(v=>v.id===d?{...v,helpfulCount:v.helpfulCount+1}:v)});try{await J(i,d)}catch(v){}return}if(u==="open-write"){T(r.getState().writeMediaFiles),r.setState({writeOpen:!0,writeSuccess:!1,writeError:null,writeRating:0,writeMediaFiles:[],writeMediaUploaded:null});return}if(u==="close-write"){r.setState({writeOpen:!1});return}if(u==="set-write-rating"){r.setState({writeRating:Number(n.dataset.value)});return}if(u==="remove-write-media"){let d=Number(n.dataset.index),m=r.getState().writeMediaFiles,v=m[d];v&&A(v);let y=m.filter((I,b)=>b!==d);r.setState({writeMediaFiles:y,writeMediaUploaded:null});return}if(u==="open-lightbox"){let d=Number(n.dataset.photoIndex);r.setState({lightboxIndex:d,lightboxReturnIndex:d});return}if(u==="close-lightbox"){S=r.getState().lightboxReturnIndex,r.setState({lightboxIndex:null,lightboxReturnIndex:null});return}if(u==="lightbox-prev"){let d=r.getState().lightboxIndex;d!==null&&d>0&&r.setState({lightboxIndex:d-1});return}if(u==="lightbox-next"){let d=r.getState(),m=$(d).length;d.lightboxIndex!==null&&d.lightboxIndex<m-1&&r.setState({lightboxIndex:d.lightboxIndex+1});return}}}),document.addEventListener("keydown",o=>{let n=r.getState();if(n.lightboxIndex!==null){if(o.key==="Escape")S=n.lightboxReturnIndex,r.setState({lightboxIndex:null,lightboxReturnIndex:null});else if(o.key==="ArrowLeft")n.lightboxIndex>0&&r.setState({lightboxIndex:n.lightboxIndex-1});else if(o.key==="ArrowRight"){let u=$(n).length;n.lightboxIndex<u-1&&r.setState({lightboxIndex:n.lightboxIndex+1})}}}),p.addEventListener("change",async o=>{var u;let n=o.target;if(n.dataset.action==="set-sort"){let f=n.value;r.setState({sort:f}),await _();return}if(n.dataset.action==="add-write-media"){let d=Array.from((u=n.files)!=null?u:[]),m=r.getState().writeMediaFiles,v=[...m,...d].slice(0,5),y=m.length+d.length-v.length;r.setState({writeMediaFiles:v,writeMediaUploaded:null,writeError:y>0?`You can attach up to ${5} files, ${y} file${y===1?"":"s"} not added.`:null})}}),p.addEventListener("submit",async o=>{var v,y,I;let n=o.target;if(n.dataset.action!=="submit-write")return;o.preventDefault();let u=r.getState();if(u.writeRating<1){r.setState({writeError:"Please select a star rating."});return}let f=new FormData(n),d={};for(let b of u.attributeDefs){let U=f.get(`attr__${b.key}`);typeof U=="string"&&U&&(d[b.key]=U)}r.setState({writeError:null});let m=u.writeMediaUploaded;if(m===null&&u.writeMediaFiles.length>0){r.setState({writeMediaUploading:!0});try{m=await Z(u.writeMediaFiles,b=>Q(i,b)),r.setState({writeMediaUploaded:m,writeMediaUploading:!1})}catch(b){r.setState({writeMediaUploading:!1,writeError:"One of your files failed to upload, remove it and try again."});return}}r.setState({writeSubmitting:!0});try{await X(i,{productSlug:a,customerName:String((v=f.get("customerName"))!=null?v:""),rating:u.writeRating,title:String((y=f.get("title"))!=null?y:"")||void 0,body:String((I=f.get("body"))!=null?I:""),attributes:d,media:m!=null?m:[]}),T(u.writeMediaFiles),r.setState({writeSubmitting:!1,writeSuccess:!0,writeMediaFiles:[],writeMediaUploaded:null})}catch(b){r.setState({writeSubmitting:!1,writeError:b instanceof Error?b.message:"Something went wrong."})}}),R(),ft()}function j(t){t.querySelector(".rvos-widget")||mt(t)}function St(t){if(t){j(t);return}document.querySelectorAll("[data-reviewos]").forEach(j)}function pt(){document.querySelectorAll("[data-reviewos]:not([data-reviewos-manual])").forEach(j)}window.ReviewOS={mount:St};if(window.ReviewOSQueue){let t=window.ReviewOSQueue;window.ReviewOSQueue=[],t.forEach(e=>e())}function vt(){document.readyState==="complete"?pt():window.addEventListener("load",()=>pt(),{once:!0})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",vt):vt();})();
