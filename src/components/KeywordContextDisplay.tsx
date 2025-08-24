'use client'

interface KeywordContextDisplayProps {
  keyword?: string | null
  context?: string | null
  matchType?: 'keyword' | 'location' | 'business' | 'industry' | null
}

const matchTypeLabels = {
  keyword: 'Keyword',
  location: 'Location',
  business: 'Business',
  industry: 'Industry'
}

const matchTypeColors = {
  keyword: 'bg-blue-100 text-blue-800',
  location: 'bg-green-100 text-green-800', 
  business: 'bg-purple-100 text-purple-800',
  industry: 'bg-orange-100 text-orange-800'
}

export default function KeywordContextDisplay({ 
  keyword, 
  context, 
  matchType 
}: KeywordContextDisplayProps) {
  if (!keyword || !context) {
    return (
      <div className="text-xs text-gray-400 mt-1">
        No keyword context available
      </div>
    )
  }

  // Highlight the keyword in the context
  const highlightedContext = context.replace(
    new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
    '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
  )

  return (
    <div className="mt-2 p-2 bg-gray-50 rounded-md text-xs">
      <div className="flex items-center space-x-2 mb-1">
        <span className="text-gray-500">Flagged for:</span>
        {matchType && (
          <span className={`px-2 py-1 rounded text-xs font-medium ${matchTypeColors[matchType]}`}>
            {matchTypeLabels[matchType]}
          </span>
        )}
        <span className="font-medium text-gray-700">&quot;{keyword}&quot;</span>
      </div>
      <div 
        className="text-gray-600 font-mono text-xs bg-white p-2 rounded border"
        dangerouslySetInnerHTML={{ __html: highlightedContext }}
      />
    </div>
  )
}
