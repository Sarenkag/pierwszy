<template>
  <ion-list>
    <template v-for="(sekcja, i) in d.sekcje" :key="i">
      <ion-list-header>{{ sekcja.tytul }}</ion-list-header>
      <template v-for="(r, j) in sekcja.pola" :key="j">
        <ion-item v-if="!r.radio || r.wartosc === '1'">
          <ion-checkbox v-if="!r.radio" :data-sn="r.klucz" :checked="r.wybrane" :disabled="r.blokada" />
          <ion-select v-else name="sn-one" :value="r.wybrane ? '1' : '0'">
            <ion-select-option v-for="o in sekcja.pola.filter(x => x.radio)" :key="o.wartosc" :value="o.wartosc">{{ o.tekst }}</ion-select-option>
          </ion-select>
          <ion-label v-if="!r.radio">{{ r.tekst }}<small v-if="r.uwaga"> {{ r.uwaga }}</small></ion-label>
        </ion-item>
      </template>
    </template>
  </ion-list>
</template>
<script setup>
import { uzyjKontrolera } from '../../czesci/kontroler.js';
const props = defineProps({ kontroler: Object });
const d = uzyjKontrolera(props.kontroler);
</script>
