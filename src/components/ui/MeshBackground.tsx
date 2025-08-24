'use client'

export default function MeshBackground() {
  return (
    <>
      {/* Simple mesh grid using CSS */}
      <div className="mesh-background" />
      
      {/* Backup visible version */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
    </>
  )
}
