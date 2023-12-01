<template>
  <h1>Hello {{ name }}</h1>
  <slot name="hello" :test="name" />
  <slot />
</template>

<script lang="ts" setup>
const props = defineProps({
  name: { type: String, default: 'John' },
})

const emit = defineEmits(['hello-world'])

function sayHello() {
  console.log('Hello', props.name)
  emit('hello-world', { props })
}

defineExpose({ sayHello })
</script>
