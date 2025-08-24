'use client'
import { ReactNode } from 'react'

interface ModernBadgeProps {
  children: ReactNode
  variant?: 'keyword' | 'location' | 'business' | 'industry' | 'subreddit' | 'default'
  size?: 'sm' | 'md'
  className?: string
}

export default function ModernBadge({ 
  children, 
  variant = 'default',
  size = 'sm',
  className = ''
}: ModernBadgeProps) {
  const variants = {
    keyword: 'bg-blue-100/80 text-blue-800 border-blue-200/50',
    location: 'bg-green-100/80 text-green-800 border-green-200/50',
    business: 'bg-purple-100/80 text-purple-800 border-purple-200/50',
    industry: 'bg-orange-100/80 text-orange-800 border-orange-200/50',
    subreddit: 'bg-gray-100/80 text-gray-700 border-gray-200/50',
    default: 'bg-gray-100/80 text-gray-700 border-gray-200/50'
  }
  
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  }

  return (
    <span className={`
      inline-flex items-center font-medium rounded-full border backdrop-blur-sm
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `}>
      {children}
    </span>
  )
}
