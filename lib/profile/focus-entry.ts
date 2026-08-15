export function focusNewEntry(id: string) {
  const scroll = () => {
    document.getElementById(`entry-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  requestAnimationFrame(() => requestAnimationFrame(scroll))
  window.setTimeout(scroll, 80)
}
