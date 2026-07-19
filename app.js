/* ============================================================
   My Journey — TomTom — combined app.js
   Everything the site needs lives here now (background story-scroll,
   embedded zebra model data, zebra mascot, sparkle cursor trail, journey
   track, gallery, edit mode, etc). Previously this was split across
   parallax.js / model_data.js / zebra.js / app.js — merged into one file
   so there's no risk of a renamed/mismatched filename causing a silent
   404 and breaking the background or the mascot.
============================================================ */

/* ============================================================
   STORY BACKGROUND — sequential "pop then recede" scenery
   5 full-bleed illustrated scenes (sky, mountains+waterfall, forest, rumah,
   foreground grass) sit stacked behind the hero + #journeyTrack section,
   each covering the ENTIRE viewport (object-fit:cover — never a gap).
   The scroll range is split into 4 equal stretches, one per transition.
   Within each stretch:
     - the CURRENT scene sits still and sharp at first, then — scrubbed
       1:1 with the scroll position — starts shrinking, dimming and
       drifting back as if pushed away into the screen;
     - partway through that same stretch, the NEXT scene pops in already
       fully sharp/opaque (a quick eased "arrival", not a slow fade) and
       covers it, so what you see next is always crisp from the start.
   Sky is a plain rectangle with no soft transparent edge, so it recedes
   via blur + fade only (no scale/drift) — that hides its hard corners
   instead of showing off a shrinking box.
   Two more subtle motions ride on top, on a separate inner wrapper so they
   never fight the pop/recede transition:
     - ambient idle drift: a slow, continuous sway, everywhere on the page
     - mouse parallax: nearer/foreground-ish layers drift a bit more than
       far ones as the cursor moves (desktop only)
   Past the journey track the whole scene dims down to a soft minimum
   instead of disappearing outright. A small canvas of drifting, glowing
   "firefly" particles sits on top for extra life. UNTUK KE MODE EDIT WEB TAMBAHIN INI "?edit=MNDAJOURNEY"
============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var scene = document.getElementById("pxScene");
  var fireflyCanvas = document.getElementById("pxFireflies");
  var layerEls = Array.prototype.slice.call(document.querySelectorAll(".px-layer"));
  if (!scene || !layerEls.length) return;

  var layers = layerEls.map(function (el) {
    return {
      el: el,
      driftEl: el.querySelector(".px-layer-drift"),
      mouseAmt: parseFloat(el.getAttribute("data-mouse")) || 10,
      driftAmp: parseFloat(el.getAttribute("data-depth")) || 0.2,
      // flat = no hard-edged full-bleed photo underneath — only the sky
      // qualifies (a plain rectangle with no soft edge), so it only ever
      // blurs+fades, never scales/translates. Everything else, including the
      // school scenes, gets the full cinematic pop+recede treatment; their
      // background glow is built as a soft vignette (see CSS) specifically so
      // it can shrink along with the rest of the scene without ever showing
      // a hard rectangular edge.
      flat: el.id === "pxSky",
      scrubbing: null,          // last-known px-scrub state, to avoid needless class churn
      mouseX: 0, mouseY: 0, driftX: 0, driftY: 0
    };
  });
  var segments = Math.max(1, layers.length - 1);
  var POP_POINT = 0.34; // fraction of a stretch the current scene recedes alone before the next pops in

  function setScrub(L, on) {
    if (L.scrubbing === on) return;
    L.scrubbing = on;
    L.el.classList.toggle("px-scrub", on);
  }
  function setBase(L, opacity, scale, ty, filterB, blur) {
    L.el.style.opacity = opacity.toFixed(3);
    L.el.style.transform = "scale(" + scale.toFixed(3) + ") translateY(" + ty.toFixed(1) + "px)";
    L.el.style.filter = "brightness(" + filterB.toFixed(2) + ") saturate(1.05) blur(" + blur.toFixed(1) + "px)";
  }
  function paintDrift() {
    layers.forEach(function (L) {
      if (!L.driftEl) return;
      L.driftEl.style.transform = "translate(" + (L.driftX || 0).toFixed(1) + "px," + (L.driftY || 0).toFixed(1) + "px)";
    });
  }

  /* ---------- scroll-driven pop + recede (smoothed) ---------- */
  var journeyEl = document.getElementById("journeyTrack");
  var heroEl = document.querySelector(".hero");
  var footerEl = document.querySelector("footer");
  var rangeStart = 0, rangeEnd = 1000;

  function measure() {
    var startY = heroEl ? heroEl.offsetTop : 0;
    // Spread all 9 scenes across the WHOLE page (hero all the way down to the
    // footer), not just the journey-track chapters — with 9 layers now instead
    // of 5, cramming every pop+recede into just the chapters made the sequence
    // run out around the halfway point, leaving the rest of the page stuck on
    // one static scene. Ending at the footer keeps a scene transitioning in
    // right up to the bottom of the page.
    var endEl = footerEl || journeyEl || heroEl;
    var endY = endEl ? (endEl.offsetTop + endEl.offsetHeight) : (startY + window.innerHeight);
    rangeStart = startY;
    rangeEnd = Math.max(endY - window.innerHeight, startY + 1);
  }

  function rawProgress() {
    var y = window.scrollY || window.pageYOffset || 0;
    var p = (y - rangeStart) / (rangeEnd - rangeStart);
    return Math.max(0, Math.min(1, p));
  }

  function applyLayers(progress, y) {
    var scaled = progress * segments;
    var seg = Math.min(segments - 1, Math.floor(scaled));
    if (progress <= 0) seg = 0;
    if (progress >= 1) seg = segments - 1;
    var localT = Math.max(0, Math.min(1, scaled - seg));
    if (progress >= 1) localT = 1;
    var popped = localT >= POP_POINT || reduceMotion;
    // how far the current scene has receded within its own stretch (0 = still, 1 = fully receded)
    var R = localT;

    layers.forEach(function (L, i) {
      if (i < seg) {
        // long since covered by later pops — parked fully receded, no transition needed
        setScrub(L, false);
        if (L.flat) setBase(L, 0, 1, 0, 0.32, 10);
        else setBase(L, 0, 0.3, -45, 0.32, 0);
      } else if (i === seg) {
        // the active scene for this stretch: scrubbed smoothly with (lerped) scroll
        setScrub(L, !reduceMotion);
        if (L.flat) {
          // sky + school scenes: blur + fade only, never scaled/moved (hides the hard rectangular edge)
          setBase(L, Math.max(0, 1 - R * 0.85), 1, 0, Math.max(0.4, 1 - R * 0.4), Math.min(10, R * 10));
        } else {
          setBase(L, Math.max(0.15, 1 - R * 0.55), Math.max(0.55, 1 - R * 0.45), -R * 130, Math.max(0.4, 1 - R * 0.45), 0);
        }
      } else if (i === seg + 1) {
        // the next scene: hidden + waiting, then pops to fully sharp/opaque
        setScrub(L, false);
        if (popped) setBase(L, 1, 1, 0, 1, 0);
        else setBase(L, 0, 1.04, 18, 0.8, 0);
      } else {
        // further ahead, not relevant yet
        setScrub(L, false);
        setBase(L, 0, 1.04, 18, 0.8, 0);
      }
    });

    // The scroll range now reaches all the way to the footer (see measure()),
    // so the last scene (foreground) is still actively "current" right up to
    // the bottom of the page — it should stay fully visible there, not dim out.
    scene.classList.remove("px-hide");
    scene.style.opacity = "1";
  }

  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  setTimeout(measure, 600);
  measure();

  /* ---------- ONE continuous master loop ----------
     Everything — scroll-linked recede, ambient sway, mouse parallax — is
     driven from a single requestAnimationFrame loop instead of separate
     scroll/mousemove handlers each scheduling their own frame. The scroll
     progress itself is EASED (lerped) toward its real position every frame,
     which is what makes the recede motion buttery smooth: it now updates a
     consistent ~60 times a second no matter how "chunky" the raw wheel/
     trackpad scroll events are, instead of jumping only when a scroll event
     fires. Reduced-motion snaps instantly with no easing anywhere. */
  var progressCur = rawProgress();
  var driftStart = (window.performance && performance.now) ? performance.now() : Date.now();
  var targetMX = 0, targetMY = 0, curMX = 0, curMY = 0;
  var loopRunning = true;

  if (!reduceMotion && window.matchMedia && window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
    window.addEventListener("mousemove", function (e) {
      targetMX = (e.clientX / window.innerWidth) - 0.5;   // -0.5..0.5
      targetMY = (e.clientY / window.innerHeight) - 0.5;
    }, { passive: true });
  }

  function masterLoop(now) {
    if (!loopRunning) return;

    var y = window.scrollY || window.pageYOffset || 0;
    var target = rawProgress();
    if (reduceMotion) {
      progressCur = target;
    } else {
      progressCur += (target - progressCur) * 0.12;
      if (Math.abs(target - progressCur) < 0.0006) progressCur = target;
    }
    applyLayers(progressCur, y);

    if (!reduceMotion) {
      var t = (now - driftStart) / 1000;
      curMX += (targetMX - curMX) * 0.06;
      curMY += (targetMY - curMY) * 0.06;
      layers.forEach(function (L) {
        var amp = 4 + L.driftAmp * 10; // px — subtle for sky, a bit more for foreground
        L.driftX = Math.sin(t * 0.12 + L.driftAmp * 9) * amp - curMX * L.mouseAmt;
        L.driftY = Math.cos(t * 0.09 + L.driftAmp * 5) * amp * 0.35 - curMY * L.mouseAmt * 0.5;
      });
      paintDrift();
    }

    requestAnimationFrame(masterLoop);
  }
  requestAnimationFrame(masterLoop);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { loopRunning = false; }
    else if (!loopRunning) { loopRunning = true; requestAnimationFrame(masterLoop); }
  });

  /* ---------- firefly particles drifting over the artwork ---------- */
  if (reduceMotion || !fireflyCanvas) return;

  var fctx = fireflyCanvas.getContext("2d");
  var FW, FH, FDPR;
  var flies = [];

  function resizeFireflies() {
    FDPR = Math.min(window.devicePixelRatio || 1, 2);
    FW = window.innerWidth; FH = window.innerHeight;
    fireflyCanvas.width = FW * FDPR; fireflyCanvas.height = FH * FDPR;
    fireflyCanvas.style.width = FW + "px"; fireflyCanvas.style.height = FH + "px";
    fctx.setTransform(FDPR, 0, 0, FDPR, 0, 0);
    buildFireflies();
  }

  function buildFireflies() {
    var count = Math.max(10, Math.min(Math.floor((FW * FH) / 42000), 26));
    flies = [];
    for (var i = 0; i < count; i++) {
      flies.push({
        x: Math.random() * FW,
        y: Math.random() * FH,
        r: Math.random() * 1.6 + 0.9,
        driftX: (Math.random() - 0.5) * 0.25,
        driftY: -Math.random() * 0.22 - 0.05,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.6 + 0.3,
        tw: Math.random() * Math.PI * 2,
        twSpeed: Math.random() * 0.8 + 0.4,
        hue: Math.random() > 0.55 ? "232,185,77" : "63,224,197"
      });
    }
  }

  var ft = 0;
  function drawFireflies() {
    ft += 0.016;
    fctx.clearRect(0, 0, FW, FH);

    // only worth drawing while the artwork is at least partly visible
    if (parseFloat(scene.style.opacity || "1") > 0.02) {
      for (var i = 0; i < flies.length; i++) {
        var f = flies[i];
        f.x += f.driftX + Math.sin(ft * f.swaySpeed + f.sway) * 0.15;
        f.y += f.driftY;
        if (f.y < -10) { f.y = FH + 10; f.x = Math.random() * FW; }
        if (f.x < -10) f.x = FW + 10;
        if (f.x > FW + 10) f.x = -10;

        var alpha = 0.35 + 0.45 * Math.sin(ft * f.twSpeed + f.tw);
        alpha = Math.max(0.1, alpha);

        var grad = fctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 5);
        grad.addColorStop(0, "rgba(" + f.hue + "," + alpha.toFixed(2) + ")");
        grad.addColorStop(1, "rgba(" + f.hue + ",0)");
        fctx.beginPath();
        fctx.fillStyle = grad;
        fctx.arc(f.x, f.y, f.r * 5, 0, Math.PI * 2);
        fctx.fill();
      }
    }

    requestAnimationFrame(drawFireflies);
  }

  resizeFireflies();
  window.addEventListener("resize", resizeFireflies);
  drawFireflies();
})();


