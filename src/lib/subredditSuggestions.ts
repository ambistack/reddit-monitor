export const getIndustrySubreddits = (industry: string): string[] => {
  const industry_lower = industry.toLowerCase()
  const suggestions: string[] = []
  
  // Enhanced industry matching with fuzzy logic
  const industryMappings: Record<string, string[]> = {
    // Event & Venue related
    'event': ['events', 'EventPlanning', 'weddingplanning', 'party', 'catering', 'venue', 'smallbusiness', 'entrepreneur'],
    'venue': ['events', 'EventPlanning', 'weddingplanning', 'venue', 'catering', 'party', 'smallbusiness'],
    'space': ['events', 'EventPlanning', 'venue', 'smallbusiness', 'entrepreneur', 'realestate'],
    'wedding': ['weddingplanning', 'wedding', 'events', 'EventPlanning', 'venue', 'catering'],
    'party': ['party', 'events', 'EventPlanning', 'catering', 'venue'],
    'meeting': ['events', 'coworking', 'smallbusiness', 'entrepreneur', 'business'],
    'conference': ['events', 'EventPlanning', 'business', 'entrepreneur', 'networking'],
    'catering': ['catering', 'FoodService', 'events', 'EventPlanning', 'food'],
    
    // Business types
    'restaurant': ['FoodService', 'KitchenConfidential', 'restaurantowners', 'food', 'Cooking', 'chefs', 'smallbusiness'],
    'food': ['FoodService', 'KitchenConfidential', 'restaurantowners', 'food', 'Cooking', 'chefs', 'catering'],
    'tech': ['startups', 'webdev', 'programming', 'entrepreneur', 'technology', 'coding', 'SaaS'],
    'technology': ['startups', 'webdev', 'programming', 'entrepreneur', 'technology', 'coding', 'SaaS'],
    'software': ['webdev', 'programming', 'startups', 'entrepreneur', 'technology', 'SaaS'],
    'healthcare': ['medicine', 'nursing', 'healthcare', 'medicalschool', 'medical', 'smallbusiness'],
    'medical': ['medicine', 'nursing', 'healthcare', 'medicalschool', 'medical'],
    'retail': ['retailhell', 'smallbusiness', 'entrepreneur', 'ecommerce', 'retail'],
    'ecommerce': ['ecommerce', 'entrepreneur', 'smallbusiness', 'dropship', 'shopify', 'AmazonSeller'],
    'fitness': ['fitness', 'bodybuilding', 'gym', 'personaltraining', 'nutrition', 'smallbusiness'],
    'gym': ['fitness', 'bodybuilding', 'gym', 'personaltraining', 'smallbusiness'],
    'real estate': ['realestate', 'realtors', 'investing', 'landlord', 'PropertyManagement', 'RealEstate'],
    'realestate': ['realestate', 'realtors', 'investing', 'landlord', 'PropertyManagement'],
    'finance': ['personalfinance', 'investing', 'financialindependence', 'stocks', 'entrepreneur', 'business'],
    'banking': ['personalfinance', 'investing', 'financialindependence', 'CreditCards', 'banking'],
    'education': ['teachers', 'education', 'homeschool', 'tutoring', 'academia', 'teaching'],
    'teaching': ['teachers', 'education', 'homeschool', 'tutoring', 'academia'],
    'marketing': ['marketing', 'digitalmarketing', 'socialmedia', 'entrepreneur', 'advertising', 'SEO'],
    'advertising': ['marketing', 'digitalmarketing', 'advertising', 'entrepreneur', 'PPC'],
    'consulting': ['consulting', 'entrepreneur', 'smallbusiness', 'freelance', 'business'],
    'photography': ['photography', 'WeddingPhotography', 'entrepreneur', 'smallbusiness', 'photocritique'],
    'automotive': ['cars', 'MechanicAdvice', 'AutoDetailing', 'entrepreneur', 'smallbusiness', 'Justrolledintotheshop'],
    'beauty': ['beauty', 'MakeupArtists', 'SkincareAddiction', 'Hair', 'entrepreneur', 'smallbusiness'],
    'salon': ['beauty', 'Hair', 'MakeupArtists', 'SkincareAddiction', 'smallbusiness'],
    'construction': ['Construction', 'HomeImprovement', 'contractor', 'Tools', 'entrepreneur', 'DIY'],
    'contractor': ['Construction', 'HomeImprovement', 'contractor', 'Tools', 'smallbusiness'],
    'legal': ['law', 'LegalAdvice', 'lawyers', 'entrepreneur', 'smallbusiness', 'legaladvice'],
    'law': ['law', 'LegalAdvice', 'lawyers', 'legal'],
    'cleaning': ['CleaningTips', 'smallbusiness', 'entrepreneur', 'mildlyinfuriating'],
    'landscaping': ['landscaping', 'gardening', 'lawncare', 'smallbusiness', 'entrepreneur'],
    'design': ['graphic_design', 'web_design', 'InteriorDesign', 'entrepreneur', 'freelance'],
    'art': ['Art', 'ArtBusiness', 'entrepreneur', 'smallbusiness', 'crafts'],
    'music': ['WeAreTheMusicMakers', 'edmproduction', 'trapproduction', 'entrepreneur', 'musicbusiness'],
    'nonprofit': ['nonprofit', 'volunteer', 'charity', 'socialwork'],
    'transport': ['logistics', 'trucking', 'uber', 'lyft', 'delivery'],
    'delivery': ['doordash', 'ubereats', 'grubhub', 'delivery', 'entrepreneur'],
  }
  
  // Check for matches using partial string matching
  for (const [keyword, subs] of Object.entries(industryMappings)) {
    if (industry_lower.includes(keyword) || keyword.includes(industry_lower)) {
      suggestions.push(...subs)
    }
  }
  
  // Always include these general business subreddits
  const generalBusiness = ['entrepreneur', 'smallbusiness', 'business']
  suggestions.push(...generalBusiness)
  
  // Remove duplicates and return
  return [...new Set(suggestions)]
}

