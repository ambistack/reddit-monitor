'use client'
import { ReactNode } from 'react'

interface ModernCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

export default function ModernCard({ 
  children, 
  className = '', 
  hover = false,
  padding = 'md'
}: ModernCardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div className={`
      bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg
      ${hover ? 'hover:shadow-xl hover:-translate-y-1 transition-all duration-300' : ''}
      ${paddingClasses[padding]}
      ${className}
    `}>
      {children}
    </div>
  )
}
