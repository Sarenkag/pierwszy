// Zależności od aplikacji wstrzykiwane do wspólnych modułów na obu stronach.
(function (w) {
  "use strict";
  if (w.OESTRaporty) w.OESTRaporty.configure({ drive: function() { var g = w.OESTGoogle; return { ensureFolder: g.ensureFolder, find: g.findFile, upload: g.uploadFile, update: g.updateFile, list: g.listFiles, download: g.downloadFile }; } });
  w.OESTBledy.configure({ language: function () { return w.OESTSettings.get().appearance.language; } });
  w.OESTSender.configure({
    google: function () { return w.OESTGoogle; },
    clientConfigured: function () { return !!(w.OEST_CONFIG || {}).googleWebClientId; },
    markSent: function (ppm, id) { if (w.OEST_PPM && w.OEST_PPM.markSent) w.OEST_PPM.markSent(ppm, id); }
  });
})(window);
