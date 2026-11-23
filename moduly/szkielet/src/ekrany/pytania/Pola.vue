<!-- Zdania raportu EN pytania: OK / Nie OK, poziomy skali albo wzór pomiaru. Używane w edytorze pytania i w nadpisaniu dla inspekcji. -->
<template>
  <div>
    <template v-if="typ === 'pass'">
      <ion-item>
        <ion-textarea fill="solid" :id="pre + 'ok'" :label="T('Zdanie EN — OK', 'EN sentence — OK')" label-placement="stacked" :auto-grow="true" :rows="2" :value="obj.ok" @ionInput="ust('ok', $event.detail.value)"></ion-textarea>
      </ion-item>
      <ion-item>
        <ion-textarea fill="solid" :id="pre + 'fail'" :label="T('Zdanie EN — Nie OK', 'EN sentence — Not OK')" label-placement="stacked" :auto-grow="true" :rows="2" :value="obj.fail" @ionInput="ust('fail', $event.detail.value)"></ion-textarea>
      </ion-item>
    </template>
    <template v-else-if="typ === 'scale'">
      <ion-item v-for="k in ['A', 'B', 'C', 'D']" :key="k">
        <ion-textarea fill="solid" :id="pre + 'level-' + k" :label="T('Zdanie EN — ', 'EN sentence — ') + k" label-placement="stacked" :auto-grow="true" :rows="2" :value="obj.levels && obj.levels[k]" @ionInput="poziom(k, $event.detail.value)"></ion-textarea>
      </ion-item>
    </template>
    <template v-else>
      <ion-item v-if="etykieta">
        <ion-input fill="solid" :id="pre + 'reportLabel'" :label="T('Etykieta EN do {label}', 'EN label for {label}')" label-placement="stacked" :value="obj.reportLabel" @ionInput="ust('reportLabel', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item>
        <ion-textarea fill="solid" :id="pre + 'template'" :label="T('Wzór EN — musi zawierać {value}; także {label}, {unit}', 'EN pattern — must contain {value}; also {label}, {unit}')" label-placement="stacked" :auto-grow="true" :rows="2" :value="obj.template" @ionInput="ust('template', $event.detail.value)"></ion-textarea>
      </ion-item>
      <ion-item>
        <ion-textarea fill="solid" :id="pre + 'threshold'" :label="T('Zdanie EN przy przekroczeniu progu', 'EN sentence when the limit is exceeded')" label-placement="stacked" :auto-grow="true" :rows="2" :value="obj.threshold" @ionInput="ust('threshold', $event.detail.value)"></ion-textarea>
      </ion-item>
    </template>
  </div>
</template>

<script setup>
import { IonItem, IonInput, IonTextarea } from '@ionic/vue';
const props = defineProps({ T: Function, obj: Object, typ: String, pre: { type: String, default: 'qq-' }, etykieta: Boolean });
const emit = defineEmits(['zmiana']);
function ust(k, v) { props.obj[k] = v; emit('zmiana'); }
function poziom(k, v) { if (!props.obj.levels) props.obj.levels = {}; props.obj.levels[k] = v; emit('zmiana'); }
</script>
