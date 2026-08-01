/**
 * Dashboard avatar creator — v2, using the real flyer artwork as the template.
 *
 * Still fully client-side: the uploaded photo is read via FileReader and
 * drawn straight to <canvas>. It's never sent to Convex or anywhere else.
 *
 * Geometry below (circle center/radius, ring color) was measured directly
 * from assets/images/avatar-flyer-template.png at its native 1080x1350
 * resolution — if that artwork file is ever replaced with a redesigned
 * flyer, these numbers need to be re-measured to match the new circle.
 */
(function () {
  var TEMPLATE_SRC = "./assets/images/avatar-flyer-template.png";
  var TEMPLATE_W = 1080;
  var TEMPLATE_H = 1350;

  // The circular photo slot baked into the flyer artwork.
  var CIRCLE_CX = 748;
  var CIRCLE_CY = 631;
  var CIRCLE_OUTER_R = 302; // covers right up to the outer edge of the blue ring
  var CIRCLE_INNER_R = 292; // where the ring's inner edge sits
  var RING_COLOR = "#004AAD"; // measured as rgb(0, 74, 173)
  var RING_WIDTH = 11;

  var canvas, ctx, templateImg, uploadedImg = null, templateLoaded = false;

  function init() {
    canvas = document.getElementById("avatar-canvas");
    if (!canvas) return; // not on this page

    ctx = canvas.getContext("2d");
    canvas.width = TEMPLATE_W;
    canvas.height = TEMPLATE_H;

    templateImg = new Image();
    templateImg.onload = function () {
      templateLoaded = true;
      drawTemplate();
    };
    templateImg.src = TEMPLATE_SRC;

    var fileInput = document.getElementById("avatar-file-input");
    var dropZone = document.getElementById("avatar-drop-zone");
    var downloadBtn = document.getElementById("avatar-download-btn");

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

    downloadBtn.addEventListener("click", function () {
      if (!uploadedImg) return;
      var link = document.createElement("a");
      link.download = "nocode-developers-camp-flyer.png";
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

  /** Before a photo is uploaded, just show the flyer as-is (it already looks complete). */
  function drawTemplate() {
    if (!templateLoaded) return;
    ctx.clearRect(0, 0, TEMPLATE_W, TEMPLATE_H);
    ctx.drawImage(templateImg, 0, 0, TEMPLATE_W, TEMPLATE_H);
  }

  /** After upload: template, then the photo clipped into the circle, then the ring redrawn on top. */
  function render() {
    if (!templateLoaded || !uploadedImg) return;

    ctx.clearRect(0, 0, TEMPLATE_W, TEMPLATE_H);
    ctx.drawImage(templateImg, 0, 0, TEMPLATE_W, TEMPLATE_H);

    ctx.save();
    ctx.beginPath();
    ctx.arc(CIRCLE_CX, CIRCLE_CY, CIRCLE_OUTER_R, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    drawImageCover(
      uploadedImg,
      CIRCLE_CX - CIRCLE_OUTER_R,
      CIRCLE_CY - CIRCLE_OUTER_R,
      CIRCLE_OUTER_R * 2,
      CIRCLE_OUTER_R * 2,
    );
    ctx.restore();

    // Redraw the ring on top so it frames the photo cleanly, covering any
    // edge softness from the clip above.
    ctx.beginPath();
    ctx.arc(CIRCLE_CX, CIRCLE_CY, (CIRCLE_OUTER_R + CIRCLE_INNER_R) / 2, 0, Math.PI * 2);
    ctx.lineWidth = RING_WIDTH;
    ctx.strokeStyle = RING_COLOR;
    ctx.stroke();
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

  document.addEventListener("DOMContentLoaded", init);
})();