window.ZEBRA_GLTF_JSON = "{\"asset\":{\"version\":\"2.0\",\"generator\":\"Blockbench 4.9.4 glTF exporter\"},\"scenes\":[{\"nodes\":[27],\"name\":\"blockbench_export\"}],\"scene\":0,\"nodes\":[{\"translation\":[0,-0.75,-0.5625],\"name\":\"Body\",\"mesh\":0},{\"translation\":[0,-1.1875,-0.6875],\"name\":\"Tail\",\"mesh\":1},{\"rotation\":[-0.21643961393810288,0,0,0.9762960071199334],\"translation\":[0,0.4375,0.125],\"name\":\"Tail\",\"children\":[1]},{\"translation\":[0.1875,-0.625,-0.5625],\"name\":\"LegBL\",\"mesh\":2},{\"translation\":[-0.1875,-0.125,0],\"name\":\"LegBL\",\"children\":[3]},{\"translation\":[-0.1875,-0.625,-0.5625],\"name\":\"LegBR\",\"mesh\":3},{\"translation\":[0.1875,-0.125,0],\"name\":\"LegBR\",\"children\":[5]},{\"translation\":[0.1875,-0.625,0.5625],\"name\":\"LegFL\",\"mesh\":4},{\"translation\":[-0.1875,-0.125,-1.125],\"name\":\"LegFL\",\"children\":[7]},{\"translation\":[-0.1875,-0.625,0.5625],\"name\":\"LegFR\",\"mesh\":5},{\"translation\":[0.1875,-0.125,-1.125],\"name\":\"LegFR\",\"children\":[9]},{\"translation\":[0,-1,0.5],\"name\":\"Neck\",\"mesh\":6},{\"scale\":[0.030252100840336135,0.030252100840336135,0.030252100840336135],\"name\":\"lead\"},{\"name\":\"lead\",\"children\":[12]},{\"translation\":[0,-1.6875,0.6875],\"name\":\"Head\",\"mesh\":7},{\"translation\":[0,-1.6875,0.6875],\"name\":\"Muzzle\",\"mesh\":8},{\"name\":\"Muzzle\",\"children\":[15]},{\"translation\":[0,-1,0.5],\"name\":\"MuleEarL\",\"mesh\":9},{\"rotation\":[0,0,0.13052619222005157,0.9914448613738104],\"translation\":[0,-0.6875,0.1875],\"name\":\"MuleEarL\",\"children\":[17]},{\"translation\":[0,-1,0.5],\"name\":\"MuleEarR\",\"mesh\":10},{\"translation\":[0,-1,0.5],\"name\":\"MuleEarR\",\"mesh\":11},{\"rotation\":[0,0,-0.13052619222005157,0.9914448613738104],\"translation\":[0,-0.6875,0.1875],\"name\":\"MuleEarR\",\"children\":[19,20]},{\"translation\":[0,0.6875,-0.1875],\"name\":\"Head\",\"children\":[14,16,18,21]},{\"translation\":[0,-1,0.5],\"name\":\"Mane\",\"mesh\":12},{\"name\":\"Mane\",\"children\":[23]},{\"rotation\":[-0.17364817766693033,0,0,0.984807753012208],\"translation\":[0,0.25,-1.0625],\"name\":\"Neck\",\"children\":[11,13,22,24]},{\"translation\":[0,0.75,0.5625],\"name\":\"ZEBRA\",\"children\":[0,2,4,6,8,10,25]},{\"children\":[26]}],\"bufferViews\":[{\"buffer\":0,\"byteOffset\":0,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":288,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":576,\"byteLength\":192,\"target\":34962,\"byteStride\":8},{\"buffer\":0,\"byteOffset\":768,\"byteLength\":72,\"target\":34963},{\"buffer\":0,\"byteOffset\":840,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":1128,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":1416,\"byteLength\":192,\"target\":34962,\"byteStride\":8},{\"buffer\":0,\"byteOffset\":1608,\"byteLength\":72,\"target\":34963},{\"buffer\":0,\"byteOffset\":1680,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":1968,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":2256,\"byteLength\":192,\"target\":34962,\"byteStride\":8},{\"buffer\":0,\"byteOffset\":2448,\"byteLength\":72,\"target\":34963},{\"buffer\":0,\"byteOffset\":2520,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":2808,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":3096,\"byteLength\":192,\"target\":34962,\"byteStride\":8},{\"buffer\":0,\"byteOffset\":3288,\"byteLength\":72,\"target\":34963},{\"buffer\":0,\"byteOffset\":3360,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":3648,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":3936,\"byteLength\":192,\"target\":34962,\"byteStride\":8},{\"buffer\":0,\"byteOffset\":4128,\"byteLength\":72,\"target\":34963},{\"buffer\":0,\"byteOffset\":4200,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":4488,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":4776,\"byteLength\":192,\"target\":34962,\"byteStride\":8},{\"buffer\":0,\"byteOffset\":4968,\"byteLength\":72,\"target\":34963},{\"buffer\":0,\"byteOffset\":5040,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":5328,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":5616,\"byteLength\":192,\"target\":34962,\"byteStride\":8},{\"buffer\":0,\"byteOffset\":5808,\"byteLength\":72,\"target\":34963},{\"buffer\":0,\"byteOffset\":5880,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":6168,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":6456,\"byteLength\":192,\"target\":34962,\"byteStride\":8},{\"buffer\":0,\"byteOffset\":6648,\"byteLength\":72,\"target\":34963},{\"buffer\":0,\"byteOffset\":6720,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":7008,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":7296,\"byteLength\":192,\"target\":34962,\"byteStride\":8},{\"buffer\":0,\"byteOffset\":7488,\"byteLength\":72,\"target\":34963},{\"buffer\":0,\"byteOffset\":7560,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":7848,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":8136,\"byteLength\":192,\"target\":34962,\"byteStride\":8},{\"buffer\":0,\"byteOffset\":8328,\"byteLength\":72,\"target\":34963},{\"buffer\":0,\"byteOffset\":8400,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":8688,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":8976,\"byteLength\":192,\"target\":34962,\"byteStride\":8},{\"buffer\":0,\"byteOffset\":9168,\"byteLength\":72,\"target\":34963},{\"buffer\":0,\"byteOffset\":9240,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":9528,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":9816,\"byteLength\":192,\"target\":34962,\"byteStride\":8},{\"buffer\":0,\"byteOffset\":10008,\"byteLength\":72,\"target\":34963},{\"buffer\":0,\"byteOffset\":10080,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":10368,\"byteLength\":288,\"target\":34962,\"byteStride\":12},{\"buffer\":0,\"byteOffset\":10656,\"byteLength\":192,\"target\":34962,\"byteStride\":8},{\"buffer\":0,\"byteOffset\":10848,\"byteLength\":72,\"target\":34963}],\"buffers\":[{\"byteLength\":10920,\"uri\":\"data:application/octet-stream;base64,AACgPgAAoD8AADA/AACgPgAAoD8AADC/AACgPgAAID8AADA/AACgPgAAID8AADC/AACgvgAAoD8AADC/AACgvgAAoD8AADA/AACgvgAAID8AADC/AACgvgAAID8AADA/AACgvgAAoD8AADC/AACgPgAAoD8AADC/AACgvgAAoD8AADA/AACgPgAAoD8AADA/AACgvgAAID8AADA/AACgPgAAID8AADA/AACgvgAAID8AADC/AACgPgAAID8AADC/AACgvgAAoD8AADA/AACgPgAAoD8AADA/AACgvgAAID8AADA/AACgPgAAID8AADA/AACgPgAAoD8AADC/AACgvgAAoD8AADC/AACgPgAAID8AADC/AACgvgAAID8AADC/AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AACAOQAgsD4A4K8+ACCwPgAAgDkA4P8+AOCvPgDg/z4AEAA/ACCwPgDwVz8AILA+ABAAPwDg/z4A8Fc/AOD/PgDg/z4A4K8+ACCwPgDgrz4A4P8+AACAOQAgsD4AAIA5APAnPwAAgDkAEAA/AACAOQDwJz8A4K8+ABAAPwDgrz4AEFg/ACCwPgDwfz8AILA+ABBYPwDg/z4A8H8/AOD/PgAgsD4AILA+AOD/PgAgsD4AILA+AOD/PgDg/z4A4P8+AAACAAEAAgADAAEABAAGAAUABgAHAAUACAAKAAkACgALAAkADAAOAA0ADgAPAA0AEAASABEAEgATABEAFAAWABUAFgAXABUAAADAPQAAmD8AAFA/AADAPQAAmD8AABA/AADAPQAAoD4AAFA/AADAPQAAoD4AABA/AADAvQAAmD8AABA/AADAvQAAmD8AAFA/AADAvQAAoD4AABA/AADAvQAAoD4AAFA/AADAvQAAmD8AABA/AADAPQAAmD8AABA/AADAvQAAmD8AAFA/AADAPQAAmD8AAFA/AADAvQAAoD4AAFA/AADAPQAAoD4AAFA/AADAvQAAoD4AABA/AADAPQAAoD4AABA/AADAvQAAmD8AAFA/AADAPQAAmD8AAFA/AADAvQAAoD4AAFA/AADAPQAAoD4AAFA/AADAPQAAmD8AABA/AADAvQAAmD8AABA/AADAPQAAoD4AABA/AADAvQAAoD4AABA/AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/ACDQPgAQED8A4O8+ABAQPwAg0D4A8Ec/AODvPgDwRz8AEAQ/ABAQPwDwEz8AEBA/ABAEPwDwRz8A8BM/APBHPwDwAz8A8A8/ACDwPgDwDz8A8AM/ABAAPwAg8D4AEAA/APAPPwAQAD8AEAQ/ABAAPwDwDz8A8A8/ABAEPwDwDz8AEBQ/ABAQPwDwHz8AEBA/ABAUPwDwRz8A8B8/APBHPwAg8D4AEBA/APADPwAQED8AIPA+APBHPwDwAz8A8Ec/AAACAAEAAgADAAEABAAGAAUABgAHAAUACAAKAAkACgALAAkADAAOAA0ADgAPAA0AEAASABEAEgATABEAFAAWABUAFgAXABUAAACAvQAAID8AADA/AACAvQAAID8AAOA+AACAvQAAAAAAADA/AACAvQAAAAAAAOA+AACgvgAAID8AAOA+AACgvgAAID8AADA/AACgvgAAAAAAAOA+AACgvgAAAAAAADA/AACgvgAAID8AAOA+AACAvQAAID8AAOA+AACgvgAAID8AADA/AACAvQAAID8AADA/AACgvgAAAAAAADA/AACAvQAAAAAAADA/AACgvgAAAAAAAOA+AACAvQAAAAAAAOA+AACgvgAAID8AADA/AACAvQAAID8AADA/AACgvgAAAAAAADA/AACAvQAAAAAAADA/AACAvQAAID8AAOA+AACgvgAAID8AAOA+AACAvQAAAAAAAOA+AACgvgAAAAAAAOA+AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/ABAQPwAQSD8A8B8/ABBIPwAQED8A8G8/APAfPwDwbz8AEDA/ABBIPwDwPz8AEEg/ABAwPwDwbz8A8D8/APBvPwDwLz8A8Ec/ABAgPwDwRz8A8C8/ABA4PwAQID8AEDg/APA/PwAQOD8AEDA/ABA4PwDwPz8A8Ec/ABAwPwDwRz8AEEA/ABBIPwDwTz8AEEg/ABBAPwDwbz8A8E8/APBvPwAQID8AEEg/APAvPwAQSD8AECA/APBvPwDwLz8A8G8/AAACAAEAAgADAAEABAAGAAUABgAHAAUACAAKAAkACgALAAkADAAOAA0ADgAPAA0AEAASABEAEgATABEAFAAWABUAFgAXABUAAACgPgAAID8AADA/AACgPgAAID8AAOA+AACgPgAAAAAAADA/AACgPgAAAAAAAOA+AACAPQAAID8AAOA+AACAPQAAID8AADA/AACAPQAAAAAAAOA+AACAPQAAAAAAADA/AACAPQAAID8AAOA+AACgPgAAID8AAOA+AACAPQAAID8AADA/AACgPgAAID8AADA/AACAPQAAAAAAADA/AACgPgAAAAAAADA/AACAPQAAAAAAAOA+AACgPgAAAAAAAOA+AACAPQAAID8AADA/AACgPgAAID8AADA/AACAPQAAAAAAADA/AACgPgAAAAAAADA/AACgPgAAID8AAOA+AACAPQAAID8AAOA+AACgPgAAAAAAAOA+AACAPQAAAAAAAOA+AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AACAOQAQQD8AAH89ABBAPwAAgDkA8Gc/AAB/PQDwZz8AQAA+ABBAPwDAPz4AEEA/AEAAPgDwZz8AwD8+APBnPwCA/z0A8D8/AICAPQDwPz8AgP89ABAwPwCAgD0AEDA/AMA/PgAQMD8AQAA+ABAwPwDAPz4A8D8/AEAAPgDwPz8AQEA+ABBAPwDAfz4AEEA/AEBAPgDwZz8AwH8+APBnPwCAgD0AEEA/AID/PQAQQD8AgIA9APBnPwCA/z0A8Gc/AAACAAEAAgADAAEABAAGAAUABgAHAAUACAAKAAkACgALAAkADAAOAA0ADgAPAA0AEAASABEAEgATABEAFAAWABUAFgAXABUAAACAvQAAID8AAOC+AACAvQAAID8AADC/AACAvQAAAAAAAOC+AACAvQAAAAAAADC/AACgvgAAID8AADC/AACgvgAAID8AAOC+AACgvgAAAAAAADC/AACgvgAAAAAAAOC+AACgvgAAID8AADC/AACAvQAAID8AADC/AACgvgAAID8AAOC+AACAvQAAID8AAOC+AACgvgAAAAAAAOC+AACAvQAAAAAAAOC+AACgvgAAAAAAADC/AACAvQAAAAAAADC/AACgvgAAID8AAOC+AACAvQAAID8AAOC+AACgvgAAAAAAAOC+AACAvQAAAAAAAOC+AACAvQAAID8AADC/AACgvgAAID8AADC/AACAvQAAAAAAADC/AACgvgAAAAAAADC/AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/ABAoPwCAgD0A8Dc/AICAPQAQKD8AwF8+APA3PwDAXz4AEEg/AICAPQDwVz8AgIA9ABBIPwDAXz4A8Fc/AMBfPgDwRz8AAH89ABA4PwAAfz0A8Ec/AACAOQAQOD8AAIA5APBXPwAAgDkAEEg/AACAOQDwVz8AAH89ABBIPwAAfz0AEFg/AICAPQDwZz8AgIA9ABBYPwDAXz4A8Gc/AMBfPgAQOD8AgIA9APBHPwCAgD0AEDg/AMBfPgDwRz8AwF8+AAACAAEAAgADAAEABAAGAAUABgAHAAUACAAKAAkACgALAAkADAAOAA0ADgAPAA0AEAASABEAEgATABEAFAAWABUAFgAXABUAAACgPgAAID8AAOC+AACgPgAAID8AADC/AACgPgAAAAAAAOC+AACgPgAAAAAAADC/AACAPQAAID8AADC/AACAPQAAID8AAOC+AACAPQAAAAAAADC/AACAPQAAAAAAAOC+AACAPQAAID8AADC/AACgPgAAID8AADC/AACAPQAAID8AAOC+AACgPgAAID8AAOC+AACAPQAAAAAAAOC+AACgPgAAAAAAAOC+AACAPQAAAAAAADC/AACgPgAAAAAAADC/AACAPQAAID8AAOC+AACgPgAAID8AAOC+AACAPQAAAAAAAOC+AACgPgAAAAAAAOC+AACgPgAAID8AADC/AACAPQAAID8AADC/AACgPgAAAAAAADC/AACAPQAAAAAAADC/AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/ABAgPwAQED8A8C8/ABAQPwAQID8A8Dc/APAvPwDwNz8AEEA/ABAQPwDwTz8AEBA/ABBAPwDwNz8A8E8/APA3PwDwPz8A8A8/ABAwPwDwDz8A8D8/ABAAPwAQMD8AEAA/APBPPwAQAD8AEEA/ABAAPwDwTz8A8A8/ABBAPwDwDz8AEFA/ABAQPwDwXz8AEBA/ABBQPwDwNz8A8F8/APA3PwAQMD8AEBA/APA/PwAQED8AEDA/APA3PwDwPz8A8Dc/AAACAAEAAgADAAEABAAGAAUABgAHAAUACAAKAAkACgALAAkADAAOAA0ADgAPAA0AEAASABEAEgATABEAFAAWABUAFgAXABUAAAAAPgAA2D8AAIC+AAAAPgAA2D8AADC/AAAAPgAAcD8AAIC+AAAAPgAAcD8AADC/AAAAvgAA2D8AADC/AAAAvgAA2D8AAIC+AAAAvgAAcD8AADC/AAAAvgAAcD8AAIC+AAAAvgAA2D8AADC/AAAAPgAA2D8AADC/AAAAvgAA2D8AAIC+AAAAPgAA2D8AAIC+AAAAvgAAcD8AAIC+AAAAPgAAcD8AAIC+AAAAvgAAcD8AADC/AAAAPgAAcD8AADC/AAAAvgAA2D8AAIC+AAAAPgAA2D8AAIC+AAAAvgAAcD8AAIC+AAAAPgAAcD8AAIC+AAAAPgAA2D8AADC/AAAAvgAA2D8AADC/AAAAPgAAcD8AADC/AAAAvgAAcD8AADC/AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AACAOQCA4D0AgN89AIDgPQAAgDkA4Jc+AIDfPQDglz4AQDA+AIDgPQDgjz4AgOA9AEAwPgDglz4A4I8+AOCXPgDALz4AgN89AIDgPQCA3z0AwC8+AACAOQCA4D0AAIA5AMBvPgAAgDkAQDA+AACAOQDAbz4AgN89AEAwPgCA3z0AIJA+AIDgPQDgrz4AgOA9ACCQPgDglz4A4K8+AOCXPgCA4D0AgOA9AMAvPgCA4D0AgOA9AOCXPgDALz4A4Jc+AAACAAEAAgADAAEABAAGAAUABgAHAAUACAAKAAkACgALAAkADAAOAA0ADgAPAA0AEAASABEAEgATABEAFAAWABUAFgAXABUAAABAPgAAAEAAAIC+AABAPgAAAEAAADC/AABAPgAA2D8AAIC+AABAPgAA2D8AADC/AABAvgAAAEAAADC/AABAvgAAAEAAAIC+AABAvgAA2D8AADC/AABAvgAA2D8AAIC+AABAvgAAAEAAADC/AABAPgAAAEAAADC/AABAvgAAAEAAAIC+AABAPgAAAEAAAIC+AABAvgAA2D8AAIC+AABAPgAA2D8AAIC+AABAvgAA2D8AADC/AABAPgAA2D8AADC/AABAvgAAAEAAAIC+AABAPgAAAEAAAIC+AABAvgAA2D8AAIC+AABAPgAA2D8AAIC+AABAPgAAAEAAADC/AABAvgAAAEAAADC/AABAPgAA2D8AADC/AABAvgAA2D8AADC/AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AACAOQAQHD8AgN89ABAcPwAAgDkA8C8/AIDfPQDwLz8AQFA+ABAcPwDgnz4AEBw/AEBQPgDwLz8A4J8+APAvPwDATz4A8Bs/AIDgPQDwGz8AwE8+ABAAPwCA4D0AEAA/AOCXPgAQAD8AQFA+ABAAPwDglz4A8Bs/AEBQPgDwGz8AIKA+ABAcPwDgzz4AEBw/ACCgPgDwLz8A4M8+APAvPwCA4D0AEBw/AMBPPgAQHD8AgOA9APAvPwDATz4A8C8/AAACAAEAAgADAAEABAAGAAUABgAHAAUACAAKAAkACgALAAkADAAOAA0ADgAPAA0AEAASABEAEgATABEAFAAWABUAFgAXABUAAAAAPgAAAEAAADC/AAAAPgAAAEAAAIC/AAAAPgAA2D8AADC/AAAAPgAA2D8AAIC/AAAAvgAAAEAAAIC/AAAAvgAAAEAAADC/AAAAvgAA2D8AAIC/AAAAvgAA2D8AADC/AAAAvgAAAEAAAIC/AAAAPgAAAEAAAIC/AAAAvgAAAEAAADC/AAAAPgAAAEAAADC/AAAAvgAA2D8AADC/AAAAPgAA2D8AADC/AAAAvgAA2D8AAIC/AAAAPgAA2D8AAIC/AAAAvgAAAEAAADC/AAAAPgAAAEAAADC/AAAAvgAA2D8AADC/AAAAPgAA2D8AADC/AAAAPgAAAEAAAIC/AAAAvgAAAEAAAIC/AAAAPgAA2D8AAIC/AAAAvgAA2D8AAIC/AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAA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\"}],\"accessors\":[{\"bufferView\":0,\"componentType\":5126,\"count\":24,\"max\":[0.3125,1.25,0.6875],\"min\":[-0.3125,0.625,-0.6875],\"type\":\"VEC3\"},{\"bufferView\":1,\"componentType\":5126,\"count\":24,\"max\":[1,1,1],\"min\":[-1,-1,-1],\"type\":\"VEC3\"},{\"bufferView\":2,\"componentType\":5126,\"count\":24,\"max\":[0.999755859375,0.499755859375],\"min\":[0.000244140625,0.000244140625],\"type\":\"VEC2\"},{\"bufferView\":3,\"componentType\":5123,\"count\":36,\"max\":[23],\"min\":[0],\"type\":\"SCALAR\"},{\"bufferView\":4,\"componentType\":5126,\"count\":24,\"max\":[0.09375,1.1875,0.8125],\"min\":[-0.09375,0.3125,0.5625],\"type\":\"VEC3\"},{\"bufferView\":5,\"componentType\":5126,\"count\":24,\"max\":[1,1,1],\"min\":[-1,-1,-1],\"type\":\"VEC3\"},{\"bufferView\":6,\"componentType\":5126,\"count\":24,\"max\":[0.624755859375,0.781005859375],\"min\":[0.406494140625,0.500244140625],\"type\":\"VEC2\"},{\"bufferView\":7,\"componentType\":5123,\"count\":36,\"max\":[23],\"min\":[0],\"type\":\"SCALAR\"},{\"bufferView\":8,\"componentType\":5126,\"count\":24,\"max\":[-0.0625,0.625,0.6875],\"min\":[-0.3125,0,0.4375],\"type\":\"VEC3\"},{\"bufferView\":9,\"componentType\":5126,\"count\":24,\"max\":[1,1,1],\"min\":[-1,-1,-1],\"type\":\"VEC3\"},{\"bufferView\":10,\"componentType\":5126,\"count\":24,\"max\":[0.812255859375,0.937255859375],\"min\":[0.562744140625,0.718994140625],\"type\":\"VEC2\"},{\"bufferView\":11,\"componentType\":5123,\"count\":36,\"max\":[23],\"min\":[0],\"type\":\"SCALAR\"},{\"bufferView\":12,\"componentType\":5126,\"count\":24,\"max\":[0.3125,0.625,0.6875],\"min\":[0.0625,0,0.4375],\"type\":\"VEC3\"},{\"bufferView\":13,\"componentType\":5126,\"count\":24,\"max\":[1,1,1],\"min\":[-1,-1,-1],\"type\":\"VEC3\"},{\"bufferView\":14,\"componentType\":5126,\"count\":24,\"max\":[0.249755859375,0.906005859375],\"min\":[0.000244140625,0.687744140625],\"type\":\"VEC2\"},{\"bufferView\":15,\"componentType\":5123,\"count\":36,\"max\":[23],\"min\":[0],\"type\":\"SCALAR\"},{\"bufferView\":16,\"componentType\":5126,\"count\":24,\"max\":[-0.0625,0.625,-0.4375],\"min\":[-0.3125,0,-0.6875],\"type\":\"VEC3\"},{\"bufferView\":17,\"componentType\":5126,\"count\":24,\"max\":[1,1,1],\"min\":[-1,-1,-1],\"type\":\"VEC3\"},{\"bufferView\":18,\"componentType\":5126,\"count\":24,\"max\":[0.906005859375,0.218505859375],\"min\":[0.656494140625,0.000244140625],\"type\":\"VEC2\"},{\"bufferView\":19,\"componentType\":5123,\"count\":36,\"max\":[23],\"min\":[0],\"type\":\"SCALAR\"},{\"bufferView\":20,\"componentType\":5126,\"count\":24,\"max\":[0.3125,0.625,-0.4375],\"min\":[0.0625,0,-0.6875],\"type\":\"VEC3\"},{\"bufferView\":21,\"componentType\":5126,\"count\":24,\"max\":[1,1,1],\"min\":[-1,-1,-1],\"type\":\"VEC3\"},{\"bufferView\":22,\"componentType\":5126,\"count\":24,\"max\":[0.874755859375,0.718505859375],\"min\":[0.625244140625,0.500244140625],\"type\":\"VEC2\"},{\"bufferView\":23,\"componentType\":5123,\"count\":36,\"max\":[23],\"min\":[0],\"type\":\"SCALAR\"},{\"bufferView\":24,\"componentType\":5126,\"count\":24,\"max\":[0.125,1.6875,-0.25],\"min\":[-0.125,0.9375,-0.6875],\"type\":\"VEC3\"},{\"bufferView\":25,\"componentType\":5126,\"count\":24,\"max\":[1,1,1],\"min\":[-1,-1,-1],\"type\":\"VEC3\"},{\"bufferView\":26,\"componentType\":5126,\"count\":24,\"max\":[0.343505859375,0.296630859375],\"min\":[0.000244140625,0.000244140625],\"type\":\"VEC2\"},{\"bufferView\":27,\"componentType\":5123,\"count\":36,\"max\":[23],\"min\":[0],\"type\":\"SCALAR\"},{\"bufferView\":28,\"componentType\":5126,\"count\":24,\"max\":[0.1875,2,-0.25],\"min\":[-0.1875,1.6875,-0.6875],\"type\":\"VEC3\"},{\"bufferView\":29,\"componentType\":5126,\"count\":24,\"max\":[1,1,1],\"min\":[-1,-1,-1],\"type\":\"VEC3\"},{\"bufferView\":30,\"componentType\":5126,\"count\":24,\"max\":[0.406005859375,0.687255859375],\"min\":[0.000244140625,0.500244140625],\"type\":\"VEC2\"},{\"bufferView\":31,\"componentType\":5123,\"count\":36,\"max\":[23],\"min\":[0],\"type\":\"SCALAR\"},{\"bufferView\":32,\"componentType\":5126,\"count\":24,\"max\":[0.125,2,-0.6875],\"min\":[-0.125,1.6875,-1],\"type\":\"VEC3\"},{\"bufferView\":33,\"componentType\":5126,\"count\":24,\"max\":[1,1,1],\"min\":[-1,-1,-1],\"type\":\"VEC3\"},{\"bufferView\":34,\"componentType\":5126,\"count\":24,\"max\":[0.531005859375,0.937255859375],\"min\":[0.250244140625,0.781494140625],\"type\":\"VEC2\"},{\"bufferView\":35,\"componentType\":5123,\"count\":36,\"max\":[23],\"min\":[0],\"type\":\"SCALAR\"},{\"bufferView\":36,\"componentType\":5126,\"count\":24,\"max\":[0.1875,2.125,-0.25062501430511475],\"min\":[0.0625,1.9375,-0.31312501430511475],\"type\":\"VEC3\"},{\"bufferView\":37,\"componentType\":5126,\"count\":24,\"max\":[1,1,1],\"min\":[-1,-1,-1],\"type\":\"VEC3\"},{\"bufferView\":38,\"componentType\":5126,\"count\":24,\"max\":[0.327880859375,0.062255859375],\"min\":[0.234619140625,0.000244140625],\"type\":\"VEC2\"},{\"bufferView\":39,\"componentType\":5123,\"count\":36,\"max\":[23],\"min\":[0],\"type\":\"SCALAR\"},{\"bufferView\":40,\"componentType\":5126,\"count\":24,\"max\":[-0.0625,2.125,-0.25062501430511475],\"min\":[-0.1875,1.9375,-0.31312501430511475],\"type\":\"VEC3\"},{\"bufferView\":41,\"componentType\":5126,\"count\":24,\"max\":[1,1,1],\"min\":[-1,-1,-1],\"type\":\"VEC3\"},{\"bufferView\":42,\"componentType\":5126,\"count\":24,\"max\":[0.093505859375,0.062255859375],\"min\":[0.000244140625,0.000244140625],\"type\":\"VEC2\"},{\"bufferView\":43,\"componentType\":5123,\"count\":36,\"max\":[23],\"min\":[0],\"type\":\"SCALAR\"},{\"bufferView\":44,\"componentType\":5126,\"count\":24,\"max\":[0.0625,1.125,-0.4375],\"min\":[-0.0625,1,-0.5625],\"type\":\"VEC3\"},{\"bufferView\":45,\"componentType\":5126,\"count\":24,\"max\":[1,1,1],\"min\":[-1,-1,-1],\"type\":\"VEC3\"},{\"bufferView\":46,\"componentType\":5126,\"count\":24,\"max\":[0.421630859375,0.562255859375],\"min\":[0.297119140625,0.500244140625],\"type\":\"VEC2\"},{\"bufferView\":47,\"componentType\":5123,\"count\":36,\"max\":[23],\"min\":[0],\"type\":\"SCALAR\"},{\"bufferView\":48,\"componentType\":5126,\"count\":24,\"max\":[0.0625,2,-0.12187500298023224],\"min\":[-0.0625,1,-0.24687500298023224],\"type\":\"VEC3\"},{\"bufferView\":49,\"componentType\":5126,\"count\":24,\"max\":[1,1,1],\"min\":[-1,-1,-1],\"type\":\"VEC3\"},{\"bufferView\":50,\"componentType\":5126,\"count\":24,\"max\":[0.937255859375,0.999755859375],\"min\":[0.812744140625,0.718994140625],\"type\":\"VEC2\"},{\"bufferView\":51,\"componentType\":5123,\"count\":36,\"max\":[23],\"min\":[0],\"type\":\"SCALAR\"}],\"materials\":[{\"pbrMetallicRoughness\":{\"metallicFactor\":0,\"roughnessFactor\":1,\"baseColorTexture\":{\"index\":0}},\"alphaMode\":\"MASK\",\"alphaCutoff\":0.05,\"doubleSided\":true}],\"textures\":[{\"sampler\":0,\"source\":0}],\"samplers\":[{\"magFilter\":9728,\"minFilter\":9728,\"wrapS\":33071,\"wrapT\":33071}],\"images\":[{\"mimeType\":\"image/png\",\"uri\":\"data:image/png;base64,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\"}],\"meshes\":[{\"primitives\":[{\"mode\":4,\"attributes\":{\"POSITION\":0,\"NORMAL\":1,\"TEXCOORD_0\":2},\"indices\":3,\"material\":0}]},{\"primitives\":[{\"mode\":4,\"attributes\":{\"POSITION\":4,\"NORMAL\":5,\"TEXCOORD_0\":6},\"indices\":7,\"material\":0}]},{\"primitives\":[{\"mode\":4,\"attributes\":{\"POSITION\":8,\"NORMAL\":9,\"TEXCOORD_0\":10},\"indices\":11,\"material\":0}]},{\"primitives\":[{\"mode\":4,\"attributes\":{\"POSITION\":12,\"NORMAL\":13,\"TEXCOORD_0\":14},\"indices\":15,\"material\":0}]},{\"primitives\":[{\"mode\":4,\"attributes\":{\"POSITION\":16,\"NORMAL\":17,\"TEXCOORD_0\":18},\"indices\":19,\"material\":0}]},{\"primitives\":[{\"mode\":4,\"attributes\":{\"POSITION\":20,\"NORMAL\":21,\"TEXCOORD_0\":22},\"indices\":23,\"material\":0}]},{\"primitives\":[{\"mode\":4,\"attributes\":{\"POSITION\":24,\"NORMAL\":25,\"TEXCOORD_0\":26},\"indices\":27,\"material\":0}]},{\"primitives\":[{\"mode\":4,\"attributes\":{\"POSITION\":28,\"NORMAL\":29,\"TEXCOORD_0\":30},\"indices\":31,\"material\":0}]},{\"primitives\":[{\"mode\":4,\"attributes\":{\"POSITION\":32,\"NORMAL\":33,\"TEXCOORD_0\":34},\"indices\":35,\"material\":0}]},{\"primitives\":[{\"mode\":4,\"attributes\":{\"POSITION\":36,\"NORMAL\":37,\"TEXCOORD_0\":38},\"indices\":39,\"material\":0}]},{\"primitives\":[{\"mode\":4,\"attributes\":{\"POSITION\":40,\"NORMAL\":41,\"TEXCOORD_0\":42},\"indices\":43,\"material\":0}]},{\"primitives\":[{\"mode\":4,\"attributes\":{\"POSITION\":44,\"NORMAL\":45,\"TEXCOORD_0\":46},\"indices\":47,\"material\":0}]},{\"primitives\":[{\"mode\":4,\"attributes\":{\"POSITION\":48,\"NORMAL\":49,\"TEXCOORD_0\":50},\"indices\":51,\"material\":0}]}]}";


