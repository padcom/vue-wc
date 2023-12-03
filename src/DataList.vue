<template>
  <h1>Hello {{ name }}</h1>
  <table v-bind="$attrs">
    <caption><slot name="caption" /></caption>
    <thead>
      <tr>
        <template v-for="column in columns" :key="column.id">
          <slot :name="`th.${column.id}`" :column="column">
            <th><slot :name="`th.${column.id}.content`">{{ column.id }}</slot></th>
          </slot>
        </template>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.id">
        <template v-for="column in columns" :key="column.id">
          <slot :name="`td.${column.id}`" :column="column" :row="row">
            <td><slot :name="`td.${column.id}.content`">{{ row[column.id] }}</slot></td>
          </slot>
        </template>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const props = defineProps({
  name: { type: String, default: 'John' },
})

const emit = defineEmits(['hello-world'])

function sayHello() {
  console.log('Hello', props.name)
  emit('hello-world', props.name)
}

defineExpose({ sayHello })

const columns = ref([
  { id: 'id' },
  { id: 'title' },
])

const rows = ref([
  { id: 1, title: 'Thing no. 1' },
  { id: 2, title: 'Thing no. 2' },
  { id: 3, title: 'Thing no. 3' },
] as Array<Record<string, any>>)
</script>