export const getLocationSubreddits = (location: string): string[] => {
  const location_lower = location.toLowerCase().trim()
  const locationSubs: string[] = []
  
  // Enhanced location matching - FIXED Washington State vs DC confusion
  const locationMappings: Record<string, string[]> = {
    // Washington STATE (not DC) - be very specific
    'wa': ['Seattle', 'SeattleWA', 'washington', 'pnw', 'tacoma', 'spokane', 'vancouver'],
    'washington state': ['Seattle', 'SeattleWA', 'washington', 'pnw', 'tacoma', 'spokane'],
    'seattle': ['Seattle', 'SeattleWA', 'washington', 'pnw', 'tacoma'],
    'tacoma': ['tacoma', 'Seattle', 'SeattleWA', 'washington', 'pnw'],
    'spokane': ['Spokane', 'washington', 'pnw'],
    'bellingham': ['Bellingham', 'washington', 'pnw'],
    'olympia': ['olympia', 'washington', 'pnw'],
    'everett': ['everett', 'Seattle', 'SeattleWA', 'washington'],
    'vancouver wa': ['vancouverwa', 'washington', 'portland'],
    
    // Washington DC - separate from state
    'washington dc': ['washingtondc', 'nova', 'dmv', 'maryland', 'virginia'],
    'dc': ['washingtondc', 'nova', 'dmv'],
    'washington, dc': ['washingtondc', 'nova', 'dmv', 'maryland', 'virginia'],
    'nova': ['nova', 'washingtondc', 'dmv', 'virginia'],
    'northern virginia': ['nova', 'washingtondc', 'dmv', 'virginia'],
    'dmv': ['washingtondc', 'nova', 'dmv', 'maryland', 'virginia'],
    
    // Major cities
    'new york': ['nyc', 'NewYorkCity', 'newyork', 'Manhattan', 'Brooklyn', 'Queens'],
    'nyc': ['nyc', 'NewYorkCity', 'newyork', 'Manhattan', 'Brooklyn'],
    'new york city': ['nyc', 'NewYorkCity', 'newyork', 'Manhattan', 'Brooklyn'],
    'los angeles': ['LosAngeles', 'la', 'california', 'socal'],
    'la': ['LosAngeles', 'la', 'california', 'socal'],
    'chicago': ['chicago', 'ChicagoSuburbs', 'illinois'],
    'houston': ['houston', 'texas', 'HTown'],
    'phoenix': ['phoenix', 'arizona', 'scottsdale'],
    'philadelphia': ['philadelphia', 'philly', 'pennsylvania'],
    'philly': ['philadelphia', 'philly', 'pennsylvania'],
    'san antonio': ['sanantonio', 'texas', 'SanAntonio'],
    'san diego': ['sandiego', 'california', 'socal'],
    'dallas': ['Dallas', 'texas', 'DFW', 'plano', 'frisco'],
    'san jose': ['SanJose', 'california', 'bayarea', 'siliconvalley'],
    'austin': ['Austin', 'texas', 'atx'],
    'jacksonville': ['jacksonville', 'florida', 'jax'],
    'san francisco': ['sanfrancisco', 'bayarea', 'california', 'sf', 'siliconvalley'],
    'sf': ['sanfrancisco', 'bayarea', 'california', 'sf'],
    'denver': ['Denver', 'colorado', 'boulder'],
    'boston': ['boston', 'massachusetts', 'cambridge', 'somerville'],
    'detroit': ['Detroit', 'michigan', 'motorcity'],
    'nashville': ['nashville', 'tennessee', 'musiccity'],
    'portland': ['Portland', 'oregon', 'pnw'],
    'las vegas': ['vegaslocals', 'lasvegas', 'nevada', 'vegas'],
    'vegas': ['vegaslocals', 'lasvegas', 'nevada', 'vegas'],
    'miami': ['Miami', 'florida', 'southbeach'],
    'atlanta': ['Atlanta', 'georgia', 'atl'],
    'orlando': ['orlando', 'florida', 'centralflorida'],
    'tampa': ['tampa', 'florida', 'stpetersburg'],
    'charlotte': ['Charlotte', 'northcarolina', 'nc'],
    'raleigh': ['raleigh', 'triangle', 'northcarolina', 'nc'],
    'sacramento': ['Sacramento', 'california'],
    'kansas city': ['kansascity', 'missouri', 'kansas'],
    'columbus': ['Columbus', 'ohio'],
    'indianapolis': ['indianapolis', 'indiana', 'indy'],
    'cleveland': ['Cleveland', 'ohio'],
    'pittsburgh': ['pittsburgh', 'pennsylvania', 'pgh'],
    'cincinnati': ['cincinnati', 'ohio'],
    'milwaukee': ['milwaukee', 'wisconsin'],
    'memphis': ['memphis', 'tennessee'],
    'baltimore': ['baltimore', 'maryland', 'dmv'],
    'richmond': ['rva', 'virginia', 'richmond'],
    'norfolk': ['norfolk', 'virginia', 'virginia beach', 'hampton roads'],
    
    // States - be more specific about Washington
    'california': ['california', 'ca', 'bayarea', 'socal'],
    'texas': ['texas', 'tx', 'austin', 'houston', 'dallas'],
    'florida': ['florida', 'fl', 'miami', 'orlando', 'tampa'],
    'new york state': ['newyork', 'ny', 'nyc', 'upstate'],
    'pennsylvania': ['pennsylvania', 'pa', 'philadelphia', 'pittsburgh'],
    'illinois': ['illinois', 'il', 'chicago'],
    'ohio': ['ohio', 'oh', 'columbus', 'cleveland', 'cincinnati'],
    'georgia': ['georgia', 'ga', 'atlanta'],
    'north carolina': ['northcarolina', 'nc', 'charlotte', 'raleigh'],
    'michigan': ['michigan', 'mi', 'detroit'],
    'virginia': ['virginia', 'va', 'nova', 'rva'],
    'arizona': ['arizona', 'az', 'phoenix', 'tucson'],
    'massachusetts': ['massachusetts', 'ma', 'boston'],
    'tennessee': ['tennessee', 'tn', 'nashville', 'memphis'],
    'indiana': ['indiana', 'in', 'indianapolis'],
    'missouri': ['missouri', 'mo', 'kansascity', 'stlouis'],
    'maryland': ['maryland', 'md', 'baltimore', 'dmv'],
    'wisconsin': ['wisconsin', 'wi', 'milwaukee', 'madison'],
    'minnesota': ['minnesota', 'mn', 'minneapolis', 'twincities'],
    'colorado': ['colorado', 'co', 'denver', 'boulder'],
    'alabama': ['alabama', 'al', 'birmingham', 'montgomery'],
    'louisiana': ['louisiana', 'la', 'neworleans', 'batonrouge'],
    'kentucky': ['kentucky', 'ky', 'louisville', 'lexington'],
    'oregon': ['oregon', 'or', 'portland', 'pnw'],
    'oklahoma': ['oklahoma', 'ok', 'oklahomacity', 'tulsa'],
    'connecticut': ['connecticut', 'ct', 'hartford'],
    'utah': ['utah', 'ut', 'saltlakecity'],
    'nevada': ['nevada', 'nv', 'lasvegas', 'reno'],
    'arkansas': ['arkansas', 'ar', 'littlerock'],
    'mississippi': ['mississippi', 'ms', 'jackson'],
    'kansas': ['kansas', 'ks', 'topeka', 'wichita'],
    'new mexico': ['newmexico', 'nm', 'albuquerque'],
    'nebraska': ['nebraska', 'ne', 'omaha', 'lincoln'],
    'west virginia': ['westvirginia', 'wv', 'charleston'],
    'idaho': ['idaho', 'id', 'boise'],
    'hawaii': ['hawaii', 'hi', 'honolulu'],
    'maine': ['maine', 'me', 'portland'],
    'new hampshire': ['newhampshire', 'nh'],
    'rhode island': ['rhodeisland', 'ri', 'providence'],
    'montana': ['montana', 'mt', 'billings'],
    'delaware': ['delaware', 'de', 'wilmington'],
    'south dakota': ['southdakota', 'sd'],
    'north dakota': ['northdakota', 'nd'],
    'alaska': ['alaska', 'ak', 'anchorage'],
    'vermont': ['vermont', 'vt'],
    'wyoming': ['wyoming', 'wy']
  }
  
  // Check for exact matches first (this fixes WA vs Washington DC confusion)
  for (const [key, subs] of Object.entries(locationMappings)) {
    if (location_lower === key) {
      locationSubs.push(...subs)
      return [...new Set(locationSubs)] // Return immediately for exact match
    }
  }
  
  // Then check for partial matches
  for (const [key, subs] of Object.entries(locationMappings)) {
    if (location_lower.includes(key) || key.includes(location_lower)) {
      locationSubs.push(...subs)
    }
  }
  
  // Remove duplicates
  return [...new Set(locationSubs)]
}