/* ============================================================
   ZEBRA 3D MASCOT
   Head/neck tracks the cursor (yaw + pitch), idle = grazing animation.
   Model comes from window.ZEBRA_GLTF_JSON (assigned above), so nothing is
   fetched over the network — it works even opening index.html by double-click.
   Wrapped defensively: any failure logs a clear reason to the console instead
   of silently leaving an empty widget.
============================================================ */
(function () {
  "use strict";

  function warn(msg, err) {
    console.warn("[zebra] " + msg, err || "");
  }

  // skip on small/touch screens to keep things light & smooth
  if (window.innerWidth < 760) return;

  if (typeof THREE === "undefined") {
    warn("THREE.js did not load (check your internet connection / CDN block) — mascot skipped.");
    return;
  }
  if (typeof THREE.GLTFLoader === "undefined") {
    warn("THREE.GLTFLoader did not load — mascot skipped.");
    return;
  }
  if (typeof window.ZEBRA_GLTF_JSON !== "string") {
    warn("window.ZEBRA_GLTF_JSON is missing — make sure the model-data block loads before this script.");
    return;
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var canvas = document.getElementById("zebraCanvas");
  var widget = document.getElementById("zebraWidget");
  var bubble = document.getElementById("zebraBubble");
  if (!canvas || !widget) return;

  var SIZE = 180;

  /* ===================================================================
     TUNABLES — kalau arah gerakan kepala/leher kebalik atau kurang pas
     pas dites di browser, tinggal utak-atik angka2 di sini (gak perlu
     ubah logic di bawah).
  =================================================================== */
  var TUNE = {
    lookYawSensitivity: 0.95,
    lookPitchSensitivity: 0.55,
    headExtraYaw: 0.55,
    headExtraPitch: 0.5,
    followSmoothing: 0.16,
    idleTimeoutMs: 2600,
    grazeDip: 0.5,
    grazeCycleSeconds: 6.5,
    dragRotateSensitivity: 0.012, // rad of body spin per px of horizontal drag
    bodyRotateSmoothing: 0.18,    // easing toward the dragged target angle
    platformRadiusPad: 1.28       // how much wider the base disc is than the model's footprint
  };

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) {
    warn("WebGL not supported in this browser — mascot skipped.", e);
    widget.style.display = "none";
    return;
  }
  renderer.setSize(SIZE, SIZE);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;

  scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x0b1622, 1.15));
  var key = new THREE.DirectionalLight(0x3fe0c5, 0.9);
  key.position.set(2, 3, 4);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0xe8b94d, 0.6);
  rim.position.set(-3, 2, -2);
  scene.add(rim);

  /* ---------- circular pedestal / base disc under the zebra ----------
     A flat glowing disc that stays fixed on the ground while the zebra
     itself spins on top of it (drag-to-rotate below) — reads visually
     as a little display turntable. Built from a radial-gradient canvas
     texture so the edge fades out softly instead of showing a hard rim. */
  function buildPlatform(radius, y) {
    var res = 128;
    var c = document.createElement("canvas");
    c.width = c.height = res;
    var cx = c.getContext("2d");
    var g = cx.createRadialGradient(res / 2, res / 2, 0, res / 2, res / 2, res / 2);
    g.addColorStop(0, "rgba(63,224,197,0.55)");
    g.addColorStop(0.55, "rgba(63,224,197,0.22)");
    g.addColorStop(0.82, "rgba(232,185,77,0.12)");
    g.addColorStop(1, "rgba(232,185,77,0)");
    cx.fillStyle = g;
    cx.fillRect(0, 0, res, res);

    var tex = new THREE.CanvasTexture(c);
    var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    var disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), mat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(0, y + 0.004, 0);
    scene.add(disc);

    // thin bright ring right at the edge so the base still reads clearly
    // even if the soft glow above blends into the background
    var ringMat = new THREE.MeshBasicMaterial({ color: 0x3fe0c5, transparent: true, opacity: 0.35 });
    var ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.97, radius, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, y + 0.006, 0);
    scene.add(ring);
  }

  /* ---------- speech bubble, shown once ---------- */
  var ZKEY = "myjourney_zebra_intro_seen";
  var seen = false;
  try { seen = localStorage.getItem(ZKEY) === "1"; } catch (e) {}
  if (!seen && bubble) {
    setTimeout(function () { bubble.classList.add("show"); }, 1400);
    setTimeout(function () {
      bubble.classList.remove("show");
      try { localStorage.setItem(ZKEY, "1"); } catch (e) {}
    }, 6000);
  } else if (bubble) {
    bubble.style.display = "none";
  }

  /* ---------- cursor tracking (whole-page coordinates) ---------- */
  var targetNX = 0, targetNY = 0;
  var lastMoveAt = 0;

  window.addEventListener("mousemove", function (e) {
    targetNX = (e.clientX / window.innerWidth) * 2 - 1;
    targetNY = (e.clientY / window.innerHeight) * 2 - 1;
    lastMoveAt = performance.now();
  });

  /* ---------- drag-to-rotate: spin the whole body horizontally ----------
     Independent of the head/neck cursor-tracking above — the head keeps
     following the mouse the whole time, the BODY only turns while the
     user is actively dragging left/right on the canvas. */
  var bodyYawTarget = 0, bodyYawCur = 0;
  var dragging = false, dragStartX = 0, dragStartYaw = 0;

  canvas.style.cursor = "grab";
  canvas.style.pointerEvents = "auto";
  canvas.style.touchAction = "none";

  canvas.addEventListener("pointerdown", function (e) {
    dragging = true;
    dragStartX = e.clientX;
    dragStartYaw = bodyYawTarget;
    canvas.style.cursor = "grabbing";
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  });
  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - dragStartX;
    bodyYawTarget = dragStartYaw + dx * TUNE.dragRotateSensitivity;
  });
  window.addEventListener("pointerup", function () {
    if (!dragging) return;
    dragging = false;
    canvas.style.cursor = "grab";
  });
  window.addEventListener("pointercancel", function () {
    dragging = false;
    canvas.style.cursor = "grab";
  });

  var loader = new THREE.GLTFLoader();
  var root = null;
  var neckBone = null, headBone = null, tailBone = null, earLBone = null, earRBone = null;

  var restNeck = { x: 0, y: 0, z: 0 };
  var restHead = { x: 0, y: 0, z: 0 };
  var restTail = { x: 0, y: 0, z: 0 };

  var curYaw = 0, curPitch = 0;
  var groundY = 0;

  function onModelLoaded(gltf) {
    try {
      root = gltf.scene;

      root.traverse(function (obj) {
        if (obj.isMesh && obj.material) {
          var mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(function (m) {
            if (m.map) {
              m.map.magFilter = THREE.NearestFilter;
              m.map.minFilter = THREE.NearestFilter;
              m.map.needsUpdate = true;
            }
            m.side = THREE.DoubleSide;
          });
        }
        if (!obj.isMesh) {
          if (obj.name === "Neck" && obj.children.length) neckBone = obj;
          if (obj.name === "Head" && obj.children.length) headBone = obj;
          if (obj.name === "Tail" && obj.children.length) tailBone = obj;
          if (obj.name === "MuleEarL" && obj.children.length) earLBone = obj;
          if (obj.name === "MuleEarR" && obj.children.length) earRBone = obj;
        }
      });

      if (!neckBone || !headBone) {
        warn("Neck/Head bones not found in the model — mascot will show but won't track the cursor.");
      }

      if (neckBone) restNeck = { x: neckBone.rotation.x, y: neckBone.rotation.y, z: neckBone.rotation.z };
      if (headBone) restHead = { x: headBone.rotation.x, y: headBone.rotation.y, z: headBone.rotation.z };
      if (tailBone) restTail = { x: tailBone.rotation.x, y: tailBone.rotation.y, z: tailBone.rotation.z };

      var box = new THREE.Box3().setFromObject(root);
      var size = new THREE.Vector3();
      box.getSize(size);
      var targetHeight = 1.55;
      var scale = size.y > 0 ? targetHeight / size.y : 1;
      root.scale.setScalar(scale);

      box.setFromObject(root);
      box.getSize(size);
      var center = new THREE.Vector3();
      box.getCenter(center);
      root.position.x += -center.x;
      root.position.z += -center.z;
      root.position.y += -box.min.y;
      groundY = root.position.y;

      scene.add(root);

      var h = size.y;
      camera.position.set(0, h * 0.72, h * 3.05);
      camera.lookAt(0, h * 0.6, 0);

      buildPlatform(Math.max(size.x, size.z) * 0.5 * TUNE.platformRadiusPad, groundY);

      widget.style.opacity = "1";
    } catch (e) {
      warn("Failed while setting up the loaded model — mascot hidden.", e);
      widget.style.display = "none";
    }
  }

  function onModelError(err) {
    warn("Model failed to parse/load — mascot hidden. This usually means model_data.js / the embedded model JSON is missing or corrupted.", err);
    widget.style.display = "none";
  }

  try {
    loader.parse(window.ZEBRA_GLTF_JSON, "", onModelLoaded, onModelError);
  } catch (e) {
    onModelError(e);
  }

  widget.style.transition = "opacity 0.5s ease";
  widget.style.opacity = "0";

  var clock = new THREE.Clock();

  function grazingOffsets(t) {
    var phase = (t % TUNE.grazeCycleSeconds) / TUNE.grazeCycleSeconds;
    var raw = Math.sin(Math.PI * phase);
    var dip = Math.pow(Math.max(raw, 0), 0.55);
    var swayY = Math.sin(t * 0.7) * 0.08 * (1 - dip);
    return { pitch: dip * TUNE.grazeDip, yaw: swayY };
  }

  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();

    if (root) {
      bodyYawCur += (bodyYawTarget - bodyYawCur) * (dragging ? 1 : TUNE.bodyRotateSmoothing);
      root.rotation.y = bodyYawCur;
    }

    if (root && neckBone && headBone) {
      var idleFor = performance.now() - lastMoveAt;
      var alertBlend = lastMoveAt === 0 ? 0 : 1 - Math.min(1, Math.max(0, (idleFor - TUNE.idleTimeoutMs) / 700));
      alertBlend = Math.max(0, Math.min(1, alertBlend));

      var graze = grazingOffsets(t);

      var wantYaw = (targetNX * TUNE.lookYawSensitivity) * alertBlend + graze.yaw * (1 - alertBlend);
      var wantPitch = (targetNY * TUNE.lookPitchSensitivity) * alertBlend + graze.pitch * (1 - alertBlend);

      curYaw += (wantYaw - curYaw) * TUNE.followSmoothing;
      curPitch += (wantPitch - curPitch) * TUNE.followSmoothing;

      neckBone.rotation.y = restNeck.y + curYaw * (1 - TUNE.headExtraYaw);
      neckBone.rotation.x = restNeck.x - curPitch * (1 - TUNE.headExtraPitch);

      headBone.rotation.y = restHead.y + curYaw * TUNE.headExtraYaw;
      headBone.rotation.x = restHead.x - curPitch * TUNE.headExtraPitch;

      if (!reduceMotion) {
        var bob = Math.sin(t * 1.6) * 0.012;
        root.position.y = groundY + bob;

        if (tailBone) tailBone.rotation.x = restTail.x + Math.sin(t * 2.1) * 0.12;
        if (earLBone) earLBone.rotation.x = Math.sin(t * 3.2) * 0.1;
        if (earRBone) earRBone.rotation.x = Math.cos(t * 3.0) * 0.1;
      }
    }

    try {
      renderer.render(scene, camera);
    } catch (e) {
      warn("Render loop error, stopping animation.", e);
      return;
    }
  }
  animate();

  window.addEventListener("resize", function () {
    widget.style.display = window.innerWidth < 760 ? "none" : "block";
  });
})();


