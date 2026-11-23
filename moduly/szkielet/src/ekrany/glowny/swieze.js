// Okienka ekranu głównego pokazują świeże dane (jak na main: okienko otwarte = przerysowane po każdej zmianie, np. „Później”,
// wczytana prognoza, wynik Dysku, nowości): po zdarzeniu „oest:home” dane okienka czytane od nowa z OESTHome (zrodlo).
import { ref, onMounted, onUnmounted } from 'vue';
export function swieze(props) {
  const dane = ref(props.p);
  let trwa = false; // źródło samo może wysłać „oest:home” (np. nowości oznaczone jako przeczytane) – bez pętli
  const f = () => { if (trwa || !props.zrodlo) return; trwa = true; try { dane.value = props.zrodlo(); } finally { trwa = false; } };
  onMounted(() => window.addEventListener('oest:home', f));
  onUnmounted(() => window.removeEventListener('oest:home', f));
  return dane;
}
