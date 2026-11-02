(function () {
  try {
    var t = localStorage.getItem("niyenin-theme") || "light";
    var d = document.documentElement;
    if (t === "dark") {
      d.classList.add("dark");
      d.style.colorScheme = "dark";
    } else {
      d.classList.remove("dark");
      d.style.colorScheme = "light";
    }
  } catch (_e) {}
})();