/* ============================================================
   CLOUD SYNC (Firebase Realtime Database)
   Semua key yang diawali "myjourney_" sekarang otomatis ikut
   disimpan ke Firebase, bukan cuma localStorage browser ini.
   - Saat halaman dibuka: tarik data terbaru dari Firebase dulu
     (menimpa localStorage lokal), BARU kode lain di bawah jalan
     dan membaca localStorage seperti biasa — jadi tidak ada
     satupun bagian lain dari file ini yang perlu diubah.
   - Setiap localStorage.setItem("myjourney_...", ...) dipanggil,
     otomatis dikirim juga ke Firebase (di-debounce per key).
   - Kalau internet mati / Firebase gagal diakses, situs tetap
     jalan normal pakai localStorage saja (tidak pernah nge-block
     halaman).
============================================================ */
var FIREBASE_URL = "https://mnda-journey-default-rtdb.asia-southeast1.firebasedatabase.app";
var CLOUD_SYNC_READY = false; // jadi true setelah tarikan awal dari Firebase selesai (atau gagal)

(function cloudSyncSetup() {
  var PREFIX = "myjourney_";
  if (!FIREBASE_URL) return; // belum diisi — jalan seperti biasa, localStorage saja

  // key yang TIDAK usah disinkron ke semua device (murni preferensi
  // lokal per-browser): status "sudah lihat intro zebra", info bar
  // di-dismiss, dan status owner (siapa yang boleh edit di device ini).
  var LOCAL_ONLY_SUFFIXES = ["owner", "infobar_dismissed"];
  function isLocalOnly(key) {
    for (var i = 0; i < LOCAL_ONLY_SUFFIXES.length; i++) {
      if (key === PREFIX + LOCAL_ONLY_SUFFIXES[i]) return true;
    }
    return false;
  }
  function cloudKeyFor(key) {
    // Firebase key tidak boleh mengandung karakter . $ # [ ] / — key kita
    // (myjourney_xxx) sudah aman, tapi jaga-jaga tetap di-encode.
    return encodeURIComponent(key);
  }

  /* ---- 1. Tarik semua data dari Firebase SEBELUM kode lain baca localStorage ---- */
  var xhr = new XMLHttpRequest();
  xhr.open("GET", FIREBASE_URL + "/myjourney.json", false /* SYNC — sengaja, biar kode di bawah pasti nunggu */);
  try {
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) {
      var remote = JSON.parse(xhr.responseText || "null");
      if (remote && typeof remote === "object") {
        Object.keys(remote).forEach(function (encKey) {
          var key = decodeURIComponent(encKey);
          if (isLocalOnly(key)) return;
          try { localStorage.setItem(key, remote[encKey]); } catch (e) {}
        });
      }
    }
  } catch (e) {
    // offline atau Firebase belum bisa diakses — lanjut pakai localStorage lokal saja
  }
  CLOUD_SYNC_READY = true;

  /* ---- 2. Setiap localStorage.setItem untuk key kita, juga kirim ke Firebase ---- */
  var pushTimers = {};
  function pushToCloud(key, value) {
    if (isLocalOnly(key)) return;
    clearTimeout(pushTimers[key]);
    pushTimers[key] = setTimeout(function () {
      var url = FIREBASE_URL + "/myjourney/" + cloudKeyFor(key) + ".json";
      var xhr2 = new XMLHttpRequest();
      xhr2.open("PUT", url, true);
      xhr2.setRequestHeader("Content-Type", "application/json");
      try { xhr2.send(JSON.stringify(value)); } catch (e) {}
    }, 400);
  }
  function pushDeleteToCloud(key) {
    if (isLocalOnly(key)) return;
    var url = FIREBASE_URL + "/myjourney/" + cloudKeyFor(key) + ".json";
    var xhr3 = new XMLHttpRequest();
    xhr3.open("DELETE", url, true);
    try { xhr3.send(null); } catch (e) {}
  }

  var origSetItem = Storage.prototype.setItem;
  var origRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (key, value) {
    origSetItem.apply(this, arguments);
    if (this === window.localStorage && key.indexOf(PREFIX) === 0) {
      pushToCloud(key, value);
    }
  };
  Storage.prototype.removeItem = function (key) {
    origRemoveItem.apply(this, arguments);
    if (this === window.localStorage && key.indexOf(PREFIX) === 0) {
      pushDeleteToCloud(key);
    }
  };
})();

