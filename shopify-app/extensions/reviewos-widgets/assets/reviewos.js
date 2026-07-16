"use strict";(()=>{function W(t){let e=t,a=new Set;return{getState:()=>e,setState(s){e={...e,...s},a.forEach(i=>i())},subscribe(s){return a.add(s),()=>a.delete(s)}}}var I=new Set(["rating","sort","page"]);function x(t){let e=new URLSearchParams(window.location.search),a={},s=new Set(t.map(c=>c.key));for(let[c,g]of e.entries())s.has(c)&&!I.has(c)&&(a[c]=g);let i=e.get("rating"),o=i?Number(i):null,r=e.get("sort")||"recent";return{attrFilters:a,rating:o,sort:r}}function C(t,e,a,s=!1){let i=new URLSearchParams(window.location.search);for(let c of Array.from(i.keys()))(I.has(c)||t[c]!==void 0)&&i.delete(c);for(let[c,g]of Object.entries(t))i.set(c,g);e&&i.set("rating",String(e)),a!=="recent"&&i.set("sort",a);let o=i.toString(),r=`${window.location.pathname}${o?`?${o}`:""}${window.location.hash}`;s?window.history.pushState(null,"",r):window.history.replaceState(null,"",r)}function n(t){return String(t!=null?t:"").replace(/[&<>"']/g,e=>{switch(e){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}function w(t,e=5){let a="";for(let s=1;s<=e;s++)a+=`<span class="rvos-star ${s<=t?"rvos-star--filled":""}">&#9733;</span>`;return a}function H(t){let e=new Date(t);return Number.isNaN(e.getTime())?"":e.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}function O(t){let e=t.summary;return e?`
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
  `:""}function N(t){let e=t.summary;if(!e||e.count===0)return"";let a=[5,4,3,2,1].map(i=>{var g;let o=(g=e.byStar[String(i)])!=null?g:0,r=e.count>0?Math.round(o/e.count*100):0;return`
        <button type="button" class="rvos-dist-row ${t.ratingFilter===i?"rvos-dist-row--active":""}" data-action="filter-rating" data-rating="${i}">
          <span class="rvos-dist-row__label">${i}&#9733;</span>
          <span class="rvos-dist-row__bar"><span class="rvos-dist-row__fill" style="width:${r}%"></span></span>
          <span class="rvos-dist-row__count">${o}</span>
        </button>
      `}).join(""),s=t.ratingFilter?`<button type="button" class="rvos-link" data-action="filter-rating" data-rating="">Clear rating filter (${n(t.ratingFilter)}&#9733;)</button>`:"";return`<div class="rvos-distribution">${a}${s}</div>`}var ot=[{value:"recent",label:"Most recent"},{value:"helpful",label:"Most helpful"},{value:"rating_desc",label:"Highest rating"},{value:"rating_asc",label:"Lowest rating"}];function lt(t,e){let a=[t.verifiedBuyer?'<span class="rvos-badge">Verified buyer</span>':"",t.verifiedMarketplace?'<span class="rvos-badge rvos-badge--marketplace">Verified marketplace</span>':""].join(""),s=t.media.length?`<div class="rvos-card__media">${t.media.map(o=>o.type==="video"?`<video class="rvos-card__thumb" src="${n(o.url)}" muted preload="metadata"></video>`:`<img class="rvos-card__thumb" src="${n(o.url)}" alt="review media" loading="lazy" />`).join("")}</div>`:"",i=t.merchantReply?`<div class="rvos-card__reply">
        <div class="rvos-card__reply-label">Merchant reply</div>
        <div>${n(t.merchantReply)}</div>
      </div>`:"";return`
    <article class="rvos-card" data-review-id="${n(t.id)}">
      <div class="rvos-card__head">
        <div class="rvos-stars">${w(t.rating)}</div>
        <div class="rvos-card__author">${n(t.customerName)}</div>
        ${a}
        <div class="rvos-card__date">${H(t.createdAt)}</div>
      </div>
      ${t.title?`<h4 class="rvos-card__title">${n(t.title)}</h4>`:""}
      <p class="rvos-card__body">${n(t.body)}</p>
      ${s}
      ${i}
      <button type="button" class="rvos-helpful" data-action="vote-helpful" data-review-id="${n(t.id)}" ${e?"disabled":""}>
        Helpful (<span class="rvos-helpful__count">${t.helpfulCount}</span>)
      </button>
    </article>
  `}function B(t){let e=ot.map(r=>`<option value="${r.value}" ${t.sort===r.value?"selected":""}>${r.label}</option>`).join(""),a=`
    <div class="rvos-feed__toolbar">
      <span class="rvos-feed__total">${t.total.toLocaleString()} review${t.total===1?"":"s"}</span>
      <select class="rvos-select" data-action="set-sort">${e}</select>
    </div>
  `;if(t.reviewsLoading&&t.reviews.length===0)return`${a}<div class="rvos-feed__loading">Loading reviews\u2026</div>`;if(t.reviews.length===0)return`${a}<div class="rvos-empty">No reviews match your filters yet.</div>`;let s=t.reviews.map(r=>lt(r,!!t.votedIds[r.id])).join(""),o=t.page*t.pageSize<t.total?`<button type="button" class="rvos-btn rvos-btn--outline rvos-feed__load-more" data-action="load-more" ${t.reviewsLoading?"disabled":""}>
        ${t.reviewsLoading?"Loading\u2026":"Load more"}
      </button>`:"";return`${a}<div class="rvos-feed__list">${s}</div>${o}`}function z(t){if(t.attributeDefs.length===0)return"";let e=t.attributeDefs.map(i=>{let o=t.attrFilters[i.key],r=i.options.map(c=>`<button type="button" class="rvos-chip ${o===c?"rvos-chip--active":""}" data-action="toggle-filter" data-key="${n(i.key)}" data-value="${n(c)}">${n(c)}</button>`).join("");return`
        <div class="rvos-filter-group">
          <span class="rvos-filter-group__label">${n(i.label)}</span>
          <div class="rvos-filter-group__options">${r}</div>
        </div>
      `}).join(""),a=Object.entries(t.attrFilters);return`<div class="rvos-filters">${a.length>0?`<div class="rvos-active-filters">
          ${a.map(([i,o])=>{let r=t.attributeDefs.find(g=>g.key===i),c=r?r.label:i;return`<span class="rvos-active-chip">${n(c)}: ${n(o)} <button type="button" data-action="toggle-filter" data-key="${n(i)}" data-value="${n(o)}" aria-label="Remove filter">&times;</button></span>`}).join("")}
          <button type="button" class="rvos-link" data-action="clear-filters">Clear all</button>
        </div>`:""}${e}</div>`}var M=new WeakMap;function q(t){let e=M.get(t);return e||(e=URL.createObjectURL(t),M.set(t,e)),e}function U(t){let e=M.get(t);e&&(URL.revokeObjectURL(e),M.delete(t))}function T(t){for(let e of t)U(e)}async function V(t,e){let a=[];for(let s of t){let i=await e({filename:s.name,contentType:s.type,sizeBytes:s.size});if(!(await fetch(i.uploadUrl,{method:i.method,headers:i.headers,body:s})).ok)throw new Error(`upload_failed:${s.name}`);a.push({type:i.type,url:i.publicUrl,storageKey:i.storageKey,mimeType:s.type,sizeBytes:s.size})}return a}function K(t){if(!t.writeOpen)return"";if(t.writeSuccess)return`
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
    `;let e=t.attributeDefs.map(r=>{let c=r.options.map(g=>`<option value="${n(g)}">${n(g)}</option>`).join("");return`
        <label class="rvos-field">
          <span>${n(r.label)}</span>
          <select name="attr__${n(r.key)}" class="rvos-select">
            <option value="">Select\u2026</option>
            ${c}
          </select>
        </label>
      `}).join(""),a=t.writeError?`<div class="rvos-form-error">${n(t.writeError)}</div>`:"",s=t.writeMediaFiles.map((r,c)=>`
        <div class="rvos-media-preview">
          ${r.type.startsWith("image/")?`<img src="${q(r)}" alt="${n(r.name)}" class="rvos-media-preview__thumb" />`:'<div class="rvos-media-preview__video-icon" aria-hidden="true">&#9654;</div>'}
          <span class="rvos-media-preview__name">${n(r.name)}</span>
          <button type="button" class="rvos-media-preview__remove" data-action="remove-write-media" data-index="${c}" aria-label="Remove ${n(r.name)}" ${t.writeMediaUploading?"disabled":""}>&times;</button>
        </div>
      `).join(""),i=t.writeMediaUploading,o=t.writeMediaFiles.length<5;return`
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
          <div class="rvos-field">
            <span>Photos / videos (optional, up to ${5})</span>
            ${s?`<div class="rvos-media-previews">${s}</div>`:""}
            ${o?`<input type="file" data-action="add-write-media" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime" multiple ${i?"disabled":""} />`:""}
          </div>
          ${a}
          <button type="submit" class="rvos-btn rvos-btn--primary" ${t.writeSubmitting||i?"disabled":""}>
            ${i?"Uploading\u2026":t.writeSubmitting?"Submitting\u2026":"Submit review"}
          </button>
        </form>
      </div>
    </div>
  `}function J(t){if(t.aiSummaryLoading)return'<div class="rvos-ai-summary rvos-ai-summary--loading">Generating AI summary\u2026</div>';let e=t.aiSummary;if(!e)return"";let a=Object.keys(t.attrFilters).length,s=a>0?`AI summary of ${e.reviewCount} review${e.reviewCount===1?"":"s"} matching ${a} filter${a===1?"":"s"}`:`AI summary of ${e.reviewCount} review${e.reviewCount===1?"":"s"}`,i=e.pros.map(r=>`<li class="rvos-ai-summary__pro">${n(r)}</li>`).join(""),o=e.cons.map(r=>`<li class="rvos-ai-summary__con">${n(r)}</li>`).join("");return`
    <div class="rvos-ai-summary">
      <div class="rvos-ai-summary__header">
        <span class="rvos-ai-summary__badge">&#10022; AI summary</span>
      </div>
      <p class="rvos-ai-summary__text">${n(e.summaryText)}</p>
      ${e.pros.length||e.cons.length?`<div class="rvos-ai-summary__lists">
              ${i?`<ul class="rvos-ai-summary__pros">${i}</ul>`:""}
              ${o?`<ul class="rvos-ai-summary__cons">${o}</ul>`:""}
            </div>`:""}
      <div class="rvos-ai-summary__caption">${n(s)}</div>
    </div>
  `}function G(t){let e=t.marketplaceStats;return!e||e.length===0?"":`
    <div class="rvos-trust-badges">
      <div class="rvos-trust-badges__row">${e.map(s=>{let i=n(s.source.name.trim().charAt(0).toUpperCase()||"?"),o=s.source.logoUrl?`<img class="rvos-trust-badge__logo" src="${n(s.source.logoUrl)}" alt="${n(s.source.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display=''" /><div class="rvos-trust-badge__fallback" style="display:none">${i}</div>`:`<div class="rvos-trust-badge__fallback">${i}</div>`;return`
        <a class="rvos-trust-badge" href="${n(s.url)}" target="_blank" rel="noopener noreferrer">
          ${o}
          <div class="rvos-trust-badge__body">
            <div class="rvos-trust-badge__name">${n(s.source.name)}</div>
            <div class="rvos-stars">${w(Math.round(s.rating))}</div>
            <div class="rvos-trust-badge__count">${n(s.rating.toFixed(1))} | ${s.reviewCount.toLocaleString()} reviews</div>
          </div>
        </a>
      `}).join("")}</div>
      <div class="rvos-trust-badges__combined">Rated across ${e.length} marketplace${e.length===1?"":"s"}</div>
    </div>
  `}async function $(t){let e=await fetch(t);if(!e.ok)throw new Error(`request failed: ${e.status}`);return e.json()}async function X(t,e,a={}){let s=new URLSearchParams({product:e});for(let[o,r]of Object.entries(a))s.set(o,r);return(await $(`${t}/summary?${s.toString()}`)).summary}async function Y(t,e){let a=new URLSearchParams({product:e});return(await $(`${t}/distribution?${a.toString()}`)).distribution}async function Z(t,e){let a=new URLSearchParams({product:e});return(await $(`${t}/attributes?${a.toString()}`)).attributes.filter(i=>i.display)}async function Q(t,e){let a=new URLSearchParams({product:e});return(await $(`${t}/marketplace?${a.toString()}`)).stats}async function tt(t,e){let a=new URLSearchParams;a.set("product",e.productId),a.set("sort",e.sort),a.set("page",String(e.page)),a.set("pageSize",String(e.pageSize)),e.rating&&a.set("rating",String(e.rating));for(let[i,o]of Object.entries(e.attrFilters))a.set(i,o);return await $(`${t}/reviews?${a.toString()}`)}async function et(t,e){var s;let a=await fetch(`${t}/media/presign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!a.ok){let i=await a.json().catch(()=>({}));throw new Error((s=i.error)!=null?s:`request failed: ${a.status}`)}return a.json()}async function rt(t,e){var s;let a=await fetch(`${t}/reviews`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!a.ok){let i=await a.json().catch(()=>({}));throw new Error((s=i.error)!=null?s:`request failed: ${a.status}`)}return a.json()}var at="reviewos:filters-changed",dt="/apps/reviewos",ct=5;function ut(t,e){return{apiBase:"",productSlug:t,blocks:new Set,loading:!0,error:null,product:null,summary:null,attributeDefs:[],aiSummary:null,aiSummaryLoading:!1,marketplaceStats:[],lightboxIndex:null,lightboxReturnIndex:null,galleryReviews:[],reviews:[],total:0,page:1,pageSize:e,reviewsLoading:!1,votedIds:{},ratingFilter:null,attrFilters:{},sort:"recent",writeOpen:!1,writeRating:0,writeSubmitting:!1,writeSuccess:!1,writeError:null,writeMediaFiles:[],writeMediaUploaded:null,writeMediaUploading:!1}}function it(t){let e=t.dataset.block,a=t.dataset.productHandle||t.dataset.productId;if(!e||!a){console.error("[reviewos] missing data-block or data-product-handle");return}let s=a,i=(t.dataset.apiBase||dt).replace(/\/$/,""),o=Number(t.dataset.pageSize)||ct,r=W(ut(a,o)),{attrFilters:c,rating:g,sort:A}=x(r.getState().attributeDefs);r.setState({attrFilters:c,ratingFilter:g,sort:A});function P(){let l=r.getState();if(l.loading){t.innerHTML='<div class="rvos-loading">Loading reviews\u2026</div>';return}if(l.error){t.innerHTML=`<div class="rvos-error">Couldn't load reviews. Please try again later.</div>`;return}switch(e){case"star-badge":t.innerHTML=O(l);break;case"rating-distribution":t.innerHTML=N(l);break;case"review-feed":t.innerHTML=B(l);break;case"filter-chips":t.innerHTML=z(l);break;case"write-review":t.innerHTML='<button type="button" class="rvos-btn rvos-btn--primary" data-action="open-write">Write a review</button>'+K(l);break;case"ai-summary":t.innerHTML=J(l);break;case"trust-badges":t.innerHTML=G(l);break;default:t.innerHTML=""}}r.subscribe(P);let k=0;async function F(l){let d=r.getState(),u=++k;r.setState({reviewsLoading:!0});try{let f=await tt(i,{productId:s,rating:d.ratingFilter,attrFilters:d.attrFilters,sort:d.sort,page:l?1:d.page,pageSize:o});if(u!==k)return;let p=l?[]:r.getState().reviews;r.setState({reviews:[...p,...f.reviews],total:f.total,page:f.page,reviewsLoading:!1})}catch(f){if(u!==k)return;r.setState({reviewsLoading:!1,error:"reviews_failed"})}}let L=0;async function D(){let l=++L;r.setState({aiSummaryLoading:!0});try{let d=await X(i,s,r.getState().attrFilters);if(l!==L)return;r.setState({aiSummary:d,aiSummaryLoading:!1})}catch(d){if(l!==L)return;r.setState({aiSummary:null,aiSummaryLoading:!1})}}async function S(){e==="review-feed"&&await F(!0),e==="ai-summary"&&await D()}function j(){let l=x(r.getState().attributeDefs);r.setState({attrFilters:l.attrFilters,ratingFilter:l.rating,sort:l.sort}),S()}window.addEventListener("popstate",j),window.addEventListener(at,j);function _(l=!0){let d=r.getState();C(d.attrFilters,d.ratingFilter,d.sort,l),window.dispatchEvent(new Event(at))}t.addEventListener("click",async l=>{let d=l.target.closest("[data-action]");if(!d)return;let u=d.dataset.action;if(!(d.classList.contains("rvos-modal-overlay")&&l.target!==d)){if(u==="filter-rating"){let p=d.dataset.rating,m=p?Number(p):null,v=r.getState().ratingFilter;r.setState({ratingFilter:v===m?null:m}),_(),await S();return}if(u==="toggle-filter"){let p=d.dataset.key,m=d.dataset.value,v={...r.getState().attrFilters};v[p]===m?delete v[p]:v[p]=m,r.setState({attrFilters:v}),_(),await S();return}if(u==="clear-filters"){r.setState({attrFilters:{},ratingFilter:null}),_(),await S();return}if(u==="load-more"){if(r.getState().reviewsLoading)return;r.setState({page:r.getState().page+1}),await F(!1);return}if(u==="open-write"){T(r.getState().writeMediaFiles),r.setState({writeOpen:!0,writeSuccess:!1,writeError:null,writeRating:0,writeMediaFiles:[],writeMediaUploaded:null});return}if(u==="close-write"){r.setState({writeOpen:!1});return}if(u==="set-write-rating"){r.setState({writeRating:Number(d.dataset.value)});return}if(u==="remove-write-media"){let p=Number(d.dataset.index),m=r.getState().writeMediaFiles,v=m[p];v&&U(v);let y=m.filter((R,b)=>b!==p);r.setState({writeMediaFiles:y,writeMediaUploaded:null});return}}}),t.addEventListener("change",async l=>{var u;let d=l.target;if(d.dataset.action==="set-sort"){r.setState({sort:d.value}),_(),await S();return}if(d.dataset.action==="add-write-media"){let p=Array.from((u=d.files)!=null?u:[]),m=r.getState().writeMediaFiles,v=[...m,...p].slice(0,5),y=m.length+p.length-v.length;r.setState({writeMediaFiles:v,writeMediaUploaded:null,writeError:y>0?`You can attach up to ${5} files, ${y} file${y===1?"":"s"} not added.`:null})}}),t.addEventListener("submit",async l=>{var v,y,R;let d=l.target;if(d.dataset.action!=="submit-write")return;l.preventDefault();let u=r.getState();if(u.writeRating<1){r.setState({writeError:"Please select a star rating."});return}let f=new FormData(d),p={};for(let b of u.attributeDefs){let E=f.get(`attr__${b.key}`);typeof E=="string"&&E&&(p[b.key]=E)}r.setState({writeError:null});let m=u.writeMediaUploaded;if(m===null&&u.writeMediaFiles.length>0){r.setState({writeMediaUploading:!0});try{m=await V(u.writeMediaFiles,b=>et(i,b)),r.setState({writeMediaUploaded:m,writeMediaUploading:!1})}catch(b){r.setState({writeMediaUploading:!1,writeError:"One of your files failed to upload, remove it and try again."});return}}r.setState({writeSubmitting:!0});try{await rt(i,{productId:a,customerName:String((v=f.get("customerName"))!=null?v:""),rating:u.writeRating,title:String((y=f.get("title"))!=null?y:"")||void 0,body:String((R=f.get("body"))!=null?R:""),attributes:p,media:m!=null?m:[]}),T(u.writeMediaFiles),r.setState({writeSubmitting:!1,writeSuccess:!0,writeMediaFiles:[],writeMediaUploaded:null})}catch(b){r.setState({writeSubmitting:!1,writeError:b instanceof Error?b.message:"Something went wrong."})}});async function nt(){try{let l=e==="star-badge"||e==="rating-distribution",d=e==="filter-chips"||e==="write-review",u=e==="review-feed",f=e==="ai-summary",p=e==="trust-badges",[m,v,y]=await Promise.all([l?Y(i,s):Promise.resolve(null),d?Z(i,s):Promise.resolve([]),p?Q(i,s):Promise.resolve([])]);r.setState({summary:m?{average:m.average,count:m.count,byStar:m.byStar}:null,attributeDefs:v,marketplaceStats:y,loading:!1}),u&&await F(!0),f&&await D()}catch(l){console.error("[reviewos] shopify block init failed",l),r.setState({loading:!1,error:"init_failed"})}}P(),nt()}function mt(t){t.dataset.reviewosMounted!=="true"&&(t.dataset.reviewosMounted="true",it(t))}function st(){document.querySelectorAll("[data-reviewos]").forEach(mt)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",st):st();})();