export const getCombinedSubreddits = (businessName: string, location: string, industry: string): string[] => {
  const business_lower = businessName.toLowerCase()
  const suggestions: string[] = []
  
  // Business-specific suggestions based on name
  if (business_lower.includes('chamber')) {
    suggestions.push('events', 'EventPlanning', 'venue', 'weddingplanning', 'business', 'networking')
  }
  if (business_lower.includes('studio')) {
    suggestions.push('photography', 'art', 'creative', 'smallbusiness')
  }
  if (business_lower.includes('cafe') || business_lower.includes('coffee')) {
    suggestions.push('cafe', 'Coffee', 'smallbusiness', 'barista')
  }
  if (business_lower.includes('shop')) {
    suggestions.push('smallbusiness', 'retail', 'entrepreneur')
  }
  if (business_lower.includes('gym') || business_lower.includes('fitness')) {
    suggestions.push('fitness', 'gym', 'bodybuilding', 'personaltraining')
  }
  
  // Get industry and location suggestions
  const industrySubs = getIndustrySubreddits(industry)
  const locationSubs = getLocationSubreddits(location)
  
  // Combine all suggestions
  suggestions.push(...industrySubs, ...locationSubs)
  
  // Remove duplicates and return top suggestions
  const uniqueSuggestions = [...new Set(suggestions)]
  
  // Limit to most relevant suggestions
  return uniqueSuggestions.slice(0, 15)
}