(function(){
"use strict";

var PREFIX = "myjourney_";
var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   OWNER LOCK — the edit toolbar stays hidden from normal visitors.
   Change SECRET_KEY below to your own private word, then always
   open your site once as: yoursite.com/index.html?edit=SECRET_KEY
   That unlocks the toolbar on this browser/device from then on.
   To lock it again on a device, clear the site's browser data,
   or open the URL with a wrong/no ?edit= value in a private window.
============================================================ */
var SECRET_KEY = "MNDAJOURNEY"; // <-- GANTI dengan kata rahasiamu sendiri
(function ownerCheck() {
  var params = new URLSearchParams(window.location.search);
  var attempt = params.get("edit");
  if (attempt && attempt === SECRET_KEY) {
    try { localStorage.setItem(PREFIX + "owner", "1"); } catch (e) {}
  }
  var isOwner = false;
  try { isOwner = localStorage.getItem(PREFIX + "owner") === "1"; } catch (e) {}
  if (isOwner) {
    document.documentElement.classList.add("is-owner");
  }
})();

/* ============================================================
   1. INFO BAR DISMISS
============================================================ */
var infobar = document.getElementById("infobar");
var dismissInfo = document.getElementById("dismissInfo");
if (localStorage.getItem(PREFIX + "infobar_dismissed") === "1" && infobar) {
  infobar.classList.add("hidden");
}
if (dismissInfo) {
  dismissInfo.addEventListener("click", function () {
    infobar.classList.add("hidden");
    try { localStorage.setItem(PREFIX + "infobar_dismissed", "1"); } catch (e) {}
  });
}

/* ============================================================
   2. BACKGROUND CANVAS — drifting stars + rising bubbles, mouse parallax
============================================================ */
var canvas = document.getElementById("bgCanvas");
var ctx = canvas.getContext("2d");
var W, H, DPR;
var stars = [];
var mouseX = 0.5, mouseY = 0.5;

function resizeCanvas() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  buildStars();
}

function buildStars() {
  var count = Math.floor((W * H) / 9000);
  count = Math.max(40, Math.min(count, 160));
  stars = [];
  for (var i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3,
      tw: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.4 + 0.1,
      parallax: Math.random() * 0.5 + 0.1
    });
  }
}

window.addEventListener("mousemove", function (e) {
  mouseX = e.clientX / window.innerWidth;
  mouseY = e.clientY / window.innerHeight;
});

