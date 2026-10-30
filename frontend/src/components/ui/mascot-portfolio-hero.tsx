// @ts-nocheck
import React, { useId, useRef, useState, useEffect } from "react";
import { jsx, jsxs, Fragment } from "react/jsx-runtime";

const d = { jsx, jsxs, Fragment };
const $l = React;
const i = (fn: any, _name: string) => fn;

function o1(T: number, R: number, B: number, m: number, q: number, H: number) {
  const V = (al: number) => al / Math.sqrt(1 + al * al);
  return [V((T - B) / q), V((R - m) / H)];
}

function zf(T: number, R: number, B: number, m: number) {
  return R + (T - R) * Math.exp(-m * B);
}

function r1(T: number, R: number, B: number) {
  return {
    body: { dx: T * 4, dy: 0 },
    head: { dx: T * 10, dy: R * 7, rot: T * 4 },
    ears: { dx: -T * 7, dy: -R * 3, lead: 1 + T * 0.16, trail: 1 - T * 0.16 },
    beanie: { dx: T * 13, dy: R * 4 },
    tag: { dx: T * 7, dy: 0 },
    blush: { dx: T * 20, dy: R * 14 },
    face: { dx: T * 28, dy: R * (R < 0 ? 11 : 20) },
    nose: { dx: T * 10, dy: R * 7 },
    eyes: { dx: T * 4, dy: R * 4, scale: 1 + B * 0.14 },
    brows: { dx: T * 3, dy: R * 2 + Math.min(0, R) * 3 - B * 9 },
  };
}

function h1(T: number) {
  return T < 0 || T > 0.15 ? 1 : 1 - Math.sin((Math.PI * T) / 0.15) * 0.92;
}

function d1() {
  const _ = [], E = [];
  const U = (X: number, I: number) => {
    const dl = X - 500, xl = I - 475;
    const Ol = dl > 0 ? (1e3 - X) / dl : dl < 0 ? -X / dl : Infinity;
    const pt = xl > 0 ? (1e3 - I) / xl : xl < 0 ? -I / xl : Infinity;
    const tt = Math.min(Ol, pt);
    return [X, I, X + dl * tt, I + xl * tt];
  };
  for (let X = 0; X <= 14; X++) {
    const I = 95 + (810 * X) / 14;
    _.push([I, 85, I, 865]);
    E.push(U(I, 85), U(I, 865));
  }
  for (let X = 0; X <= 11; X++) {
    const I = 85 + (780 * X) / 11;
    _.push([95, I, 905, I]);
    E.push(U(95, I), U(905, I));
  }
  const nl = [1.07, 1.16, 1.28, 1.45, 1.7].map((X) => {
    const I = 500 + -405 * X, dl = 500 + 405 * X, xl = 475 + -390 * X, Ol = 475 + 390 * X;
    return "M" + I + " " + xl + "H" + dl + "V" + Ol + "H" + I + "Z";
  });
  return { back: _, rays: E, depth: nl };
}

const Of = d1();

function m1() {
  const R = [1, 0.84, 0.95, 0.78, 0.9];
  let B = "";
  for (let m = 0; m <= 180; m++) {
    const q = (m / 180) * Math.PI * 2;
    const H = Math.floor(((q + Math.PI / 5) / (Math.PI * 2)) * 5) % 5;
    const al = 50 * (0.3 + 0.7 * Math.pow(Math.abs(Math.cos((q * 5) / 2)), 0.9) * R[H]);
    const _ = 60 + Math.cos(q - Math.PI / 2) * al;
    const E = 60 + Math.sin(q - Math.PI / 2) * al;
    B += (m ? "L" : "M") + _.toFixed(1) + " " + E.toFixed(1);
  }
  return B + "Z";
}

const y1 = m1();

