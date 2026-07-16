/**
 * Shared Flutterwave checkout modal, used by main-offer.html, budget-offer.html,
 * and the live-access button on dashboard.html.
 *
 * This modal handles order confirmation and payment-method selection (card
 * vs bank transfer) — the actual sensitive payment entry happens inside
 * Flutterwave's own secure checkout modal, which we open on top of this one.
 * We deliberately never build custom card-number/CVV fields ourselves: that
 * would pull raw card data through our code and trigger PCI-DSS obligations
 * neither this static site nor Convex is set up to carry.
 *
 * TODO(backend): replace with your real Flutterwave PUBLIC key (safe to
 * expose client-side — this is not the secret key).
 */
window.NCA_FLW_PUBLIC_KEY = "FLWPUBK_TEST-REPLACE-WITH-YOUR-PUBLIC-KEY-X";

(function () {
  var TIER_META = {
    budget_2500: { label: "Budget Offer", price: "₦2,500", description: "Raw video recordings, no ebook" },
    main_3500: { label: "Main Offer", price: "₦3,500", description: "Video recordings + ebook" },
    live_5000: { label: "Live Access Upgrade", price: "₦5,000", description: "Join the live cohort sessions" },
  };

  var modalRoot = null;

  function ensureModal() {
    if (modalRoot) return modalRoot;

    modalRoot = document.createElement("div");
    modalRoot.id = "nca-checkout-modal";
    modalRoot.className = "fixed inset-0 z-[999] hidden items-center justify-center p-4";
    modalRoot.innerHTML =
      '<div class="absolute inset-0 bg-[#0B1C30]/60 backdrop-blur-sm" data-modal-backdrop></div>' +
      '<div class="relative bg-surface w-full max-w-md rounded-2xl p-6 md:p-8 card-shadow transform transition-all duration-300 scale-95 opacity-0" data-modal-panel>' +
      '<button class="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors" data-modal-close type="button" aria-label="Close">' +
      '<span class="material-symbols-outlined">close</span>' +
      "</button>" +
      '<div class="text-center mb-6">' +
      '<span class="text-3xl mb-2 inline-block">🛒</span>' +
      '<h3 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface" data-modal-title>Confirm Your Order</h3>' +
      '<p class="font-body-sm text-body-sm text-on-surface-variant mt-1" data-modal-description></p>' +
      "</div>" +
      '<div class="bg-[#F8FAFC] rounded-xl p-4 flex items-center justify-between mb-6">' +
      '<span class="font-body-md text-body-md text-on-surface-variant" data-modal-item-label></span>' +
      '<span class="font-headline-lg-mobile text-headline-lg-mobile text-primary-container" data-modal-item-price></span>' +
      "</div>" +
      '<div class="mb-6">' +
      '<label class="block font-label-bold text-label-bold text-on-surface mb-3">Choose how you\'d like to pay</label>' +
      '<div class="grid grid-cols-2 gap-3" data-modal-method-group>' +
      '<button class="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-primary-container bg-[#F0F9FF] transition-all" data-method="card" type="button">' +
      '<span class="text-2xl">💳</span><span class="font-label-bold text-label-bold text-on-surface text-sm">Card</span>' +
      "</button>" +
      '<button class="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-[#E2E8F0] bg-white transition-all" data-method="banktransfer" type="button">' +
      '<span class="text-2xl">🏦</span><span class="font-label-bold text-label-bold text-on-surface text-sm">Bank Transfer</span>' +
      "</button>" +
      "</div>" +
      "</div>" +
      '<button class="w-full bg-primary-container text-on-primary font-label-bold text-label-bold py-4 rounded-lg hover:bg-primary transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2" data-modal-pay type="button">' +
      '<span data-modal-pay-label>Pay Securely Now 🔒</span>' +
      "</button>" +
      '<p class="text-center font-body-sm text-body-sm text-on-surface-variant mt-4" data-modal-status></p>' +
      "</div>";

    document.body.appendChild(modalRoot);

    var panel = modalRoot.querySelector("[data-modal-panel]");
    var selectedMethod = "card";

    modalRoot.querySelectorAll("[data-method]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectedMethod = btn.getAttribute("data-method");
        modalRoot.querySelectorAll("[data-method]").forEach(function (b) {
          b.classList.remove("border-primary-container", "bg-[#F0F9FF]");
          b.classList.add("border-[#E2E8F0]", "bg-white");
        });
        btn.classList.remove("border-[#E2E8F0]", "bg-white");
        btn.classList.add("border-primary-container", "bg-[#F0F9FF]");
      });
    });

    function close() {
      panel.classList.add("scale-95", "opacity-0");
      setTimeout(function () {
        modalRoot.classList.add("hidden");
        modalRoot.classList.remove("flex");
      }, 200);
    }

    modalRoot.querySelector("[data-modal-close]").addEventListener("click", close);
    modalRoot.querySelector("[data-modal-backdrop]").addEventListener("click", close);

    modalRoot._open = function (tier, onPay) {
      var meta = TIER_META[tier];
      modalRoot.querySelector("[data-modal-description]").textContent = meta.description;
      modalRoot.querySelector("[data-modal-item-label]").textContent = meta.label;
      modalRoot.querySelector("[data-modal-item-price]").textContent = meta.price;
      modalRoot.querySelector("[data-modal-status]").textContent = "";
      selectedMethod = "card";
      modalRoot.querySelectorAll("[data-method]").forEach(function (b) {
        b.classList.remove("border-primary-container", "bg-[#F0F9FF]");
        b.classList.add("border-[#E2E8F0]", "bg-white");
      });
      modalRoot.querySelector('[data-method="card"]').classList.remove("border-[#E2E8F0]", "bg-white");
      modalRoot.querySelector('[data-method="card"]').classList.add("border-primary-container", "bg-[#F0F9FF]");

      modalRoot.classList.remove("hidden");
      modalRoot.classList.add("flex");
      requestAnimationFrame(function () {
        panel.classList.remove("scale-95", "opacity-0");
      });

      var payBtn = modalRoot.querySelector("[data-modal-pay]");
      var payLabel = modalRoot.querySelector("[data-modal-pay-label]");
      var statusEl = modalRoot.querySelector("[data-modal-status]");

      var handler = function () {
        payBtn.disabled = true;
        payLabel.textContent = "Preparing checkout…";
        statusEl.textContent = "";
        onPay(selectedMethod, {
          onReady: function () {
            payBtn.disabled = false;
            payLabel.textContent = "Pay Securely Now 🔒";
          },
          onStatus: function (text) {
            statusEl.textContent = text;
          },
          onDone: close,
        });
      };
      payBtn.replaceWith(payBtn.cloneNode(true)); // clear previous listener
      payBtn = modalRoot.querySelector("[data-modal-pay]");
      payBtn.addEventListener("click", handler);
    };

    return modalRoot;
  }

  /**
   * Public entry point. Call with a tier and the lead's contact info; handles
   * the whole flow: order-confirmation modal -> Flutterwave checkout ->
   * server-side verification -> redirect.
   */
  window.ncaOpenCheckout = function (tier, lead, redirectTo) {
    var modal = ensureModal();
    modal._open(tier, async function (method, ui) {
      try {
        var result = await window.ncaClient.mutation("purchases:create", {
          leadEmail: lead.email,
          tier: tier,
        });

        ui.onReady();
        ui.onStatus("Opening secure payment window…");

        var paymentOptions = method === "card" ? "card" : "banktransfer";

        window.FlutterwaveCheckout({
          public_key: window.NCA_FLW_PUBLIC_KEY,
          tx_ref: result.txRef,
          amount: result.amount,
          currency: result.currency,
          payment_options: paymentOptions,
          customer: {
            email: lead.email,
            phone_number: lead.phone,
            name: (lead.firstName || "") + " " + (lead.lastName || ""),
          },
          customizations: {
            title: "NoCode Academy",
            description: TIER_META[tier].label,
          },
          callback: async function (data) {
            ui.onStatus("Confirming your payment… 🔍");
            try {
              var verification = await window.ncaClient.action("payments:verifyTransaction", {
                transactionId: String(data.transaction_id),
                purchaseId: result.purchaseId,
              });
              if (verification.success) {
                ui.onStatus("Payment confirmed! 🎉 Redirecting…");
                setTimeout(function () {
                  ui.onDone();
                  window.location.href = redirectTo;
                }, 900);
              } else {
                ui.onStatus("We couldn't confirm this payment yet. If you were charged, it will be reconciled automatically shortly.");
              }
            } catch (err) {
              console.error("Verification failed:", err);
              ui.onStatus("We couldn't confirm this payment. Please contact support if you were charged.");
            }
          },
          onclose: function () {
            ui.onStatus("Payment window closed.");
          },
        });
      } catch (err) {
        console.error("Failed to start checkout:", err);
        ui.onReady();
        ui.onStatus("Something went wrong starting checkout. Please try again.");
      }
    });
  };
})();