var t = 0;
function drawFrame() {
  t += 0.016;
  ctx.clearRect(0, 0, W, H);
  var px = (mouseX - 0.5) * 18;
  var py = (mouseY - 0.5) * 18;

  for (var i = 0; i < stars.length; i++) {
    var s = stars[i];
    var alpha = 0.35 + 0.45 * Math.sin(t * s.speed + s.tw);
    alpha = Math.max(0.08, alpha);
    ctx.beginPath();
    ctx.fillStyle = "rgba(238,243,245," + alpha.toFixed(3) + ")";
    var sx = s.x + px * s.parallax;
    var sy = s.y + py * s.parallax;
    ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!reduceMotion) {
    requestAnimationFrame(drawFrame);
  }
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
drawFrame();
if (reduceMotion) {
  // draw a couple of static frames so the sky isn't empty, then stop
  setTimeout(drawFrame, 50);
}

/* ============================================================
   2b. CURSOR SPARKLE TRAIL — soft white fairy-dust glints following
       the pointer (replaces the old comet trail)
============================================================ */
var sparkleCanvas = document.getElementById("sparkleCanvas");
if (sparkleCanvas && !reduceMotion && window.matchMedia("(hover:hover)").matches) {
  var sctx = sparkleCanvas.getContext("2d");
  var SW, SH, SDPR;
  var sparkles = [];
  var lastSX = null, lastSY = null;

  function resizeSparkle() {
    SDPR = Math.min(window.devicePixelRatio || 1, 2);
    SW = window.innerWidth; SH = window.innerHeight;
    sparkleCanvas.width = SW * SDPR; sparkleCanvas.height = SH * SDPR;
    sparkleCanvas.style.width = SW + "px"; sparkleCanvas.style.height = SH + "px";
    sctx.setTransform(SDPR, 0, 0, SDPR, 0, 0);
  }
  resizeSparkle();
  window.addEventListener("resize", resizeSparkle);

  window.addEventListener("mousemove", function (e) {
    var x = e.clientX, y = e.clientY;
    if (lastSX !== null) {
      var dist = Math.hypot(x - lastSX, y - lastSY);
      var steps = Math.min(Math.max(Math.floor(dist / 14), 0), 3);
      for (var i = 0; i < steps; i++) {
        var t2 = i / steps;
        sparkles.push({
          x: lastSX + (x - lastSX) * t2 + (Math.random() - 0.5) * 6,
          y: lastSY + (y - lastSY) * t2 + (Math.random() - 0.5) * 6,
          life: 1,
          size: Math.random() * 3.2 + 2,
          rot: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.06,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.5 - 0.15,
          warm: Math.random() < 0.22
        });
      }
    }
    // small chance to sprinkle an extra glint even while barely moving,
    // for that "trailing fairy dust" feel
    if (Math.random() < 0.18) {
      sparkles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        life: 1,
        size: Math.random() * 2.4 + 1.4,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.06,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        warm: Math.random() < 0.22
      });
    }
    lastSX = x; lastSY = y;
    if (sparkles.length > 90) sparkles.splice(0, sparkles.length - 90);
  });

  function drawSparkle(x, y, size, alpha, rot, warm) {
    var rgb = warm ? "232,185,77" : "255,255,255";
    sctx.save();
    sctx.translate(x, y);
    sctx.rotate(rot);

    // soft glow halo
    var glow = sctx.createRadialGradient(0, 0, 0, 0, 0, size * 3.2);
    glow.addColorStop(0, "rgba(" + rgb + "," + (alpha * 0.55).toFixed(2) + ")");
    glow.addColorStop(1, "rgba(" + rgb + ",0)");
    sctx.fillStyle = glow;
    sctx.beginPath();
    sctx.arc(0, 0, size * 3.2, 0, Math.PI * 2);
    sctx.fill();

    // 4-point star glint
    sctx.globalAlpha = alpha;
    sctx.fillStyle = "rgba(" + rgb + ",1)";
    sctx.beginPath();
    sctx.moveTo(0, -size);
    sctx.quadraticCurveTo(size * 0.18, -size * 0.18, size, 0);
    sctx.quadraticCurveTo(size * 0.18, size * 0.18, 0, size);
    sctx.quadraticCurveTo(-size * 0.18, size * 0.18, -size, 0);
    sctx.quadraticCurveTo(-size * 0.18, -size * 0.18, 0, -size);
    sctx.closePath();
    sctx.fill();
    sctx.globalAlpha = 1;
    sctx.restore();
  }

  function drawSparkles() {
    sctx.clearRect(0, 0, SW, SH);
    for (var i = sparkles.length - 1; i >= 0; i--) {
      var s = sparkles[i];
      s.life -= 0.028;
      if (s.life <= 0) { sparkles.splice(i, 1); continue; }
      s.x += s.vx;
      s.y += s.vy;
      s.rot += s.spin;
      drawSparkle(s.x, s.y, s.size * s.life, s.life, s.rot, s.warm);
    }
    requestAnimationFrame(drawSparkles);
  }
  drawSparkles();
}

/* ============================================================
   2c. OCCASIONAL SHOOTING STAR — drifts across the sky now and then
============================================================ */
if (!reduceMotion) {
  function spawnShootingStar() {
    var star = document.createElement("div");
    var startX = Math.random() * window.innerWidth * 0.6;
    var startY = Math.random() * window.innerHeight * 0.35;
    var length = Math.random() * 90 + 70;
    var angle = 30 + Math.random() * 15;
    star.style.cssText =
      "position:fixed; left:" + startX + "px; top:" + startY + "px; width:" + length + "px; height:2px;" +
      "background:linear-gradient(90deg, rgba(238,243,245,0.9), rgba(238,243,245,0));" +
      "transform:rotate(" + angle + "deg); transform-origin:left center; z-index:0; pointer-events:none;" +
      "border-radius:2px; opacity:0; filter:drop-shadow(0 0 4px rgba(238,243,245,0.8));" +
      "transition:opacity 0.25s ease, transform 1.1s cubic-bezier(.2,.7,.3,1), left 1.1s cubic-bezier(.2,.7,.3,1), top 1.1s cubic-bezier(.2,.7,.3,1);";
    document.body.appendChild(star);
    requestAnimationFrame(function () {
      star.style.opacity = "1";
      requestAnimationFrame(function () {
        var travel = 260;
        star.style.left = (startX + travel * Math.cos(angle * Math.PI / 180)) + "px";
        star.style.top = (startY + travel * Math.sin(angle * Math.PI / 180)) + "px";
        star.style.opacity = "0";
      });
    });
    setTimeout(function () { star.remove(); }, 1400);
  }
  setInterval(function () {
    if (Math.random() < 0.6) spawnShootingStar();
  }, 5000);
}

/* ============================================================
   3. JOURNEY TRACK — wavy SVG spine that fills on scroll + rising bubbles
============================================================ */
var trackWrap = document.getElementById("journeyTrack");
var svgWrap = document.getElementById("trackSvgWrap");
var bubbleField = document.getElementById("bubbleField");
var trackComet = document.getElementById("trackComet");
var pathD = "";
var fillPath, glowPath, trackHeight;

function buildTrackSvg() {
  if (!trackWrap || !svgWrap) return;
  trackHeight = trackWrap.offsetHeight;
  if (trackHeight < 10) return;

  var amp = 16;
  var step = 40;
  var pts = [];
  for (var y = 0; y <= trackHeight; y += step) {
    var x = 30 + Math.sin(y / 220) * amp;
    pts.push([x, y]);
  }
  var d = "M " + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
  for (var i = 1; i < pts.length; i++) {
    var prev = pts[i - 1], cur = pts[i];
    var midY = (prev[1] + cur[1]) / 2;
    d += " Q " + prev[0].toFixed(1) + " " + midY.toFixed(1) + " " + cur[0].toFixed(1) + " " + cur[1].toFixed(1);
  }
  pathD = d;

  svgWrap.innerHTML =
    '<svg viewBox="0 0 60 ' + trackHeight + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
      '<linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#3fe0c5"/><stop offset="100%" stop-color="#e8b94d"/>' +
      '</linearGradient>' +
      '<filter id="trackGlow" x="-200%" y="-20%" width="500%" height="140%">' +
        '<feGaussianBlur stdDeviation="2.6" result="blur"/>' +
        '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>' +
    '</defs>' +
    /* base path: soft dotted current, not a rigid ruler line */
    '<path d="' + d + '" stroke="rgba(138,160,176,0.22)" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-dasharray="0.5 9"/>' +
    /* soft blurred glow trailing behind the filled progress */
    '<path id="glowPath" d="' + d + '" stroke="url(#grad)" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.35" filter="url(#trackGlow)"/>' +
    /* crisp gradient fill line on top */
    '<path id="fillPath" d="' + d + '" stroke="url(#grad)" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '</svg>';

  fillPath = document.getElementById("fillPath");
  glowPath = document.getElementById("glowPath");
  if (fillPath) {
    var len = fillPath.getTotalLength();
    fillPath.style.strokeDasharray = len;
    fillPath.style.strokeDashoffset = len;
    if (glowPath) {
      glowPath.style.strokeDasharray = len;
      glowPath.style.strokeDashoffset = len;
    }
  }

  buildBubbles();
}

function buildBubbles() {
  if (!bubbleField) return;
  bubbleField.innerHTML = "";
  var n = 14;
  for (var i = 0; i < n; i++) {
    var b = document.createElement("div");
    b.className = "bubble";
    var size = Math.random() * 8 + 4;
    b.style.width = size + "px";
    b.style.height = size + "px";
    b.style.left = (30 + (Math.random() * 40 - 20)) + "px";
    b.style.setProperty("--drift", (Math.random() * 30 - 15) + "px");
    var dur = Math.random() * 10 + 10;
    b.style.animationDuration = dur + "s";
    b.style.animationDelay = (-Math.random() * dur) + "s";
    bubbleField.appendChild(b);
  }
}

function updateTrackProgress() {
  if (!fillPath || !trackWrap) return;
  var rect = trackWrap.getBoundingClientRect();
  var viewportCenter = window.innerHeight * 0.5;
  var progress = (viewportCenter - rect.top) / trackWrap.offsetHeight;
  progress = Math.max(0, Math.min(1, progress));
  var len = fillPath.getTotalLength();
  var offset = len * (1 - progress);
  fillPath.style.strokeDashoffset = offset;
  if (glowPath) glowPath.style.strokeDashoffset = offset;

  if (trackComet) {
    if (progress <= 0 || progress >= 1) {
      trackComet.classList.remove("is-active");
    } else {
      trackComet.classList.add("is-active");
      var pt = fillPath.getPointAtLength(len * progress);
      /* viewBox is 60 units wide mapped 1:1 to the 60px-wide svgWrap, centered
         at 50% of the track — so viewBox-x 30 sits on the container's center line. */
      trackComet.style.left = "calc(50% + " + (pt.x - 30).toFixed(1) + "px)";
      trackComet.style.top = pt.y.toFixed(1) + "px";
    }
  }
}

/* Chapter reveal + active node via IntersectionObserver */
var chapters = document.querySelectorAll("[data-chapter]");
if ("IntersectionObserver" in window) {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("inview");
      }
    });
  }, { threshold: 0.3 });
  chapters.forEach(function (c) { io.observe(c); });
} else {
  chapters.forEach(function (c) { c.classList.add("inview"); });
}

window.addEventListener("scroll", function () {
  window.requestAnimationFrame(updateTrackProgress);
}, { passive: true });
window.addEventListener("resize", function () {
  buildTrackSvg();
  updateTrackProgress();
});

/* delay build until layout (fonts/images) settle */
window.addEventListener("load", function () {
  buildTrackSvg();
  updateTrackProgress();
});
setTimeout(function () { buildTrackSvg(); updateTrackProgress(); }, 400);

/* ============================================================
   3b. SCROLL PARALLAX — background/aurora drift at a different
   speed than the page content for a sense of depth
============================================================ */
var auroraLayer = document.querySelector(".aurora");
if (!reduceMotion) {
  window.addEventListener("scroll", function () {
    window.requestAnimationFrame(function () {
      var y = window.scrollY;
      if (auroraLayer) auroraLayer.style.transform = "translateY(" + (y * 0.12) + "px)";
      canvas.style.transform = "translateY(" + (y * 0.05) + "px)";
    });
  }, { passive: true });
}

/* ============================================================
   3c. GALLERY — 3D "window opening" reveal as each photo scrolls in
============================================================ */
if ("IntersectionObserver" in window) {
  var galleryIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("win-open");
        galleryIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: "0px 0px -60px 0px" });

  function observeGallerySlots() {
    document.querySelectorAll(".gallery-grid .photo-slot").forEach(function (slot) {
      galleryIO.observe(slot);
    });
  }
  // gallery slots are injected dynamically later in this file — observe after a tick
  setTimeout(observeGallerySlots, 50);
} else {
  document.querySelectorAll(".gallery-grid .photo-slot").forEach(function (s) { s.classList.add("win-open"); });
}

/* ============================================================
   4. PHOTO UPLOAD SLOTS (persisted to localStorage as base64)
============================================================ */

/* ---- deleted-slot tracking (so a removed slot stays gone after reload,
   whether it was one of the original hardcoded slots or one added later
   via "+ tambah foto") ---- */
var DELETED_SLOTS_KEY = PREFIX + "deleted_slots";
var deletedSlots = {};
(function loadDeletedSlots() {
  try {
    var arr = JSON.parse(localStorage.getItem(DELETED_SLOTS_KEY) || "[]");
    arr.forEach(function (id) { deletedSlots[id] = true; });
  } catch (e) {}
})();
function isSlotDeleted(id) { return !!deletedSlots[id]; }
function markSlotDeleted(id) {
  deletedSlots[id] = true;
  try { localStorage.setItem(DELETED_SLOTS_KEY, JSON.stringify(Object.keys(deletedSlots))); } catch (e) {}
  try { localStorage.removeItem(PREFIX + "photo_" + id); } catch (e) {}
}

