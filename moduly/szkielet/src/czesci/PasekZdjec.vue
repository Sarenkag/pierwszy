<!-- Moduł: pasek zdjęć – jeden w całej apce (Grzegorz 25.11.2026: „jeden moduł, zmiana w nim działa wszędzie”).
     Miniatury (MiniaturaZdjecia.vue) w jednym rzędzie przesuwanym palcem w bok. Dotknięcie miniatury = okienko apki
     „Powiększ zdjęcie” / „Edytuj zdjęcie” / „Usuń zdjęcie”; Usuń pyta „Czy na pewno chcesz usunąć zdjęcie?” Tak / Nie.
     Wejście: lista [{ klucz, url, alt, numer }], edycja / usuwanie (które opcje pokazać). Wyjście: zdarzenia „edytuj” i „usun” z pozycją listy –
     samą edycję i usuwanie robi miejsce, które podpina pasek (istniejące akcje, bez kopii). Slot „znaczniki” (p): dodatki pod miniaturą. -->
<template>
  <ion-grid v-if="lista.length" data-ui="pasek-zdjec">
    <MiniaturaZdjecia v-for="p in lista" :key="p.klucz" :src="p.url" :alt="p.alt" :numer="p.numer" @wybierz="opcje(p)"><slot name="znaczniki" :p="p" /></MiniaturaZdjecia>
  </ion-grid>
</template>

<script setup>
import { IonGrid } from '@ionic/vue';
import MiniaturaZdjecia from './MiniaturaZdjecia.vue';
import PowiekszoneZdjecie from './PowiekszoneZdjecie.vue';
const props = defineProps({ lista: { type: Array, default: () => [] }, edycja: Boolean, usuwanie: { type: Boolean, default: true }, T: { type: Function, default: (pl) => pl } });
const emit = defineEmits(['edytuj', 'usun']);
async function opcje(p) {
  const T = props.T, O = window.OESTOkna;
  const lista = [{ tekst: T('Powiększ zdjęcie', 'Zoom photo'), wartosc: 'powieksz' }];
  if (props.edycja) lista.push({ tekst: T('Edytuj zdjęcie', 'Edit photo'), wartosc: 'edytuj' });
  if (props.usuwanie) lista.push({ tekst: T('Usuń zdjęcie', 'Delete photo'), wartosc: 'usun', niebezpieczne: true });
  const wybor = await O.wybor({ tytul: p.alt, opcje: lista });
  if (wybor === 'powieksz') O.okno({ tytul: p.alt, komponent: PowiekszoneZdjecie, wlasciwosci: { url: p.url, alt: p.alt }, ok: T('Zamknij', 'Close'), anuluj: false, wyglad: 'zdjecie' }).catch(() => {});
  if (wybor === 'edytuj') emit('edytuj', p);
  if (wybor === 'usun' && await O.pytaj({ tytul: T('Czy na pewno chcesz usunąć zdjęcie?', 'Are you sure you want to delete the photo?'), ok: T('Tak', 'Yes'), anuluj: T('Nie', 'No'), niebezpieczne: true })) emit('usun', p);
}
</script>
