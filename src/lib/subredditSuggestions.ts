export const getIndustrySubreddits = (industry: string): string[] => {
  const suggestions: Record<string, string[]> = {
    'restaurant': ['FoodService', 'KitchenConfidential', 'restaurantowners', 'food', 'Cooking', 'chefs'],
    'food': ['FoodService', 'KitchenConfidential', 'restaurantowners', 'food', 'Cooking', 'chefs'],
    'tech': ['startups', 'webdev', 'programming', 'entrepreneur', 'technology', 'coding'],
    'technology': ['startups', 'webdev', 'programming', 'entrepreneur', 'technology', 'coding'],
    'healthcare': ['medicine', 'nursing', 'healthcare', 'medicalschool', 'medical'],
    'medical': ['medicine', 'nursing', 'healthcare', 'medicalschool', 'medical'],
    'retail': ['retailhell', 'smallbusiness', 'entrepreneur', 'ecommerce', 'retail'],
    'ecommerce': ['ecommerce', 'entrepreneur', 'smallbusiness', 'dropship', 'shopify'],
    'fitness': ['fitness', 'bodybuilding', 'gym', 'personaltraining', 'nutrition'],
    'real estate': ['realestate', 'realtors', 'investing', 'landlord', 'PropertyManagement'],
    'finance': ['personalfinance', 'investing', 'financialindependence', 'stocks', 'entrepreneur'],
    'education': ['teachers', 'education', 'homeschool', 'tutoring', 'academia'],
    'marketing': ['marketing', 'digitalmarketing', 'socialmedia', 'entrepreneur', 'advertising'],
    'consulting': ['consulting', 'entrepreneur', 'smallbusiness', 'freelance', 'business'],
    'photography': ['photography', 'WeddingPhotography', 'entrepreneur', 'smallbusiness'],
    'automotive': ['cars', 'MechanicAdvice', 'AutoDetailing', 'entrepreneur', 'smallbusiness'],
    'beauty': ['beauty', 'MakeupArtists', 'SkincareAddiction', 'Hair', 'entrepreneur'],
    'construction': ['Construction', 'HomeImprovement', 'contractor', 'Tools', 'entrepreneur'],
    'legal': ['law', 'LegalAdvice', 'lawyers', 'entrepreneur', 'smallbusiness']
  }
  
  const industry_lower = industry.toLowerCase()
  
  // Find matching industry
  for (const [key, subs] of Object.entries(suggestions)) {
    if (industry_lower.includes(key)) {
      return subs
    }
  }
  
  // Default fallback subreddits
  return ['entrepreneur', 'smallbusiness', 'business', 'startups']
}

export const getLocationSubreddits = (location: string): string[] => {
  const location_lower = location.toLowerCase()
  const locationSubs: string[] = []
  
  // Common city/state patterns
  const locationMappings: Record<string, string[]> = {
    'new york': ['nyc', 'NewYorkCity', 'newyork'],
    'los angeles': ['LosAngeles', 'la', 'california'],
    'chicago': ['chicago', 'ChicagoSuburbs'],
    'houston': ['houston', 'texas'],
    'phoenix': ['phoenix', 'arizona'],
    'philadelphia': ['philadelphia', 'philly'],
    'san antonio': ['sanantonio', 'texas'],
    'san diego': ['sandiego', 'california'],
    'dallas': ['Dallas', 'texas'],
    'san jose': ['SanJose', 'california'],
    'austin': ['Austin', 'texas'],
    'jacksonville': ['jacksonville', 'florida'],
    'san francisco': ['sanfrancisco', 'bayarea', 'california'],
    'seattle': ['Seattle', 'SeattleWA', 'washington'],
    'denver': ['Denver', 'colorado'],
    'washington': ['washingtondc', 'nova'],
    'boston': ['boston', 'massachusetts'],
    'detroit': ['Detroit', 'michigan'],
    'nashville': ['nashville', 'tennessee'],
    'portland': ['Portland', 'oregon'],
    'las vegas': ['vegaslocals', 'lasvegas', 'nevada'],
    'miami': ['Miami', 'florida'],
    'atlanta': ['Atlanta', 'georgia']
  }
  
  // Check for specific city matches
  for (const [city, subs] of Object.entries(locationMappings)) {
    if (location_lower.includes(city)) {
      locationSubs.push(...subs)
      break
    }
  }
  
  // Add state-level subreddits
  const states = [
    'california', 'texas', 'florida', 'newyork', 'pennsylvania', 
    'illinois', 'ohio', 'georgia', 'northcarolina', 'michigan'
  ]
  
  for (const state of states) {
    if (location_lower.includes(state)) {
      locationSubs.push(state)
      break
    }
  }
  
  return [...new Set(locationSubs)] // Remove duplicates
}
