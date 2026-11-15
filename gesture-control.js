// Optional local TensorFlow.js camera control. Keyboard and touch work without this file.
(() => {
  "use strict";
  const LABELS = ["fist", "peace", "ok_sign", "thumbs_up", "background"];
  const NAMES = ["FIST", "PEACE", "OK SIGN", "THUMBS UP"];
  const CONFIDENCE = 0.90;
  const HOLD_MS = 600;
  const COOLDOWN_MS = 1200;
  const INTERVAL_MS = 100;
  const panel = document.getElementById("gesturePanel");
  const video = document.getElementById("gestureVideo");
  const guide = document.getElementById("gestureGuide");
  const status = document.getElementById("gestureStatus");
  const holdFill = document.getElementById("gestureHoldFill");
  const moves = document.getElementById("gestureMoves");
  let stream = null, model = null, enabled = false, ready = false;
  let runId = 0, predicting = false, candidate = -1, candidateSince = 0, cooldownUntil = 0;
  let moveNames = [];

  function setStatus(message) { status.textContent = message; }
  function setMoveNames(names) {
    moveNames = names || [];
    moves.replaceChildren();
    NAMES.forEach((name, index) => {
      const label = document.createElement("span");
      label.title = `${name} → ${moveNames[index] || "no move"}`;
      label.textContent = `${name}: ${moveNames[index] || "—"}`;
      moves.appendChild(label);
    });
  }
  function resetCandidate() { candidate = -1; candidateSince = 0; holdFill.style.width = "0%"; }
  function announceMode() { window.dispatchEvent(new Event("gesture-mode-change")); }
  function disable() {
    runId++; enabled = false; ready = false; predicting = false; resetCandidate();
    if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }
    video.pause(); video.srcObject = null; panel.hidden = true; setStatus("Camera off."); announceMode();
  }
  function loadRuntime() {
    if (window.tf) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "./vendor/tf.min.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Local TensorFlow.js runtime could not load."));
      document.head.appendChild(script);
    });
  }
  async function loadModel() {
    await loadRuntime();
    const response = await fetch("./gesture_model/labels.json");
    if (!response.ok) throw new Error("Gesture labels could not load.");
    const labels = await response.json();
    if (JSON.stringify(labels) !== JSON.stringify(LABELS)) throw new Error("Gesture labels do not match the game controls.");
    if (!model) model = await tf.loadLayersModel("./gesture_model/model.json");
    const probe = tf.zeros([1, 224, 224, 3]);
    const output = model.predict(probe);
    const shape = output.shape.join("x");
    output.dispose(); probe.dispose();
    if (shape !== "1x5") throw new Error(`Unexpected model output ${shape}.`);
  }
  async function enable() {
    if (enabled) return true;
    panel.hidden = false; setMoveNames(moveNames); setStatus("Starting camera...");
    if (location.protocol === "file:") {
      setStatus("Camera mode needs localhost or HTTPS. Keyboard mode still works.");
      return false;
    }
    const id = ++runId;
    try {
      // Request permission while this is still the user's click or key action.
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false
      });
      if (id !== runId) { camera.getTracks().forEach(track => track.stop()); return false; }
      stream = camera; video.srcObject = stream; await video.play();
      const cropWidth = 100 * Math.min(video.videoWidth, video.videoHeight, 420) / video.videoWidth;
      guide.style.width = `${cropWidth}%`; guide.style.left = `${(100 - cropWidth) / 2}%`;
      setStatus("Loading local gesture model...");
      await loadModel();
      if (id !== runId) return false;
      enabled = true; ready = true; resetCandidate(); announceMode();
      setStatus("Ready. Hold a gesture during battle.");
      predictLoop(id);
      return true;
    } catch (error) {
      if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }
      video.srcObject = null; enabled = false; ready = false;
      setStatus(`Camera unavailable: ${error.message}. Keyboard still works.`);
      announceMode();
      return false;
    }
  }
  function preprocessFrame() {
    return tf.tidy(() => {
      const pixels = tf.browser.fromPixels(video, 3);
      const [height, width] = pixels.shape;
      const side = Math.min(height, width, 420);
      const top = Math.floor((height - side) / 2), left = Math.floor((width - side) / 2);
      const crop = pixels.slice([top, left, 0], [side, side, 3]);
      const resized = tf.image.resizeBilinear(crop, [224, 224], true);
      return resized.reverse(1).toFloat().div(127.5).sub(1).expandDims(0);
    });
  }
  function acceptPrediction(probabilities, now) {
    const index = probabilities.indexOf(Math.max(...probabilities));
    const confidence = probabilities[index];
    const canAttack = window.canUseGestureAttack && window.canUseGestureAttack();
    if (!canAttack) { resetCandidate(); setStatus(`${NAMES[index] || "BACKGROUND"} ${Math.round(confidence * 100)}% · waiting for battle menu`); return; }
    setStatus(`${NAMES[index] || "BACKGROUND"} ${Math.round(confidence * 100)}% · ${moveNames[index] || "no move"}`);
    if (index === 4 || !moveNames[index] || confidence < CONFIDENCE || now < cooldownUntil) { resetCandidate(); return; }
    if (candidate !== index) { candidate = index; candidateSince = now; }
    const progress = Math.min(1, (now - candidateSince) / HOLD_MS);
    holdFill.style.width = `${Math.round(progress * 100)}%`;
    if (progress < 1) return;
    resetCandidate();
    if (window.submitGestureMove?.(index, "gesture")) cooldownUntil = now + COOLDOWN_MS;
  }
  async function predictLoop(id) {
    if (!ready || id !== runId) return;
    if (!predicting && video.readyState >= 2) {
      predicting = true;
      let input, output;
      try {
        input = preprocessFrame(); output = model.predict(input);
        const probabilities = Array.from(await output.data());
        if (id === runId) acceptPrediction(probabilities, performance.now());
      } catch (error) {
        setStatus(`Prediction stopped: ${error.message}. Keyboard still works.`);
        ready = false;
      } finally {
        output?.dispose(); input?.dispose(); predicting = false;
      }
    }
    if (ready && id === runId) setTimeout(() => predictLoop(id), INTERVAL_MS);
  }
  document.getElementById("gestureClose").addEventListener("click", disable);
  setMoveNames([]);
  window.GestureCV = { enable, disable, isEnabled: () => enabled, setMoveNames };
})();