function renderSlotImage(slot) {
  var id = slot.getAttribute("data-slot");
  var data;
  try { data = localStorage.getItem(PREFIX + "photo_" + id); } catch (e) { data = null; }
  var img = slot.querySelector("img");

  if (data) {
    // an uploaded (localStorage) photo always takes priority
    if (!img) {
      img = document.createElement("img");
      slot.insertBefore(img, slot.firstChild);
    }
    img.src = data;
    img.dataset.jsManaged = "1";
    slot.classList.add("has-img");
    return;
  }

  // no localStorage entry for this slot
  if (img && img.dataset.jsManaged === "1") {
    // this image was created by our own upload feature and has no
    // matching saved data anymore (e.g. after a reset) — safe to remove
    img.remove();
    slot.classList.remove("has-img");
  } else if (img) {
    // a hardcoded <img> was placed directly in the HTML by hand —
    // never touch it, just make sure the slot styling matches
    slot.classList.add("has-img");
  } else {
    slot.classList.remove("has-img");
  }
}

function wireSlot(slot) {
  var id = slot.getAttribute("data-slot");

  // this slot was deleted by the owner in a previous visit — drop it
  // immediately instead of wiring it up, so a page reload keeps it gone
  if (isSlotDeleted(id)) {
    slot.remove();
    return;
  }

  var input = slot.querySelector('input[type="file"]');
  var removeBtn = slot.querySelector(".remove-btn");

  renderSlotImage(slot);

  slot.addEventListener("click", function (e) {
    if (!document.documentElement.classList.contains("is-owner")) return; // pengunjung biasa: tidak bisa upload
    if (e.target === removeBtn) return;
    if (document.body.classList.contains("edit-mode") || !slot.classList.contains("has-img")) {
      input.click();
    }
  });

  input.addEventListener("change", function () {
    var file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.match(/^image\//)) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        localStorage.setItem(PREFIX + "photo_" + id, reader.result);
        renderSlotImage(slot);
        showToast("Foto tersimpan ✓");
      } catch (err) {
        showToast("Gagal simpan — foto terlalu besar");
      }
    };
    reader.readAsDataURL(file);
  });

  // × removes the whole slot (mengurangi jumlah slot), not just the photo
  // inside it — the counterpart to "+ tambah foto". Only usable by the
  // owner while in edit mode (see CSS for visibility); confirms first if
  // there's still a photo in it so nothing gets lost by accident.
  if (removeBtn) {
    removeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!document.documentElement.classList.contains("is-owner")) return;
      if (slot.classList.contains("has-img")) {
        var ok = window.confirm("Hapus slot ini beserta fotonya?");
        if (!ok) return;
      }
      markSlotDeleted(id);
      slot.style.transition = "opacity 0.2s ease, transform 0.2s ease";
      slot.style.opacity = "0";
      slot.style.transform = "scale(0.85)";
      setTimeout(function () { slot.remove(); }, 200);
      showToast("Slot foto dihapus");
    });
  }
}

function makeSlotEl(id, label) {
  var div = document.createElement("div");
  div.className = "photo-slot";
  div.setAttribute("data-slot", id);
  div.innerHTML =
    '<span class="ph-icon">+</span><span class="ph-label">' + label + '</span>' +
    '<input type="file" accept="image/*"><button class="remove-btn" type="button" title="Hapus slot">×</button>';
  return div;
}

document.querySelectorAll(".photo-slot").forEach(wireSlot);


/* ============================================================
   PHOTO LIGHTBOX — click any filled photo slot and it grows in place
   toward the viewer (FLIP-style: starts exactly where the thumbnail
   sits, animates to a centered focused size), background blurs behind
   it, and clicking anywhere outside the enlarged photo flies it back
   to its original spot. Uses event delegation on document so it also
   covers slots added later (extra photo slots, project cards).
============================================================ */
(function initPhotoLightbox() {
  var backdrop = document.getElementById("lbBackdrop");
  var clone = document.getElementById("lbClone");
  if (!backdrop || !clone) return;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var activeImg = null;
  var closeTimer = null;

  function targetBoxFor(rect) {
    var aspect = rect.width / rect.height || 1;
    var maxW = window.innerWidth * 0.82;
    var maxH = window.innerHeight * 0.82;
    var w = maxW, h = w / aspect;
    if (h > maxH) { h = maxH; w = h * aspect; }
    return {
      w: w, h: h,
      top: (window.innerHeight - h) / 2,
      left: (window.innerWidth - w) / 2
    };
  }

  function openFromImage(img) {
    if (activeImg === img) return;
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    activeImg = img;

    var rect = img.getBoundingClientRect();
    var radius = getComputedStyle(img).borderRadius || "14px";

    clone.src = img.currentSrc || img.src;
    clone.style.transition = "none";
    clone.style.top = rect.top + "px";
    clone.style.left = rect.left + "px";
    clone.style.width = rect.width + "px";
    clone.style.height = rect.height + "px";
    clone.style.borderRadius = radius;
    clone.classList.add("show");
    backdrop.classList.add("open");
    document.body.classList.add("lb-open");
    img.style.visibility = "hidden";

    if (reduceMotion) return;

    var target = targetBoxFor(rect);
    // force reflow so the browser registers the start position before animating
    void clone.offsetWidth;
    clone.style.transition = "";
    requestAnimationFrame(function () {
      clone.style.top = target.top + "px";
      clone.style.left = target.left + "px";
      clone.style.width = target.w + "px";
      clone.style.height = target.h + "px";
      clone.style.borderRadius = "18px";
    });
  }

  function closeLightbox() {
    if (!activeImg) return;
    var img = activeImg;
    activeImg = null;

    var rect = img.getBoundingClientRect();
    backdrop.classList.remove("open");
    document.body.classList.remove("lb-open");

    if (reduceMotion) {
      clone.classList.remove("show");
      img.style.visibility = "";
      return;
    }

    clone.style.top = rect.top + "px";
    clone.style.left = rect.left + "px";
    clone.style.width = rect.width + "px";
    clone.style.height = rect.height + "px";
    clone.style.borderRadius = getComputedStyle(img).borderRadius || "14px";

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      clone.classList.remove("show");
      img.style.visibility = "";
      clone.removeEventListener("transitionend", finish);
    }
    clone.addEventListener("transitionend", finish);
    closeTimer = setTimeout(finish, 550);
  }

  document.addEventListener("click", function (e) {
    var slot = e.target.closest && e.target.closest(".photo-slot");
    if (!slot || !slot.classList.contains("has-img")) return;
    if (document.body.classList.contains("edit-mode")) return; // edit mode: let wireSlot handle re-upload
    if (e.target.closest(".remove-btn")) return;
    var img = slot.querySelector("img");
    if (!img) return;
    openFromImage(img);
  });

  backdrop.addEventListener("click", closeLightbox);
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });
  window.addEventListener("resize", function () {
    if (activeImg) closeLightbox();
  });
})();

/* "+ tambah foto" dynamic slots, remembering count per group */
document.querySelectorAll(".add-slot-btn[data-add]").forEach(function (btn) {
  var group = btn.getAttribute("data-add");
  var countKey = PREFIX + "extra_" + group;
  var container = group === "gallery" ? document.getElementById("galleryGrid") : document.querySelector('.photo-grid[data-group="' + group + '"]');

  function addExtraSlot(persist, forcedIndex) {
    var extraCount = 0;
    try { extraCount = parseInt(localStorage.getItem(countKey) || "0", 10); } catch (e) {}
    var newIndex = forcedIndex != null ? forcedIndex : extraCount + 1;
    var id = group + "-extra-" + newIndex;
    if (isSlotDeleted(id)) return null; // owner removed this one previously — stays gone
    var el = makeSlotEl(id, "Foto baru");
    container.appendChild(el);
    if (container.id === "galleryGrid") { el.classList.add("win-open"); }
    wireSlot(el);
    if (persist) {
      try { localStorage.setItem(countKey, String(newIndex)); } catch (e) {}
    }
    return el;
  }

  // restore previously added extra slots — each gets its own sequential
  // index (1..existing) so they're distinct slots, not duplicates of one id
  var existing = 0;
  try { existing = parseInt(localStorage.getItem(countKey) || "0", 10); } catch (e) {}
  for (var i = 1; i <= existing; i++) { addExtraSlot(false, i); }

  btn.addEventListener("click", function () {
    if (!document.documentElement.classList.contains("is-owner")) return; // pengunjung biasa: tidak bisa nambah slot
    var el = addExtraSlot(true);
    if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  });
});

/* ============================================================
   5. PROJECT CARDS + GALLERY — build from data so structure stays consistent
============================================================ */
var projects = [
  { id: "tambakarts", name: "TambakArts", icon: "🎨", desc: "Ruang kreatif untuk eksplorasi desain dan karya visual." },
  { id: "filosofitambak", name: "Filosofi Tambak", icon: "🐟", desc: "Eksplorasi ide di persimpangan akuakultur dan makna hidup." },
  { id: "desainai", name: "Desain AI", icon: "🤖", desc: "Eksperimen desain dengan bantuan kecerdasan buatan." },
  { id: "poster", name: "Poster", icon: "🖼️", desc: "Kumpulan karya desain poster untuk berbagai acara." },
  { id: "video", name: "Video", icon: "🎬", desc: "Dokumentasi dan karya video." },
  { id: "freelance", name: "Freelance", icon: "💼", desc: "Proyek-proyek lepas yang pernah dikerjakan." }
];

var projectGrid = document.getElementById("projectGrid");
if (projectGrid) {
  projects.forEach(function (p) {
    var card = document.createElement("div");
    card.className = "card project-card";
    card.innerHTML =
      '<span class="card-icon">' + p.icon + '</span>' +
      '<h3 class="card-title">' + p.name + '</h3>' +
      '<p class="card-desc" contenteditable="false" data-key="proj-desc-' + p.id + '">' + p.desc + '</p>' +
      '<div class="photo-grid" data-group="proj-' + p.id + '">' +
      '  <div class="photo-slot" data-slot="proj-' + p.id + '-logo"><span class="ph-icon">+</span><span class="ph-label">Logo</span><input type="file" accept="image/*"><button class="remove-btn" type="button">×</button></div>' +
      '  <div class="photo-slot" data-slot="proj-' + p.id + '-shot"><span class="ph-icon">+</span><span class="ph-label">Screenshot</span><input type="file" accept="image/*"><button class="remove-btn" type="button">×</button></div>' +
      '</div>';
    projectGrid.appendChild(card);
    card.querySelectorAll(".photo-slot").forEach(wireSlot);
  });
}

var galleryGrid = document.getElementById("galleryGrid");
if (galleryGrid) {
  var galleryLabels = ["Selfie", "Pemandangan", "Kampus", "Teman", "Selfie", "Momen", "Momen", "Momen"];
  galleryLabels.forEach(function (label, idx) {
    var el = makeSlotEl("gallery-" + (idx + 1), label);
    galleryGrid.appendChild(el);
    wireSlot(el);
  });
}

/* re-run wiring in case elements were added after initial querySelectorAll (safety net) */
document.querySelectorAll(".photo-slot").forEach(function (slot) {
  if (!slot.dataset.wired) {
    slot.dataset.wired = "1";
  }
});

/* ============================================================
   6. EDIT MODE — contenteditable text + autosave
============================================================ */
var editBtn = document.getElementById("btnEditToggle");
var toolbarPanel = document.getElementById("toolbarPanel");

function loadEditableText() {
  document.querySelectorAll("[data-key]").forEach(function (el) {
    var key = el.getAttribute("data-key");
    var saved;
    try { saved = localStorage.getItem(PREFIX + "text_" + key); } catch (e) { saved = null; }
    if (saved !== null && saved !== "") {
      el.textContent = saved;
      el.classList.remove("placeholder-text");
    }
  });
}

function setEditMode(on) {
  document.body.classList.toggle("edit-mode", on);
  editBtn.classList.toggle("active", on);
  document.querySelectorAll("[data-key]").forEach(function (el) {
    el.setAttribute("contenteditable", on ? "true" : "false");
  });
  document.querySelectorAll(".chapter-story").forEach(function (el) {
    el.setAttribute("contenteditable", on ? "true" : "false");
  });
}

var saveTimers = {};
function debounceSave(el) {
  var key = el.getAttribute("data-key");
  if (!key) return;
  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(function () {
    try {
      localStorage.setItem(PREFIX + "text_" + key, el.textContent.trim());
      el.classList.remove("placeholder-text");
      showToast("Tersimpan ✓");
    } catch (e) {}
  }, 500);
}

document.addEventListener("input", function (e) {
  if (e.target && e.target.hasAttribute && e.target.hasAttribute("data-key")) {
    debounceSave(e.target);
  }
});

if (editBtn) {
  editBtn.addEventListener("click", function () {
    var willBeOn = !document.body.classList.contains("edit-mode");
    setEditMode(willBeOn);
    toolbarPanel.classList.toggle("open", willBeOn);
  });
}

loadEditableText();

