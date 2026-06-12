export function shouldShowMarsbotHomeEmptyState(input: { projectCount: number; search: string; loading: boolean }) {
  return input.projectCount === 0 && input.search.trim().length === 0 && !input.loading
}

export function shouldShowMarsbotProjectSidebarEmptyState(input: { projectCount: number }) {
  return input.projectCount === 0
}
