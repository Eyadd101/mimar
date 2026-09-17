const stageOneResources = ['Users', 'App Server', 'Database'] as const

export function ResourcePalette() {
  return (
    <aside className="resource-palette nodrag nopan" aria-label="Resource palette">
      <div className="resource-palette__heading">
        <span>Resource palette</span>
        <strong>Available resources</strong>
      </div>
      <div className="resource-palette__list">
        {stageOneResources.map((resource) => (
          <div className="resource-palette__card" key={resource}>
            <strong>{resource}</strong>
            <span>Ready to place</span>
          </div>
        ))}
      </div>
    </aside>
  )
}