/* ============================================================
   7. EXPORT / IMPORT / RESET
============================================================ */
var btnExport = document.getElementById("btnExport");
var btnImport = document.getElementById("btnImport");
var btnReset = document.getElementById("btnReset");
var importFile = document.getElementById("importFile");

function collectData() {
  var data = {};
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.indexOf(PREFIX) === 0) {
      data[k] = localStorage.getItem(k);
    }
  }
  return data;
}

if (btnExport) {
  btnExport.addEventListener("click", function () {
    var data = collectData();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "myjourney-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Data diekspor ✓");
  });
}

if (btnImport) {
  btnImport.addEventListener("click", function () { importFile.click(); });
}
if (importFile) {
  importFile.addEventListener("change", function () {
    var file = importFile.files && importFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        Object.keys(data).forEach(function (k) {
          if (k.indexOf(PREFIX) === 0) localStorage.setItem(k, data[k]);
        });
        showToast("Data diimpor — memuat ulang...");
        setTimeout(function () { location.reload(); }, 700);
      } catch (e) {
        showToast("File tidak valid");
      }
    };
    reader.readAsText(file);
  });
}

if (btnReset) {
  btnReset.addEventListener("click", function () {
    if (!confirm("Yakin ingin menghapus semua teks & foto yang sudah disimpan di browser ini?")) return;
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX) === 0) keys.push(k);
    }
    keys.forEach(function (k) { localStorage.removeItem(k); });
    location.reload();
  });
}

/* ============================================================
   8. TOAST
============================================================ */
var toast = document.getElementById("saveToast");
var toastTimer;
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 1600);
}

})();

/* ============================================================
   9. SCENE FX — birds, butterflies, leaves, petals, clouds, fog,
   grass, waving flag, floating sparkles and lens-flare glints,
   layered into every background scene (sky, mountains, forest,
   rumah, TK/SD/SMP/SMA, foreground). Each element is injected into
   the scene's own ".px-fx" container, which lives *inside*
   ".px-layer-drift" — so every bird/leaf/etc automatically inherits
   the same ambient sway, mouse parallax and scroll pop/recede as the
   artwork behind it, for free, with no extra work here.
   Runs once on DOMContentLoaded; skips quietly if a scene or the
   assets folder isn't present (so it never breaks the rest of the page).
============================================================ */
(function () {
  "use strict";

  var FX_BASE = "assets/effects/";
  var isMobile = window.innerWidth < 700;

  var KIND = {
    // "animated" = real multi-frame WEBP loops (actual wing flap, no CSS trickery
    // needed — the browser just plays the frames). Mixed in alongside the still
    // numbered PNGs for variety; if a file 404s the onerror handler in
    // spawnFlyer() quietly swaps it for a still frame instead.
    // `facing` tells the code which way that specific artwork is drawn facing,
    // so it can be flipped automatically to match its flight direction.
    bird: {
      folder: "birds", prefix: "birds", count: 25,
      animated: [
        { src: "birds/bird-flap-a.webp", facing: "right" },
        { src: "birds/bird-flap-b.webp", facing: "left" }
      ],
      // Kalau salah satu birds_01.png..birds_25.png ternyata gambarnya
      // menghadap KIRI (bukan kanan, default asumsi pack ini), tulis nomornya
      // di sini, misal [4, 11] — nanti otomatis di-flip biar gak "mundur"
      // waktu terbang ke kanan. Cukup dicek sekali lalu isi daftarnya.
      leftFacing: []
    },
    butterfly: {
      folder: "butterflies", prefix: "butterflies", count: 43,
      animated: [
        { src: "butterflies/butterfly-flap-a.webp", facing: "right" }
      ],
      leftFacing: []
    },
    leaf: { folder: "leaves", prefix: "leaves", count: 32 },
    petal: { folder: "petals", prefix: "petals", count: 42 },
    flare: { folder: "lensflare", prefix: "flare", count: 9 }
  };
  var ANIMATED_SHARE = 0.65; // fraction of birds/butterflies that get a real flapping loop

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function stillSrc(kind) {
    var k = KIND[kind];
    var n = Math.floor(Math.random() * k.count) + 1;
    return FX_BASE + k.folder + "/" + k.prefix + "_" + pad2(n) + ".png";
  }
  // Returns { src, needsFlip }. needsFlip means: this artwork faces the
  // opposite way from what the flight-direction CSS already assumes
  // (CSS assumes "faces right" by default and mirrors only the leftward
  // flights) — so we correct it with one extra mirror directly on the <img>,
  // which cancels out correctly for BOTH flight directions at once.
  function pickSprite(kind) {
    var k = KIND[kind];
    if (k.animated && k.animated.length && Math.random() < ANIMATED_SHARE) {
      var a = k.animated[Math.floor(Math.random() * k.animated.length)];
      return { src: FX_BASE + a.src, needsFlip: a.facing === "left" };
    }
    var n = Math.floor(Math.random() * k.count) + 1;
    var flip = !!(k.leftFacing && k.leftFacing.indexOf(n) !== -1);
    return { src: FX_BASE + k.folder + "/" + k.prefix + "_" + pad2(n) + ".png", needsFlip: flip };
  }
  function makeEl(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }
  function scaleCount(n) { return isMobile ? Math.max(1, Math.round(n * 0.55)) : n; }

  /* ---- flying creatures: birds & butterflies ---- */
  function spawnFlyer(container, kind, count, opts) {
    opts = opts || {};
    count = scaleCount(count);
    for (var i = 0; i < count; i++) {
      var dirR = Math.random() < 0.5;
      var wrap = makeEl("div", "fx-flyer fx-" + kind + " " + (dirR ? "fx-dir-r" : "fx-dir-l"));
      var inner = makeEl("div", "fx-flyer-inner");
      var img = document.createElement("img");
      var sprite = pickSprite(kind);
      img.src = sprite.src;
      img.alt = "";
      if (sprite.needsFlip) img.style.transform = "scaleX(-1)";
      img.onerror = (function (k) {
        return function () { this.onerror = null; this.style.transform = ""; this.src = stillSrc(k); };
      })(kind);
      inner.appendChild(img);
      wrap.appendChild(inner);

      var dur = rand(opts.durMin || 14, opts.durMax || 24);
      var delay = -rand(0, dur); // start mid-flight, staggered
      var top = rand(opts.topMin != null ? opts.topMin : 6, opts.topMax != null ? opts.topMax : 65);
      var scale = rand(opts.scaleMin || 0.55, opts.scaleMax || 1);

      wrap.style.top = top + "%";
      wrap.style.transform = "scale(" + scale.toFixed(2) + ")";
      inner.style.animationDuration = dur.toFixed(2) + "s";
      inner.style.animationDelay = delay.toFixed(2) + "s";
      container.appendChild(wrap);
    }
  }

  /* ---- falling leaves & petals ---- */
  function spawnFaller(container, kind, count, opts) {
    opts = opts || {};
    count = scaleCount(count);
    for (var i = 0; i < count; i++) {
      var wrap = makeEl("div", "fx-faller fx-" + kind);
      var inner = makeEl("div", "fx-faller-inner");
      var img = document.createElement("img");
      img.src = stillSrc(kind);
      img.alt = "";
      inner.appendChild(img);
      wrap.appendChild(inner);

      var dur = rand(opts.durMin || 9, opts.durMax || 18);
      var delay = -rand(0, dur);
      var left = rand(2, 92);
      var scale = rand(opts.scaleMin || 0.45, opts.scaleMax || 0.95);
      var drift = rand(-9, 9);

      wrap.style.left = left + "%";
      wrap.style.transform = "scale(" + scale.toFixed(2) + ")";
      inner.style.animationDuration = dur.toFixed(2) + "s";
      inner.style.animationDelay = delay.toFixed(2) + "s";
      inner.style.setProperty("--drift", drift.toFixed(1) + "vw");
      container.appendChild(wrap);
    }
  }

  /* ---- lens flare glints ---- */
  function spawnFlares(container, positions) {
    positions.forEach(function (pos) {
      var wrap = makeEl("div", "fx-flare");
      var img = document.createElement("img");
      img.src = stillSrc("flare");
      img.alt = "";
      wrap.appendChild(img);
      for (var k in pos) { if (pos.hasOwnProperty(k)) wrap.style[k] = pos[k]; }
      wrap.style.setProperty("--dur", rand(5, 9).toFixed(2) + "s");
      wrap.style.setProperty("--delay", (-rand(0, 6)).toFixed(2) + "s");
      container.appendChild(wrap);
    });
  }

  /* ---- whole-image ambient layers: clouds / fog / grass / particles ---- */
  function addImage(container, file, cls, fallbackFile) {
    var img = document.createElement("img");
    img.className = cls;
    img.src = FX_BASE + file;
    img.alt = "";
    if (fallbackFile) {
      img.onerror = function () { img.onerror = null; img.src = FX_BASE + fallbackFile; };
    }
    container.appendChild(img);
    return img;
  }

  function addFlag(container) {
    var wrap = makeEl("div", "fx-flag");
    var img = document.createElement("img");
    img.src = FX_BASE + "flag.png";
    img.alt = "Bendera Merah Putih berkibar";
    wrap.appendChild(img);
    container.appendChild(wrap);
  }

  /* ---- per-scene composition ---- */
  var SCENES = [
    { id: "pxSkyFx", build: function (c) {
        addImage(c, "clouds.png", "fx-cloud fx-cloud-a");
        addImage(c, "clouds-extra.png", "fx-cloud fx-cloud-b");
        spawnFlyer(c, "bird", 4, { topMin: 6, topMax: 34, durMin: 18, durMax: 28 });
        spawnFlares(c, [{ top: "8%", right: "14%" }, { top: "20%", right: "30%" }]);
    }},
    { id: "pxMountainsFx", build: function (c) {
        addImage(c, "clouds-extra.png", "fx-cloud fx-cloud-slow");
        spawnFlyer(c, "bird", 3, { topMin: 16, topMax: 46, durMin: 18, durMax: 27 });
        spawnFlares(c, [{ top: "12%", left: "18%" }]);
    }},
    { id: "pxForestFx", build: function (c) {
        /* this is the scene behind the "Menuju Muara — UGM" chapter —
           the richest set of effects lives here so nothing feels empty. */
        spawnFlyer(c, "bird", 5, { topMin: 4, topMax: 32, durMin: 15, durMax: 23 });
        spawnFlyer(c, "butterfly", 7, { topMin: 32, topMax: 74, durMin: 11, durMax: 18, scaleMin: 0.4, scaleMax: 0.75 });
        spawnFaller(c, "leaf", 9, { durMin: 9, durMax: 16 });
        addImage(c, "particles.png", "fx-particles");
        spawnFlares(c, [{ top: "9%", left: "10%" }, { top: "6%", right: "13%" }]);
        addFlag(c);
    }},
    { id: "pxHouseFx", build: function (c) {
        spawnFlyer(c, "butterfly", 6, { topMin: 36, topMax: 78, durMin: 10, durMax: 17 });
        spawnFaller(c, "petal", 9, { durMin: 11, durMax: 18 });
        addImage(c, "particles.png", "fx-particles fx-particles-dim");
    }},
    { id: "pxTKFx", build: function (c) {
        spawnFlyer(c, "butterfly", 5, { topMin: 18, topMax: 55, durMin: 9, durMax: 15, scaleMin: 0.35, scaleMax: 0.6 });
        addImage(c, "particles.png", "fx-particles fx-particles-dim");
    }},
    { id: "pxSDFx", build: function (c) {
        spawnFaller(c, "leaf", 7, { durMin: 8, durMax: 14, scaleMin: 0.3, scaleMax: 0.55 });
        addImage(c, "particles.png", "fx-particles fx-particles-dim");
    }},
    { id: "pxSMPFx", build: function (c) {
        spawnFaller(c, "petal", 7, { durMin: 9, durMax: 15, scaleMin: 0.3, scaleMax: 0.55 });
    }},
    { id: "pxSMAFx", build: function (c) {
        spawnFlyer(c, "bird", 3, { topMin: 8, topMax: 36, durMin: 14, durMax: 21, scaleMin: 0.3, scaleMax: 0.5 });
        spawnFlares(c, [{ top: "8%", right: "16%" }]);
        addImage(c, "particles.png", "fx-particles fx-particles-dim");
    }},
    { id: "pxForegroundFx", build: function (c) {
        addImage(c, "grass.png", "fx-grass fx-grass-a");
        addImage(c, "grass-extra.png", "fx-grass fx-grass-b");
        spawnFlyer(c, "bird", 2, { topMin: 4, topMax: 22, durMin: 17, durMax: 24, scaleMin: 0.4, scaleMax: 0.6 });
        spawnFaller(c, "leaf", 5, { durMin: 10, durMax: 17 });
        addImage(c, "particles.png", "fx-particles fx-particles-dim");
    }}
  ];

  function initSceneFX() {
    SCENES.forEach(function (s) {
      var c = document.getElementById(s.id);
      if (!c) return;
      try { s.build(c); } catch (e) { /* never let a missing asset break the page */ }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSceneFX);
  } else {
    initSceneFX();
  }
})();