const v1 = `
.mph-root{position:relative;width:100%;overflow:hidden;isolation:isolate;background:var(--mph-paper);color:var(--mph-ink);container:mph / size;font-family:var(--mph-sans);-webkit-font-smoothing:antialiased;}
.mph-room{position:absolute;inset:0;width:100%;height:100%;display:block;color:var(--mph-ink);pointer-events:none;}
.mph-room line,.mph-room path{vector-effect:non-scaling-stroke;}
.mph-stage{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(100cqw,177.78cqh);aspect-ratio:16/9;container:mphs / inline-size;}

.mph-top{position:absolute;left:4.6%;right:4.6%;top:4.4%;display:grid;grid-template-columns:auto auto 1fr auto auto;align-items:center;column-gap:2.4cqw;font-size:1.05cqw;font-weight:800;line-height:1.1;text-transform:uppercase;letter-spacing:.02em;}
.mph-index{display:inline-flex;align-items:center;gap:.9em;border:.12cqw solid var(--mph-ink);border-radius:999px;padding:.12em .9em .12em .12em;font-size:.72em;}
.mph-index b{background:var(--mph-accent);color:var(--mph-ink);border-radius:999px;padding:.3em 1.2em;font-weight:800;}
.mph-tagline{font-size:1.18em;font-weight:900;margin-left:1cqw;}
.mph-brace{grid-column:4;font-size:1.3em;font-weight:700;letter-spacing:.04em;margin-right:2.6cqw;}
.mph-reel{grid-column:5;display:flex;align-items:center;gap:.8em;font-size:.8em;text-align:right;}
.mph-reel i{display:block;width:1.9em;height:1.9em;border-radius:50%;background:var(--mph-accent);border:.12cqw solid var(--mph-ink);flex:none;}

.mph-h1{position:absolute;left:8.8%;top:17.5%;margin:0;font-family:var(--mph-display);font-weight:900;font-size:6.5cqw;line-height:.93;letter-spacing:-.045em;text-transform:uppercase;color:var(--mph-ink);}
.mph-line{display:block;width:max-content;white-space:nowrap;position:relative;}
.mph-ch{display:inline-block;transition:transform .35s cubic-bezier(.3,1.6,.5,1),color .2s;}
.mph-ch:hover{transform:translateY(-.08em) rotate(-4deg);color:var(--mph-accent);}
.mph-arrow{display:inline-block;width:.6em;height:.6em;margin:0 .06em 0 .1em;vertical-align:-.02em;}
.mph-arrow path{stroke:currentColor;stroke-width:15;fill:none;stroke-linecap:square;}
.mph-badge{position:absolute;top:-.02em;left:calc(100% + .55em);font-family:var(--mph-sans);font-size:.2em;font-weight:800;letter-spacing:0;line-height:1;text-transform:none;border:.13cqw solid var(--mph-ink);border-radius:50%;padding:.75em 1.15em;transform:rotate(-9deg);transition:background .25s,transform .4s cubic-bezier(.3,1.6,.5,1);cursor:default;}
.mph-badge sup{font-size:.7em;margin-left:.1em;}
.mph-badge:hover{background:var(--mph-accent);transform:rotate(6deg) scale(1.08);}
.mph-swash{position:relative;display:inline-block;}
.mph-swash svg{position:absolute;left:-.95em;top:.3em;width:2.55em;height:.72em;overflow:visible;pointer-events:none;}
.mph-swash path{fill:none;stroke:var(--mph-ink);stroke-width:.2cqw;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:0;animation:mph-draw 1.6s .5s cubic-bezier(.6,0,.2,1) both;}
.mph-h1:hover .mph-swash path{animation:mph-draw 1.1s cubic-bezier(.6,0,.2,1) both;}
.mph-l4{font-size:1.2em;letter-spacing:-.02em;margin-top:.04em;}
.mph-vtag{display:inline-flex;flex-direction:column;align-items:stretch;vertical-align:-.02em;margin:0 .1em 0 .06em;width:.2em;}
.mph-vtag span{display:block;background:var(--mph-ink);color:var(--mph-paper);writing-mode:vertical-rl;font-family:var(--mph-sans);font-size:.105em;font-weight:800;letter-spacing:.12em;padding:.55em 0;text-align:center;}
.mph-vtag i{display:block;height:.34em;background:repeating-linear-gradient(to bottom,var(--mph-ink) 0 .02em,transparent .02em .045em);}
.mph-bracket{position:relative;display:inline-block;padding:0 .08em;}
.mph-bracket svg{position:absolute;left:-.02em;right:-.02em;top:-.1em;bottom:-.12em;width:calc(100% + .04em);height:calc(100% + .22em);overflow:visible;}
.mph-bracket path{fill:none;stroke:var(--mph-ink);stroke-width:.62cqw;stroke-linecap:butt;transition:transform .45s cubic-bezier(.3,1.6,.5,1);}
.mph-bracket:hover .mph-arc-t{transform:translateY(-10px);}
.mph-bracket:hover .mph-arc-b{transform:translateY(10px);}
.mph-star{display:inline-block;font-size:.66em;vertical-align:.5em;margin-left:.02em;transition:transform .6s cubic-bezier(.3,1.6,.5,1);}
.mph-l4:hover .mph-star{transform:rotate(180deg) scale(1.2);}

.mph-pill{position:absolute;left:8.8%;top:72.8%;display:flex;align-items:stretch;font-size:1.72cqw;font-weight:800;line-height:1;}
.mph-pill-a{position:relative;z-index:1;background:#fff;color:var(--mph-ink);border:.16cqw solid var(--mph-ink);border-radius:999px;padding:.72em 1.25em;}
.mph-pill-b{display:inline-flex;align-items:center;gap:.5em;margin-left:-1.4em;padding:.72em 3.4em .72em 3.1em;background:var(--mph-accent);color:var(--mph-ink);border:.16cqw solid var(--mph-ink);border-radius:0 999px 999px 0;text-decoration:none;transition:background .25s,color .25s,padding .35s cubic-bezier(.3,1.4,.5,1);}
.mph-pill-b em{font-style:normal;display:inline-block;width:0;overflow:hidden;opacity:0;transition:width .35s,opacity .25s;}
.mph-pill-b:hover,.mph-pill-b:focus-visible{background:var(--mph-ink);color:var(--mph-paper);padding-right:2.4em;outline:none;}
.mph-pill-b:hover em,.mph-pill-b:focus-visible em{width:1em;opacity:1;}

.mph-flower{position:absolute;left:35.4%;top:64%;width:7.4%;aspect-ratio:1;animation:mph-spin 22s linear infinite;cursor:grab;}
.mph-flower svg{display:block;width:100%;height:100%;overflow:visible;transition:transform .5s cubic-bezier(.3,1.8,.5,1);}
.mph-flower:hover svg{transform:scale(1.18) rotate(40deg);}
.mph-flower path{fill:#fff;stroke:var(--mph-ink);stroke-width:2.6;stroke-linejoin:round;}
.mph-curl{position:absolute;left:43.2%;top:52.5%;width:5.6%;aspect-ratio:1;overflow:visible;pointer-events:none;}
.mph-curl path{fill:none;stroke:var(--mph-ink);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;animation:mph-draw 1.4s 1s cubic-bezier(.6,0,.2,1) both;}

.mph-services{position:absolute;left:4.6%;bottom:4.6%;display:flex;gap:4cqw;margin:0;padding:0;list-style:none;font-size:1.3cqw;font-weight:800;}
.mph-services li{position:relative;cursor:default;padding-bottom:.25em;}
.mph-services li::after{content:"";position:absolute;left:0;right:0;bottom:0;height:.18em;background:var(--mph-accent);transform:scaleX(0);transform-origin:left;transition:transform .35s cubic-bezier(.6,0,.2,1);}
.mph-services li:hover::after{transform:scaleX(1);}

.mph-rule{position:absolute;width:0;border-left:.1cqw solid var(--mph-ink);}
.mph-rule::after{content:"";position:absolute;bottom:0;left:-.1cqw;width:1.1cqw;border-top:.1cqw solid var(--mph-ink);transform:rotate(28deg);transform-origin:left;}
.mph-rule-l{left:3.7%;top:23%;height:13%;}
.mph-rule-r{left:94.8%;top:66%;height:13%;}

.mph-char{position:absolute;left:55.5%;bottom:-1.2%;width:40.5%;aspect-ratio:600/720;padding:0;margin:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:40% 40% 8% 8%;}
.mph-char:focus-visible{outline:.2cqw dashed var(--mph-ink);outline-offset:.4cqw;}
.mph-char svg{display:block;width:100%;height:100%;overflow:visible;}
.mph-tagwig{transform-box:fill-box;transform-origin:50% 0;}
.mph-happy .mph-tagwig{animation:mph-wiggle .9s cubic-bezier(.3,1.6,.5,1);}
.mph-bubble{position:absolute;left:-4%;top:6%;max-width:46%;background:#fff;color:var(--mph-ink);border:.16cqw solid var(--mph-ink);border-radius:1.4em 1.4em 1.4em .2em;padding:.8em 1.1em;font-size:1.3cqw;font-weight:800;line-height:1.2;text-align:left;box-shadow:.35cqw .35cqw 0 var(--mph-accent);transform-origin:0 100%;transform:scale(0) rotate(-8deg);opacity:0;transition:transform .45s cubic-bezier(.3,1.6,.5,1),opacity .2s;pointer-events:none;}
.mph-bubble[data-on="true"]{transform:scale(1) rotate(-4deg);opacity:1;}

@keyframes mph-draw{from{stroke-dashoffset:1;}to{stroke-dashoffset:0;}}
@keyframes mph-spin{to{transform:rotate(360deg);}}
@keyframes mph-wiggle{0%{transform:rotate(0);}25%{transform:rotate(-14deg);}55%{transform:rotate(9deg);}80%{transform:rotate(-4deg);}100%{transform:rotate(0);}}

@container mph (orientation: portrait){
.mph-stage{top:0;transform:translateX(-50%);width:min(100cqw,56.25cqh);height:100cqh;aspect-ratio:auto;}
.mph-top{top:5cqw;left:6%;right:6%;grid-template-columns:auto 1fr auto;font-size:2.5cqw;}
.mph-tagline,.mph-brace{display:none;}
.mph-reel{grid-column:3;}
.mph-h1{left:7%;top:17cqw;font-size:11.4cqw;}
.mph-badge{left:calc(100% + .35em);top:.1em;font-size:.22em;}
.mph-pill{left:7%;top:70cqw;font-size:3.5cqw;}
.mph-flower{left:auto;right:6%;top:66cqw;width:13%;}
.mph-curl{left:auto;right:4%;top:44cqw;width:11%;}
.mph-services{left:7%;right:7%;bottom:auto;top:84cqw;flex-wrap:wrap;gap:1.6cqw 5cqw;font-size:3cqw;}
.mph-rule-l{left:3%;top:22cqw;height:12cqw;}
.mph-rule-r{left:95%;top:auto;bottom:40cqw;height:12cqw;}
.mph-char{left:12%;width:76%;bottom:-.6%;}
.mph-bubble{font-size:3cqw;left:-8%;top:2%;max-width:52%;}
}

@media (prefers-reduced-motion: reduce){
.mph-root *,.mph-root *::after{animation:none!important;transition:none!important;}
}
`;

