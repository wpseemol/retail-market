/* Kept for cache/CDN leftovers — live anti-FOUC is the inline head script in layout. */
(function () {
  try {
    var k = "niyenin-theme";
    var t = null;
    try {
      t = localStorage.getItem(k);
    } catch (_e) {}
    if (t !== "dark" && t !== "light") {
      var m = document.cookie.match(/(?:^|; )niyenin-theme=([^;]*)/);
      t = m ? decodeURIComponent(m[1]) : "light";
    }
    var d = document.documentElement;
    if (t === "dark") {
      d.classList.add("dark");
      d.style.colorScheme = "dark";
    } else {
      d.classList.remove("dark");
      d.style.colorScheme = "light";
    }
    try {
      localStorage.setItem(k, t);
    } catch (_e) {}
    document.cookie =
      "niyenin-theme=" + t + "; Path=/; Max-Age=31536000; SameSite=Lax";
  } catch (_e) {}
})();
