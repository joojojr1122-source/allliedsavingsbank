(function () {
  if (document.body.dataset.page !== "home") return;

  const importantLinksDrop = document.querySelector("#importantLinksDrop");
  const internetBankingDrop = document.querySelector("#internetBankingDrop");
  const branchType = document.querySelector("#branchType");
  const branchName = document.querySelector("#branchName");
  const groupSitesMenu = document.querySelector("#groupSitesMenu");
  const footerYear = document.querySelector("#footerYear");

  if (footerYear) {
    footerYear.textContent = String(new Date().getFullYear());
  }

  importantLinksDrop?.querySelector("button")?.addEventListener("click", (event) => {
    event.stopPropagation();
    importantLinksDrop.classList.toggle("is-open");
    internetBankingDrop?.classList.remove("is-open");
  });

  internetBankingDrop?.querySelector("button")?.addEventListener("click", (event) => {
    event.stopPropagation();
    internetBankingDrop.classList.toggle("is-open");
    importantLinksDrop?.classList.remove("is-open");
  });

  document.addEventListener("click", () => {
    importantLinksDrop?.classList.remove("is-open");
    internetBankingDrop?.classList.remove("is-open");
  });

  const branchOptions = {
    1: ["Head Office & London Branch"],
    2: ["Global Banking Department"],
    3: ["Customer Contact Center"],
    4: ["Harringay Branch"],
    5: ["Palmers Green Branch"],
    6: ["Commercial Branch"]
  };

  branchType?.addEventListener("change", () => {
    const value = branchType.value;
    const options = branchOptions[value] || [];
    branchName.innerHTML = "";
    branchName.disabled = !options.length;

    if (!options.length) {
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "sube";
      branchName.appendChild(placeholder);
      return;
    }

    options.forEach((label) => {
      const option = document.createElement("option");
      option.value = label;
      option.textContent = label;
      branchName.appendChild(option);
    });
  });

  groupSitesMenu?.addEventListener("change", () => {
    const url = groupSitesMenu.value;
    if (url) {
      window.open(url, "_blank", "noopener");
      groupSitesMenu.value = "";
    }
  });
})();
