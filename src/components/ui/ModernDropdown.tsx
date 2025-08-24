'use client'
import { useState, useRef, useEffect, ReactNode } from 'react'

interface ModernDropdownProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

export default function ModernDropdown({ 
  trigger, 
  children, 
  align = 'right',
  className = ''
}: ModernDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div className={`
          absolute top-full mt-2 w-80 bg-white/95 backdrop-blur-xl border border-white/20 
          rounded-2xl shadow-2xl z-[9999] overflow-hidden
          ${align === 'right' ? 'right-0' : 'left-0'}
          animate-in slide-in-from-top-2 duration-200
        `}>
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  children: ReactNode
  onClick?: () => void
  selected?: boolean
  className?: string
}

export function DropdownItem({ 
  children, 
  onClick, 
  selected = false,
  className = ''
}: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 text-sm hover:bg-blue-50/80 transition-colors
        flex items-center gap-3
        ${selected ? 'bg-blue-50/80 text-blue-700 font-medium' : 'text-gray-700'}
        ${className}
      `}
    >
      {children}
    </button>
  )
}

interface DropdownHeaderProps {
  children: ReactNode
}

export function DropdownHeader({ children }: DropdownHeaderProps) {
  return (
    <div className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100/50">
      {children}
    </div>
  )
}

export function DropdownSeparator() {
  return <div className="border-t border-gray-100/50" />
}
