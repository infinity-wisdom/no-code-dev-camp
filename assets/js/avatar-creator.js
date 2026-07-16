/**
 * Dashboard avatar creator. Fully client-side: the uploaded photo is read
 * via FileReader and drawn straight to a <canvas> — it's never sent to
 * Convex or anywhere else. This matters because photos are personal data;
 * there's no reason for this feature to need a backend at all.
 */
(function () {
  var canvas, ctx, uploadedImg = null, theme = "blue";

  var THEMES = {
    blue: { bg1: "#1A56DB", bg2: "#38BDF8", ring1: "#38BDF8", ring2: "#ffffff" },
    navy: { bg1: "#0B1C30", bg2: "#1A56DB", ring1: "#38BDF8", ring2: "#7bd0ff" },
  };

  function init() {
    canvas = document.getElementById("avatar-canvas");
    if (!canvas) return; // not on this page
    ctx = canvas.getContext("2d");
    drawEmptyState();

    var fileInput = document.getElementById("avatar-file-input");
    var dropZone = document.getElementById("avatar-drop-zone");
    var downloadBtn = document.getElementById("avatar-download-btn");
    var themeButtons = document.querySelectorAll("[data-avatar-theme]");

    dropZone.addEventListener("click", function () { fileInput.click(); });

    fileInput.addEventListener("change", function (e) {
      if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    });

    ["dragover", "dragenter"].forEach(function (evt) {
      dropZone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropZone.classList.add("border-primary-container");
      });
    });
    ["dragleave", "drop"].forEach(function (evt) {
      dropZone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropZone.classList.remove("border-primary-container");
      });
    });
    dropZone.addEventListener("drop", function (e) {
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    themeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        theme = btn.getAttribute("data-avatar-theme");
        themeButtons.forEach(function (b) { b.classList.remove("ring-2", "ring-primary-container", "ring-offset-2"); });
        btn.classList.add("ring-2", "ring-primary-container", "ring-offset-2");
        if (uploadedImg) render();
      });
    });

    downloadBtn.addEventListener("click", function () {
      if (!uploadedImg) return;
      var link = document.createElement("a");
      link.download = "nocode-developers-camp-avatar.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      if (window.ncaConfetti) window.ncaConfetti(downloadBtn);
    });
  }

  function handleFile(file) {
    if (!file.type || file.type.indexOf("image/") !== 0) return;
    var reader = new FileReader();
    reader.onload = function (evt) {
      var img = new Image();
      img.onload = function () {
        uploadedImg = img;
        render();
        var downloadBtn = document.getElementById("avatar-download-btn");
        if (downloadBtn) downloadBtn.disabled = false;
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  function drawEmptyState() {
    var size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    roundRectPath(0, 0, size, size, 24);
    ctx.fillStyle = "#F0F9FF";
    ctx.fill();
    ctx.fillStyle = "#94A3B8";
    ctx.font = "600 20px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Upload a photo to preview", size / 2, size / 2 - 10);
    ctx.fillText("your avatar", size / 2, size / 2 + 22);
  }

  function render() {
    var t = THEMES[theme];
    var size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    var grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, t.bg1);
    grad.addColorStop(1, t.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle dot texture, matching the dashboard hero background
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (var y = 10; y < size; y += 26) {
      for (var x = 10; x < size; x += 26) {
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    var cx = size / 2;
    var cy = size / 2 - size * 0.05;
    var r = size * 0.32;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    drawImageCover(uploadedImg, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = t.ring2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r + 15, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = t.ring1;
    ctx.stroke();

    // Badge icon, echoes the site's CodeCave mark
    var bx = cx + r * 0.68, by = cy + r * 0.68, br = size * 0.058;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.font = "700 " + Math.round(br * 0.95) + "px 'Courier New', monospace";
    ctx.fillStyle = t.bg1;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("</>", bx, by + 1);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 " + Math.round(size * 0.052) + "px Inter, sans-serif";
    ctx.fillText("CodeCave", size / 2, size * 0.88);
    ctx.font = "600 " + Math.round(size * 0.028) + "px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("NOCODE DEVELOPERS CAMP · 2026", size / 2, size * 0.935);
  }

  function drawImageCover(img, x, y, w, h) {
    var imgRatio = img.width / img.height;
    var boxRatio = w / h;
    var sx, sy, sw, sh;
    if (imgRatio > boxRatio) {
      sh = img.height;
      sw = sh * boxRatio;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = sw / boxRatio;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function roundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
