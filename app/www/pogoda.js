// Pogoda One Eastside (Open-Meteo, bez klucza; bez sieci ostatnia zapisana) – jedno źródło dla ekranu głównego (home.js)
// i paska dni (ppm-ui.js). Wydzielone z home.js 23/11/2026 (przeniesienie na Ionic + Vue).
//   OESTPogoda.load(force) → Promise<cache>   OESTPogoda.cache() → { t, now: { temp, c }, days: { 'RRRR-MM-DD': { c, hi, lo } } } | null
//   OESTPogoda.ikona(kod) → nazwa ikony Ionicons ('sunny', 'rainy'…)   OESTPogoda.dzien('RRRR-MM-DD') → nazwa ikony albo ''
(function (w) {
  "use strict";
  var LAT = 52.4797, LON = -1.8834; // One Eastside, Birmingham
  var WX_KEY = "oest.weather", WX_AGE = 3600000;
  // kod pogody → nazwa ikony Ionicons (ekran mapuje ją na ikonę; bez emoji w interfejsie)
  function wxIcon(c) {
    if (c == null) return "";
    if (c === 0) return "sunny"; if (c <= 2) return "partly-sunny"; if (c === 3) return "cloudy"; if (c <= 48) return "cloud";
    if (c >= 95) return "thunderstorm"; if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "snow"; if (c >= 80) return "rainy"; return "rainy";
  }
  function wxCache() { try { return JSON.parse(w.localStorage.getItem(WX_KEY) || "null"); } catch (e) { return null; } }
  var wxLoading = null;
  function wxLoad(force) {
    var c = wxCache();
    if (!force && c && Date.now() - c.t < WX_AGE) return Promise.resolve(c);
    if (!w.OESTNarzedzia.online() || !w.fetch) return Promise.resolve(c);
    if (wxLoading) return wxLoading;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + LAT + "&longitude=" + LON +
      "&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FLondon&forecast_days=14";
    wxLoading = w.fetch(url).then(function (r) { if (!r.ok) throw Error("WEATHER_HTTP"); return r.json(); }).then(function (j) {
      if (!j || !j.daily || !Array.isArray(j.daily.time)) throw Error("WEATHER_DATA");
      var days = {};
      j.daily.time.forEach(function (k, i) { days[k] = { c: j.daily.weather_code[i], hi: Math.round(j.daily.temperature_2m_max[i]), lo: Math.round(j.daily.temperature_2m_min[i]) }; });
      var out = { t: Date.now(), now: j.current ? { temp: Math.round(j.current.temperature_2m), c: j.current.weather_code } : null, days: days };
      try { w.localStorage.setItem(WX_KEY, JSON.stringify(out)); } catch (e) {}
      return out;
    }).catch(function () { return c; }).finally(function () { wxLoading = null; });
    return wxLoading;
  }

  function wxDay(k) { var c = wxCache(), dd = (c && c.days) || {}; return dd[k] ? wxIcon(dd[k].c) : ""; }
  w.OESTPogoda = { load: wxLoad, cache: wxCache, ikona: wxIcon, dzien: wxDay };
})(window);
