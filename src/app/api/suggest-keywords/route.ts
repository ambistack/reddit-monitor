import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { industry, businessName, location } = await request.json()

    if (!industry) {
      return NextResponse.json(
        { error: 'Industry is required' },
        { status: 400 }
      )
    }

    console.log(`API: Generating keywords for industry: ${industry}, business: ${businessName}, location: ${location}`)

    // Generate keywords using industry knowledge and patterns
    const keywords = await generateKeywords(industry, businessName, location)

    return NextResponse.json(
      { 
        keywords,
        industry,
        businessName,
        location
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error in suggest-keywords:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateKeywords(industry: string, businessName?: string, location?: string) {
  const industryLower = industry.toLowerCase()
  const keywords = new Set<string>()

  // Always include the core inputs if provided
  if (industry) keywords.add(industry)
  if (businessName) keywords.add(businessName)
  if (location) keywords.add(location)

  // Industry-specific keyword mappings
  const industryKeywords: Record<string, string[]> = {
    // Construction & Contracting
    'contractor': [
      'general contractor', 'GC', 'contractor', 'construction', 'builder', 
      'remodeler', 'handyman', 'renovation', 'home improvement', 'repair',
      'licensed contractor', 'bonded', 'insured', 'permit', 'building'
    ],
    'construction': [
      'construction', 'builder', 'contractor', 'building', 'development',
      'renovation', 'remodel', 'addition', 'commercial construction',
      'residential construction', 'new construction', 'custom build'
    ],
    'remodeling': [
      'remodeling', 'renovation', 'home improvement', 'kitchen remodel',
      'bathroom remodel', 'basement finishing', 'room addition',
      'interior renovation', 'exterior renovation', 'makeover'
    ],
    'plumbing': [
      'plumber', 'plumbing', 'pipe repair', 'drain cleaning', 'water heater',
      'leak repair', 'toilet repair', 'faucet', 'sewer', 'emergency plumber',
      'licensed plumber', 'water damage'
    ],
    'electrical': [
      'electrician', 'electrical', 'wiring', 'electrical repair', 
      'panel upgrade', 'outlet installation', 'lighting', 'electrical safety',
      'licensed electrician', 'electrical contractor', 'power'
    ],
    'hvac': [
      'HVAC', 'heating', 'cooling', 'air conditioning', 'furnace',
      'heat pump', 'ductwork', 'HVAC repair', 'HVAC installation',
      'climate control', 'ventilation', 'air quality'
    ],

    // Real Estate
    'real estate': [
      'real estate', 'realtor', 'real estate agent', 'property',
      'home buying', 'home selling', 'investment property',
      'residential real estate', 'commercial real estate', 'MLS'
    ],
    'property management': [
      'property management', 'rental property', 'landlord',
      'tenant management', 'property maintenance', 'rent collection',
      'property investment', 'rental management'
    ],

    // Professional Services
    'accounting': [
      'accountant', 'accounting', 'bookkeeping', 'tax preparation',
      'CPA', 'financial services', 'tax services', 'payroll',
      'business accounting', 'tax filing'
    ],
    'legal': [
      'lawyer', 'attorney', 'legal services', 'law firm',
      'legal consultation', 'litigation', 'legal advice',
      'legal representation', 'paralegal'
    ],
    'consulting': [
      'consultant', 'consulting', 'business consulting',
      'management consulting', 'strategy consulting',
      'advisory services', 'business advisor'
    ],

    // Technology
    'software': [
      'software development', 'web development', 'app development',
      'programming', 'coding', 'software engineer', 'developer',
      'custom software', 'software solutions', 'tech consulting'
    ],
    'it services': [
      'IT services', 'IT support', 'computer repair', 'network setup',
      'cybersecurity', 'data backup', 'cloud services',
      'managed IT', 'technical support'
    ],
    'web design': [
      'web design', 'website development', 'web developer',
      'UI/UX design', 'responsive design', 'e-commerce',
      'website redesign', 'digital marketing'
    ],

    // Health & Wellness
    'healthcare': [
      'healthcare', 'medical services', 'clinic', 'hospital',
      'medical practice', 'healthcare provider', 'patient care',
      'medical treatment', 'health services'
    ],
    'dental': [
      'dentist', 'dental care', 'dental services', 'oral health',
      'dental practice', 'teeth cleaning', 'dental treatment',
      'cosmetic dentistry', 'dental hygiene'
    ],
    'fitness': [
      'fitness', 'personal trainer', 'gym', 'workout',
      'fitness training', 'health coaching', 'nutrition',
      'wellness', 'exercise', 'fitness center'
    ],

    // Food & Hospitality
    'restaurant': [
      'restaurant', 'dining', 'food service', 'catering',
      'chef', 'cuisine', 'menu', 'takeout', 'delivery',
      'fine dining', 'casual dining', 'food truck'
    ],
    'catering': [
      'catering', 'event catering', 'wedding catering',
      'corporate catering', 'party catering', 'food service',
      'banquet', 'private chef', 'event planning'
    ],

    // Automotive
    'automotive': [
      'auto repair', 'car repair', 'mechanic', 'automotive service',
      'oil change', 'brake repair', 'transmission', 'engine repair',
      'auto maintenance', 'vehicle service'
    ],

    // Beauty & Personal Care
    'beauty': [
      'salon', 'hair salon', 'beauty services', 'hairstylist',
      'makeup artist', 'spa services', 'nail salon',
      'beauty treatment', 'cosmetics', 'skincare'
    ],

    // Retail
    'retail': [
      'retail', 'store', 'shop', 'boutique', 'merchandise',
      'customer service', 'sales', 'shopping', 'products'
    ],

    // Cleaning Services
    'cleaning': [
      'cleaning service', 'house cleaning', 'commercial cleaning',
      'janitorial', 'maid service', 'carpet cleaning',
      'window cleaning', 'deep cleaning', 'office cleaning'
    ],

    // Landscaping
    'landscaping': [
      'landscaping', 'lawn care', 'gardening', 'tree service',
      'landscape design', 'irrigation', 'lawn maintenance',
      'hardscaping', 'outdoor design', 'yard work'
    ]
  }

  // Find matching industry keywords
  for (const [key, terms] of Object.entries(industryKeywords)) {
    if (industryLower.includes(key) || key.includes(industryLower)) {
      terms.forEach(term => keywords.add(term))
    }
  }

  // Add location-based variations if provided
  if (location) {
    const locationVariations = [
      location,
      `${location} area`,
      `near ${location}`,
      `${location} services`,
      `local ${location}`
    ]
    locationVariations.forEach(variation => keywords.add(variation))
  }

  // Add business name variations if provided
  if (businessName) {
    const nameVariations = [
      businessName,
      businessName.toLowerCase(),
      businessName.replace(/\s+/g, ''), // Remove spaces
      businessName.split(' ')[0] // First word only
    ].filter(name => name.length > 2) // Filter out very short variations
    
    nameVariations.forEach(variation => keywords.add(variation))
  }

  // Add common business terms
  const commonTerms = [
    'service', 'services', 'company', 'business', 'professional',
    'licensed', 'certified', 'expert', 'specialist', 'contractor',
    'local', 'nearby', 'area', 'consultation', 'estimate', 'quote'
  ]
  
  // Only add a few relevant common terms to avoid noise
  const relevantCommonTerms = commonTerms.slice(0, 5)
  relevantCommonTerms.forEach(term => keywords.add(term))

  // Convert to array and sort by relevance (shorter, more specific terms first)
  const keywordArray = Array.from(keywords)
    .filter(keyword => keyword.length > 2) // Filter out very short keywords
    .sort((a, b) => {
      // Prioritize exact industry match
      if (a.toLowerCase() === industryLower) return -1
      if (b.toLowerCase() === industryLower) return 1
      
      // Then business name
      if (businessName && a.toLowerCase() === businessName.toLowerCase()) return -1
      if (businessName && b.toLowerCase() === businessName.toLowerCase()) return 1
      
      // Then by length (shorter = more specific usually)
      return a.length - b.length
    })
    .slice(0, 20) // Limit to top 20 most relevant

  console.log(`Generated ${keywordArray.length} keywords for ${industry}:`, keywordArray)
  
  return keywordArray
}