const i1 = '"Inter", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif';
const c1 = '"Archivo Black", "Arial Black", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif';
const f1 = 600, s1 = 720;

const g1_cg = [
  "Churn Prediction",
  "Customer Analytics",
  "Explainable AI",
  "Retention Intelligence",
];

const p1_cg = [
  "Hi there! Let's prevent churn.",
  "Understanding customer risk with SHAP.",
  "Data-driven retention intelligence.",
  "Click to explore the platform!",
];

export interface MascotPortfolioHeroProps {
  height?: string;
  minHeight?: string;
  index?: string;
  discipline?: string;
  tagline?: string;
  collection?: [string, string];
  reel?: [string, string];
  year?: string;
  initials?: string;
  badge?: string;
  line2?: string;
  line3?: string;
  word?: string;
  verticalTag?: string;
  bracketed?: string;
  seekingLabel?: string;
  seeking?: string;
  href?: string;
  services?: string[];
  greetings?: string[];
  skin?: string;
  beanie?: string;
  shirt?: string;
  tag?: string;
  accent?: string;
  paper?: string;
  ink?: string;
  className?: string;
}

export function MascotPortfolioHero({height:T="100svh",minHeight:R="440px",index:B="01/10",discipline:m="AI RETENTION INTELLIGENCE",tagline:q="Understand. Predict. Retain.",collection:H=["CUSTOMER","INTELLIGENCE"],reel:V=["RETAIN X / AI PLATFORM","Cost-Sensitive Retention"],year:al="AI",initials:_="ML",badge:E="Explore Platform",line2:U="CUSTOMER",line3:nl="RETENTION",word:X="INTELLIGENCE",verticalTag:I="SaaS",bracketed:dl="*",seekingLabel:xl="BUILT FOR",seeking:Ol="SMARTER RETENTION",href:pt,services:tt=g1_cg,greetings:El=p1_cg,skin:Xl="#f7cfb0",beanie:P="#1d1d1f",shirt:Zl="#18181a",tag:Fl="#5FB57A",accent:Il="#5FB57A",paper:bt="#EBEBEA",ink:Lt="#111111",className:St}){const Hl=$l.useId().replace(/:/g,""),_l=i(tl=>tl+Hl,"id"),ml=i(tl=>"url(#"+_l(tl)+")","u"),jl=$l.useRef(null),b=$l.useRef(null),O=$l.useRef({}),N=i(tl=>Tl=>{O.current[tl]=Tl},"set"),[J,o]=$l.useState(!1),[M,D]=$l.useState(-1),z=$l.useRef(void 0),Q=i(()=>{D(tl=>(tl+1)%Math.max(1,El.length)),o(!0),window.clearTimeout(z.current),z.current=window.setTimeout(()=>o(!1),2200)},"poke");$l.useEffect(()=>()=>window.clearTimeout(z.current),[]),$l.useEffect(()=>{const tl=jl.current,Tl=b.current;if(!tl||!Tl)return;const Yt=window.matchMedia("(prefers-reduced-motion: reduce)");let ce=Yt.matches;const Ju=i(()=>ce=Yt.matches,"onMq");Yt.addEventListener("change",Ju);let et=0,wa=0,Ie=-1e9,Pe=0,fe=0,Ka=0,Ne=performance.now(),ku=Ne+1800,Wu=-1e9,Vt=0,Jl=!0;const ct=i(Al=>{et=Al.clientX,wa=Al.clientY,Ie=performance.now()},"onMove"),Yl=i(()=>Ie=-1e9,"onLeave");window.addEventListener("pointermove",ct,{passive:!0}),window.addEventListener("pointerdown",ct,{passive:!0}),document.documentElement.addEventListener("pointerleave",Yl),window.addEventListener("blur",Yl);const ft=i((Al,ot)=>"translate("+Al.toFixed(2)+" "+ot.toFixed(2)+")","tr"),st=O.current,$u=i(Al=>{var ua,Wa,Pu,jt,Ul,Ll,wt,na,ln,tn,$a;if(!Jl)return;Vt=requestAnimationFrame($u);const ot=Math.min(.05,(Al-Ne)/1e3);Ne=Al;const Bt=Tl.getBoundingClientRect(),se=Bt.left+Bt.width*.5,Fu=Bt.top+Bt.height*.48;let la=0,ta=0,ea=0;if(Al-Ie>3500){if(!ce){const xt=Al/1e3;la=Math.sin(xt*.45)*.55+Math.sin(xt*1.1)*.1,ta=Math.sin(xt*.31+1)*.25}}else{const xt=Math.max(innerWidth,innerHeight);[la,ta]=o1(et,wa,se,Fu,xt*.3,xt*.26);const Fa=Math.hypot(et-se,wa-Fu);ea=Math.max(0,1-Fa/(Bt.width*.45))}const Iu=ce?30:7;Pe=zf(Pe,la,ot,Iu),fe=zf(fe,ta,ot,Iu),Ka=zf(Ka,ea,ot,8);const il=r1(Pe,fe,Ka),Ja=ce?0:Math.sin(Al/620)*1.6;!ce&&Al>ku&&(Wu=Al,ku=Al+(Math.random()<.2?260:2200+Math.random()*3200));const ka=ce?1:h1((Al-Wu)/1e3);(ua=st.body)==null||ua.setAttribute("transform",ft(il.body.dx,il.body.dy+Ja*.4)),(Wa=st.head)==null||Wa.setAttribute("transform",ft(il.head.dx,il.head.dy+Ja)+" rotate("+il.head.rot.toFixed(2)+" 300 560)"),(Pu=st.earL)==null||Pu.setAttribute("transform",ft(il.ears.dx,il.ears.dy)+" translate(138 380) scale("+il.ears.lead.toFixed(3)+" 1) translate(-138 -380)"),(jt=st.earR)==null||jt.setAttribute("transform",ft(il.ears.dx,il.ears.dy)+" translate(462 380) scale("+il.ears.trail.toFixed(3)+" 1) translate(-462 -380)"),(Ul=st.beanie)==null||Ul.setAttribute("transform",ft(il.beanie.dx,il.beanie.dy)),(Ll=st.tag)==null||Ll.setAttribute("transform",ft(il.tag.dx,il.tag.dy)),(wt=st.blush)==null||wt.setAttribute("transform",ft(il.blush.dx,il.blush.dy)),(na=st.face)==null||na.setAttribute("transform",ft(il.face.dx,il.face.dy)),(ln=st.nose)==null||ln.setAttribute("transform",ft(il.nose.dx,il.nose.dy)),(tn=st.brows)==null||tn.setAttribute("transform",ft(il.brows.dx,il.brows.dy)),($a=st.eyes)==null||$a.setAttribute("transform",ft(il.eyes.dx,il.eyes.dy)+" translate(300 350) scale("+il.eyes.scale.toFixed(3)+" "+(il.eyes.scale*ka).toFixed(3)+") translate(-300 -350)")},"frame");Vt=requestAnimationFrame($u);const qe=new IntersectionObserver(([Al])=>{const wasOff=!Jl;Jl=Al.isIntersecting;Ne=performance.now();if(Jl&&wasOff){cancelAnimationFrame(Vt);Vt=requestAnimationFrame($u)}});return qe.observe(tl),()=>{cancelAnimationFrame(Vt),qe.disconnect(),Yt.removeEventListener("change",Ju),window.removeEventListener("pointermove",ct),window.removeEventListener("pointerdown",ct),document.documentElement.removeEventListener("pointerleave",Yl),window.removeEventListener("blur",Yl)}},[]);const k=i(tl=>Array.from(tl).map((Tl,Yt)=>d.jsx("span",{className:"mph-ch",children:Tl===" "?" ":Tl},Yt)),"chars"),Z=Array.from(nl),Pl=Z.slice(0,-1).join(""),yl=Z[Z.length-1]??"",Ht=M>=0?El[M%El.length]:El[0],Va={"--mph-accent":Il,"--mph-paper":bt,"--mph-ink":Lt,"--mph-sans":i1,"--mph-display":c1,height:T,minHeight:R},Ue=d.jsxs(d.Fragment,{children:[Ol,d.jsx("em",{"aria-hidden":"true",children:"→"})]});return d.jsxs("div",{ref:jl,className:"mph-root"+(St?" "+St:""),style:Va,children:[d.jsx("style",{children:v1}),d.jsx("svg",{className:"mph-room",viewBox:"0 0 1000 1000",preserveAspectRatio:"none","aria-hidden":"true",children:d.jsxs("g",{stroke:"currentColor",strokeWidth:"0.8",fill:"none",opacity:"0.13",children:[Of.back.map((tl,Tl)=>d.jsx("line",{x1:tl[0],y1:tl[1],x2:tl[2],y2:tl[3]},"b"+Tl)),Of.rays.map((tl,Tl)=>d.jsx("line",{x1:tl[0],y1:tl[1],x2:tl[2],y2:tl[3]},"r"+Tl)),Of.depth.map((tl,Tl)=>d.jsx("path",{d:tl},"d"+Tl))]})}),d.jsxs("div",{className:"mph-stage",children:[d.jsxs("header",{className:"mph-top",children:[d.jsxs("span",{className:"mph-index",children:[d.jsx("b",{children:B}),m]}),d.jsx("span",{className:"mph-tagline",children:q}),d.jsxs("span",{className:"mph-brace",children:["{",H[0],"/",H[1],"}"]}),d.jsxs("span",{className:"mph-reel",children:[d.jsx("i",{"aria-hidden":"true"}),d.jsxs("span",{children:[V[0],d.jsx("br",{}),V[1]]})]})]}),d.jsx("span",{className:"mph-rule mph-rule-l","aria-hidden":"true"}),d.jsx("span",{className:"mph-rule mph-rule-r","aria-hidden":"true"}),d.jsxs("h1",{className:"mph-h1","aria-label":[al,_,U,nl,X+dl].join(" "),children:[d.jsxs("span",{className:"mph-line","aria-hidden":"true",children:[k(al),d.jsx("svg",{className:"mph-arrow",viewBox:"0 0 100 100",children:d.jsx("path",{d:"M14 14 L84 84 M84 30 V84 H30"})}),k(_),d.jsxs("span",{className:"mph-badge",children:[E,d.jsx("sup",{children:"@"})]})]}),d.jsx("span",{className:"mph-line","aria-hidden":"true",children:k(U)}),d.jsxs("span",{className:"mph-line","aria-hidden":"true",children:[k(Pl),d.jsxs("span",{className:"mph-swash",children:[d.jsx("span",{className:"mph-ch",children:yl}),d.jsx("svg",{viewBox:"0 0 255 72",preserveAspectRatio:"none",children:d.jsx("path",{pathLength:1,d:"M6 44 C40 18 150 4 222 14 C262 20 258 48 214 58 C150 72 60 70 30 60 C10 53 20 40 60 34"})})]})]}),d.jsxs("span",{className:"mph-line mph-l4","aria-hidden":"true",children:[k(X),d.jsxs("span",{className:"mph-vtag",children:[d.jsx("span",{children:I}),d.jsx("i",{})]}),d.jsxs("span",{className:"mph-bracket",children:[d.jsxs("svg",{viewBox:"0 0 100 120",preserveAspectRatio:"none",children:[d.jsx("path",{className:"mph-arc-t",vectorEffect:"non-scaling-stroke",d:"M4 16 Q50 -8 96 16"}),d.jsx("path",{className:"mph-arc-b",vectorEffect:"non-scaling-stroke",d:"M4 104 Q50 128 96 104"})]}),dl]}),d.jsx("span",{className:"mph-star",children:"*"})]})]}),d.jsx("svg",{className:"mph-curl",viewBox:"0 0 100 100","aria-hidden":"true",children:d.jsx("path",{pathLength:1,d:"M92 8 C70 6 52 22 58 40 C63 56 84 52 80 36 C76 22 50 30 40 48 C32 62 26 74 16 84 M14 66 L14 86 L34 86"})}),d.jsxs("div",{className:"mph-pill",children:[d.jsx("span",{className:"mph-pill-a",children:xl}),pt?d.jsx("a",{className:"mph-pill-b",href:pt,children:Ue}):d.jsx("span",{className:"mph-pill-b",tabIndex:0,children:Ue})]}),d.jsx("div",{className:"mph-flower","aria-hidden":"true",children:d.jsxs("svg",{viewBox:"0 0 120 120",children:[d.jsx("path",{d:y1}),d.jsx("circle",{cx:"60",cy:"60",r:"4",fill:"none",stroke:Lt,strokeWidth:"2"})]})}),d.jsx("ul",{className:"mph-services",children:tt.map(tl=>d.jsx("li",{children:tl},tl))}),d.jsxs("button",{ref:b,type:"button",className:"mph-char"+(J?" mph-happy":""),onClick:Q,"aria-label":"Say hi to the character",children:[d.jsxs("svg",{viewBox:"0 0 "+f1+" "+s1,"aria-hidden":"true",children:[d.jsxs("defs",{children:[d.jsxs("radialGradient",{id:_l("shade"),cx:"46%",cy:"40%",r:"62%",children:[d.jsx("stop",{offset:"0.55",stopColor:"#7a2e14",stopOpacity:"0"}),d.jsx("stop",{offset:"1",stopColor:"#7a2e14",stopOpacity:"0.34"})]}),d.jsxs("radialGradient",{id:_l("hi"),cx:"36%",cy:"30%",r:"42%",children:[d.jsx("stop",{offset:"0",stopColor:"#fff",stopOpacity:"0.55"}),d.jsx("stop",{offset:"1",stopColor:"#fff",stopOpacity:"0"})]}),d.jsxs("radialGradient",{id:_l("blush"),children:[d.jsx("stop",{offset:"0",stopColor:"#ff6f6f",stopOpacity:"0.55"}),d.jsx("stop",{offset:"1",stopColor:"#ff6f6f",stopOpacity:"0"})]}),d.jsxs("radialGradient",{id:_l("knit"),cx:"38%",cy:"22%",r:"80%",children:[d.jsx("stop",{offset:"0",stopColor:"#fff",stopOpacity:"0.2"}),d.jsx("stop",{offset:"0.6",stopColor:"#fff",stopOpacity:"0"}),d.jsx("stop",{offset:"1",stopColor:"#000",stopOpacity:"0.35"})]}),d.jsxs("radialGradient",{id:_l("eye"),cx:"40%",cy:"35%",r:"70%",children:[d.jsx("stop",{offset:"0",stopColor:"#3a3a3c"}),d.jsx("stop",{offset:"1",stopColor:"#050505"})]}),d.jsxs("radialGradient",{id:_l("nose"),cx:"42%",cy:"36%",r:"66%",children:[d.jsx("stop",{offset:"0",stopColor:"#ff9c82",stopOpacity:"0.18"}),d.jsx("stop",{offset:"1",stopColor:"#b8583a",stopOpacity:"0.42"})]}),d.jsxs("linearGradient",{id:_l("neck"),x1:"0",y1:"0",x2:"0",y2:"1",children:[d.jsx("stop",{offset:"0",stopColor:"#6b2a14",stopOpacity:"0.45"}),d.jsx("stop",{offset:"0.5",stopColor:"#6b2a14",stopOpacity:"0.08"})]}),d.jsxs("linearGradient",{id:_l("cloth"),x1:"0",y1:"0",x2:"0",y2:"1",children:[d.jsx("stop",{offset:"0",stopColor:"#fff",stopOpacity:"0.1"}),d.jsx("stop",{offset:"1",stopColor:"#000",stopOpacity:"0.3"})]}),d.jsxs("filter",{id:_l("fuzz"),x:"-5%",y:"-5%",width:"110%",height:"110%",children:[d.jsx("feTurbulence",{type:"fractalNoise",baseFrequency:"0.9",numOctaves:"2",seed:"4",result:"n"}),d.jsx("feDisplacementMap",{in:"SourceGraphic",in2:"n",scale:"4",xChannelSelector:"R",yChannelSelector:"G"})]}),d.jsx("clipPath",{id:_l("mouth"),children:d.jsx("path",{d:"M218 440 Q300 458 382 440 Q376 524 300 530 Q224 524 218 440 Z"})}),d.jsx("clipPath",{id:_l("cuff"),children:d.jsx("path",{d:"M114 262 Q300 222 486 262 L490 322 Q300 286 110 322 Z"})})]}),d.jsx("ellipse",{cx:"300",cy:"712",rx:"250",ry:"16",fill:"#000",opacity:"0.08"}),d.jsxs("g",{ref:N("body"),children:[d.jsx("path",{d:"M28 730 C40 646 104 604 206 588 L394 588 C496 604 560 646 572 730 Z",fill:Zl}),d.jsx("path",{d:"M28 730 C40 646 104 604 206 588 L394 588 C496 604 560 646 572 730 Z",fill:ml("cloth")}),d.jsx("path",{d:"M246 500 L354 500 L360 600 Q300 624 240 600 Z",fill:Xl}),d.jsx("path",{d:"M246 500 L354 500 L360 600 Q300 624 240 600 Z",fill:ml("neck")}),d.jsx("path",{d:"M236 566 Q262 604 300 628 L250 668 Q214 628 194 594 Z",fill:Zl}),d.jsx("path",{d:"M364 566 Q338 604 300 628 L350 668 Q386 628 406 594 Z",fill:Zl}),d.jsx("path",{d:"M236 566 Q262 604 300 628 L250 668 Q214 628 194 594 Z M364 566 Q338 604 300 628 L350 668 Q386 628 406 594 Z",fill:"#fff",opacity:"0.07",stroke:"#000",strokeOpacity:"0.4",strokeWidth:"2"}),d.jsx("rect",{x:"288",y:"628",width:"24",height:"102",fill:"#fff",opacity:"0.05",stroke:"#000",strokeOpacity:"0.35",strokeWidth:"2"}),d.jsx("circle",{cx:"300",cy:"656",r:"6",fill:"#2a2a2c",stroke:"#000",strokeOpacity:"0.5"}),d.jsx("circle",{cx:"300",cy:"698",r:"6",fill:"#2a2a2c",stroke:"#000",strokeOpacity:"0.5"})]}),d.jsxs("g",{ref:N("head"),children:[d.jsxs("g",{ref:N("earL"),children:[d.jsx("ellipse",{cx:"138",cy:"380",rx:"46",ry:"60",fill:Xl}),d.jsx("ellipse",{cx:"138",cy:"380",rx:"46",ry:"60",fill:ml("shade")}),d.jsx("path",{d:"M150 348 Q118 360 124 392 Q130 416 150 414",fill:"none",stroke:"#a24c2e",strokeOpacity:"0.35",strokeWidth:"7",strokeLinecap:"round"}),d.jsx("ellipse",{cx:"136",cy:"392",rx:"24",ry:"22",fill:ml("blush")})]}),d.jsxs("g",{ref:N("earR"),children:[d.jsx("ellipse",{cx:"462",cy:"380",rx:"46",ry:"60",fill:Xl}),d.jsx("ellipse",{cx:"462",cy:"380",rx:"46",ry:"60",fill:ml("shade")}),d.jsx("path",{d:"M450 348 Q482 360 476 392 Q470 416 450 414",fill:"none",stroke:"#a24c2e",strokeOpacity:"0.35",strokeWidth:"7",strokeLinecap:"round"}),d.jsx("ellipse",{cx:"464",cy:"392",rx:"24",ry:"22",fill:ml("blush")})]}),d.jsx("path",{d:"M300 150 C402 150 470 226 470 348 C470 472 396 562 300 562 C204 562 130 472 130 348 C130 226 198 150 300 150 Z",fill:Xl}),d.jsx("path",{d:"M300 150 C402 150 470 226 470 348 C470 472 396 562 300 562 C204 562 130 472 130 348 C130 226 198 150 300 150 Z",fill:ml("shade")}),d.jsx("path",{d:"M300 150 C402 150 470 226 470 348 C470 472 396 562 300 562 C204 562 130 472 130 348 C130 226 198 150 300 150 Z",fill:ml("hi")}),d.jsxs("g",{ref:N("blush"),children:[d.jsx("ellipse",{cx:"190",cy:"430",rx:J?50:44,ry:J?34:30,fill:ml("blush")}),d.jsx("ellipse",{cx:"410",cy:"430",rx:J?50:44,ry:J?34:30,fill:ml("blush")})]}),d.jsxs("g",{ref:N("face"),children:[d.jsxs("g",{ref:N("brows"),children:[d.jsx("path",{d:J?"M198 292 Q230 270 264 286":"M198 300 Q230 282 264 294",fill:"none",stroke:"#3b2518",strokeWidth:"22",strokeLinecap:"round"}),d.jsx("path",{d:J?"M336 286 Q370 270 402 292":"M336 294 Q370 282 402 300",fill:"none",stroke:"#3b2518",strokeWidth:"22",strokeLinecap:"round"})]}),d.jsx("g",{ref:N("eyes"),children:J?d.jsxs(d.Fragment,{children:[d.jsx("path",{d:"M214 356 Q240 324 266 356",fill:"none",stroke:"#111",strokeWidth:"13",strokeLinecap:"round"}),d.jsx("path",{d:"M334 356 Q360 324 386 356",fill:"none",stroke:"#111",strokeWidth:"13",strokeLinecap:"round"})]}):d.jsxs(d.Fragment,{children:[d.jsx("ellipse",{cx:"240",cy:"350",rx:"25",ry:"31",fill:ml("eye")}),d.jsx("circle",{cx:"231",cy:"336",r:"8.5",fill:"#fff"}),d.jsx("circle",{cx:"250",cy:"361",r:"3.5",fill:"#fff",opacity:"0.8"}),d.jsx("ellipse",{cx:"360",cy:"350",rx:"25",ry:"31",fill:ml("eye")}),d.jsx("circle",{cx:"351",cy:"336",r:"8.5",fill:"#fff"}),d.jsx("circle",{cx:"370",cy:"361",r:"3.5",fill:"#fff",opacity:"0.8"})]})}),d.jsx("path",{d:"M420 382 L423.5 391 L433 391.5 L425.6 397.5 L428.2 406.8 L420 401.5 L411.8 406.8 L414.4 397.5 L407 391.5 L416.5 391 Z",fill:"#2a1a14"}),d.jsxs("g",{transform:J?"translate(300 440) scale(1.06 1.12) translate(-300 -440)":void 0,children:[d.jsx("path",{d:"M218 440 Q300 458 382 440 Q376 524 300 530 Q224 524 218 440 Z",fill:"#3d0f0f"}),d.jsxs("g",{clipPath:ml("mouth"),children:[d.jsx("ellipse",{cx:"300",cy:"530",rx:"46",ry:"22",fill:"#d9575a"}),d.jsx("path",{d:"M210 436 Q300 456 390 436 L390 474 Q300 490 210 474 Z",fill:"#fff"}),d.jsx("path",{d:"M236 516 Q300 500 364 516 L364 540 L236 540 Z",fill:"#f3efe9"}),d.jsx("path",{d:"M262 452 V484 M300 456 V488 M338 452 V484",stroke:"#000",strokeOpacity:"0.08",strokeWidth:"2"})]}),d.jsx("path",{d:"M218 440 Q300 458 382 440 Q376 524 300 530 Q224 524 218 440 Z",fill:"none",stroke:"#8a3524",strokeOpacity:"0.45",strokeWidth:"3"}),d.jsx("path",{d:"M208 432 Q212 442 220 446 M392 432 Q388 442 380 446",fill:"none",stroke:"#a24c2e",strokeOpacity:"0.4",strokeWidth:"4",strokeLinecap:"round"})]}),d.jsxs("g",{ref:N("nose"),children:[d.jsx("ellipse",{cx:"300",cy:"414",rx:"28",ry:"12",fill:"#6b2a14",opacity:"0.14"}),d.jsx("ellipse",{cx:"300",cy:"398",rx:"29",ry:"26",fill:Xl}),d.jsx("ellipse",{cx:"300",cy:"398",rx:"29",ry:"26",fill:ml("nose")}),d.jsx("ellipse",{cx:"291",cy:"387",rx:"10",ry:"8",fill:"#fff",opacity:"0.45"})]})]}),d.jsx("g",{ref:N("beanie"),children:d.jsxs("g",{transform:"translate(0 -22)",children:[d.jsxs("g",{filter:ml("fuzz"),children:[d.jsx("path",{d:"M126 300 C112 168 196 88 300 88 C404 88 488 168 474 300 Z",fill:P}),d.jsx("path",{d:"M126 300 C112 168 196 88 300 88 C404 88 488 168 474 300 Z",fill:ml("knit")}),d.jsx("path",{d:"M114 262 Q300 222 486 262 L490 322 Q300 286 110 322 Z",fill:P}),d.jsx("g",{clipPath:ml("cuff"),stroke:"#fff",strokeOpacity:"0.08",strokeWidth:"5",children:Array.from({length:34},(tl,Tl)=>d.jsx("line",{x1:112+Tl*11.4,y1:"220",x2:112+Tl*11.4,y2:"330"},Tl))}),d.jsx("path",{d:"M114 262 Q300 222 486 262 L490 322 Q300 286 110 322 Z",fill:"#000",opacity:"0.18"}),d.jsx("path",{d:"M112 292 Q300 254 488 292",fill:"none",stroke:"#000",strokeOpacity:"0.25",strokeWidth:"3"})]}),d.jsx("g",{ref:N("tag"),children:d.jsx("g",{className:"mph-tagwig",children:d.jsxs("g",{transform:"rotate(-7 190 272)",children:[d.jsx("rect",{x:"172",y:"238",width:"36",height:"64",rx:"5",fill:Fl}),d.jsx("rect",{x:"172",y:"238",width:"36",height:"64",rx:"5",fill:ml("cloth")}),d.jsx("rect",{x:"177",y:"243",width:"26",height:"54",rx:"3",fill:"none",stroke:"#fff",strokeOpacity:"0.5",strokeWidth:"1.6",strokeDasharray:"3 3"})]})})})]})})]})]}),d.jsx("span",{className:"mph-bubble","data-on":J?"true":"false","aria-live":"polite",children:Ht})]})]})]})}

export default MascotPortfolioHero;
