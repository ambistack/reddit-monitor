/**
 * Utility functions for extracting keyword context from Reddit posts
 */

export interface KeywordMatch {
  keyword: string
  position: number
  context: string
  matchType: 'keyword' | 'location' | 'business' | 'industry'
}

/**
 * Extracts context around a flagged keyword from reddit post content
 * @param content - The full reddit post content (title + body)
 * @param keyword - The keyword that triggered the flag
 * @param contextLength - Total characters to show around keyword (default: 150)
 * @returns Context snippet with highlighted keyword
 */
export function extractKeywordContext(
  content: string, 
  keyword: string, 
  contextLength = 150
): string {
  if (!content || !keyword) return ''

  const lowerContent = content.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const keywordIndex = lowerContent.indexOf(lowerKeyword)
  
  if (keywordIndex === -1) return ''

  // Calculate context boundaries
  const halfContext = Math.floor((contextLength - keyword.length) / 2)
  let startIndex = Math.max(0, keywordIndex - halfContext)
  let endIndex = Math.min(content.length, keywordIndex + keyword.length + halfContext)
  
  // Adjust if we're at the beginning or end
  if (startIndex === 0) {
    endIndex = Math.min(content.length, contextLength)
  } else if (endIndex === content.length) {
    startIndex = Math.max(0, content.length - contextLength)
  }

  // Extract snippet
  let snippet = content.substring(startIndex, endIndex)
  
  // Add ellipsis
  if (startIndex > 0) snippet = '...' + snippet
  if (endIndex < content.length) snippet = snippet + '...'

  return snippet
}

/**
 * Finds the first matching keyword in content and returns match details
 * @param content - Full post content
 * @param keywords - Array of keywords to check
 * @param location - User's location
 * @param businessName - User's business name
 * @param industry - User's industry
 * @returns First keyword match found or null
 */
export function findFirstKeywordMatch(
  content: string,
  keywords: string[] = [],
  location = '',
  businessName = '',
  industry = ''
): KeywordMatch | null {
  const lowerContent = content.toLowerCase()

  // Check explicit keywords first
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase()
    const position = lowerContent.indexOf(lowerKeyword)
    if (position !== -1) {
      return {
        keyword,
        position,
        context: extractKeywordContext(content, keyword, 150),
        matchType: 'keyword'
      }
    }
  }

  // Check location match
  if (location && lowerContent.includes(location.toLowerCase())) {
    return {
      keyword: location,
      position: lowerContent.indexOf(location.toLowerCase()),
      context: extractKeywordContext(content, location, 150),
      matchType: 'location'
    }
  }

  // Check business name match
  if (businessName && lowerContent.includes(businessName.toLowerCase())) {
    return {
      keyword: businessName,
      position: lowerContent.indexOf(businessName.toLowerCase()),
      context: extractKeywordContext(content, businessName, 150),
      matchType: 'business'
    }
  }

  // Check industry match
  if (industry && lowerContent.includes(industry.toLowerCase())) {
    return {
      keyword: industry,
      position: lowerContent.indexOf(industry.toLowerCase()),
      context: extractKeywordContext(content, industry, 150),
      matchType: 'industry'
    }
  }

  return null
}
