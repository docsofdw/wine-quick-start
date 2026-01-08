/**
 * Author Data for Wine Quick Start
 *
 * E-E-A-T Best Practices:
 * - Use real names and credentials
 * - Include verifiable certifications
 * - Link to professional profiles (LinkedIn, etc.)
 * - Show experience and expertise clearly
 *
 * TODO: Replace placeholder data with real information
 */

export interface Author {
  id: string;
  name: string;
  slug: string;
  role: string;
  credentials: string[];
  bio: string;
  shortBio: string;
  image: string;
  socials: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    website?: string;
  };
  expertise: string[];
  experience: string;
  featured: boolean;
}

export const authors: Author[] = [
  {
    id: 'founder',
    name: 'James Thornton',
    slug: 'james-thornton',
    role: 'Founder & Lead Wine Consultant',
    credentials: [
      'WSET Level 3 Award in Wines',
      'Certified Sommelier (Court of Master Sommeliers)',
      'French Wine Scholar (Wine Scholar Guild)',
    ],
    bio: `James Thornton founded Wine Quick Start after a decade in fine dining and private wine consulting. His journey began at a Michelin-starred restaurant in San Francisco, where he discovered his passion for making wine accessible to everyone.

After earning his WSET Level 3 and Certified Sommelier credentials, James shifted focus from restaurant service to wine education. He believes wine should enhance life's moments without unnecessary pretension.

Through Wine Quick Start, James combines technical expertise with practical guidance. His approach emphasizes understanding why wines work—with food, occasions, and personal preferences—rather than memorizing rules.

When not writing or consulting, James explores emerging wine regions and mentors aspiring sommeliers. He lives in the Bay Area with his family and an ever-growing wine collection.`,
    shortBio: 'Certified Sommelier and WSET Level 3 holder with 10+ years in wine education and consulting.',
    image: '/images/authors/james-thornton.jpg',
    socials: {
      linkedin: 'https://linkedin.com/in/jamesthornton',
      twitter: 'https://twitter.com/winequickstart',
      instagram: 'https://instagram.com/winequickstart',
    },
    expertise: ['Food & Wine Pairing', 'French Wines', 'California Wines', 'Wine Education'],
    experience: '12 years in wine industry',
    featured: true,
  },
  {
    id: 'contributor-1',
    name: 'Elena Martinez',
    slug: 'elena-martinez',
    role: 'Senior Wine Writer',
    credentials: [
      'WSET Level 2 Award in Wines',
      'Certified Specialist of Wine (CSW)',
    ],
    bio: `Elena Martinez brings a journalist's curiosity and a sommelier's palate to wine writing. After a career in food journalism, she pivoted to focus exclusively on wine, earning her CSW and WSET certifications.

Her specialty is making complex wine topics accessible to beginners. Elena writes with the belief that everyone deserves to find wines they love, regardless of budget or background.

Elena has contributed to Wine Spectator, Decanter, and numerous online publications. She regularly judges regional wine competitions and teaches introductory wine courses at local culinary schools.

A native of New Mexico, Elena has a particular fondness for Spanish and Argentine wines, though her cellar contains treasures from around the world.`,
    shortBio: 'Wine writer and CSW holder specializing in making wine accessible to beginners.',
    image: '/images/authors/elena-martinez.jpg',
    socials: {
      linkedin: 'https://linkedin.com/in/elenamartinezwine',
      twitter: 'https://twitter.com/elenawrites',
    },
    expertise: ['Wine Writing', 'Spanish Wines', 'Argentine Wines', 'Beginner Education'],
    experience: '8 years in wine media',
    featured: true,
  },
  {
    id: 'contributor-2',
    name: 'Michael Chen',
    slug: 'michael-chen',
    role: 'Wine Buyer & Contributor',
    credentials: [
      'WSET Level 3 Award in Wines',
      'Italian Wine Scholar (Wine Scholar Guild)',
    ],
    bio: `Michael Chen has spent over a decade sourcing wines for top restaurants and retailers. His expertise in Italian wines earned him the Italian Wine Scholar certification, one of the most rigorous programs in the industry.

As a buyer, Michael has developed relationships with producers across Italy, France, and the Pacific Northwest. He brings this insider knowledge to Wine Quick Start's buying guides and value recommendations.

Michael's philosophy is simple: great wine exists at every price point—you just need to know where to look. His articles focus on value-driven recommendations without sacrificing quality.

Based in Seattle, Michael frequently travels to wine regions and maintains one of the most extensive Italian wine libraries on the West Coast.`,
    shortBio: 'Wine buyer and Italian Wine Scholar with expertise in sourcing exceptional value wines.',
    image: '/images/authors/michael-chen.jpg',
    socials: {
      linkedin: 'https://linkedin.com/in/michaelchenwine',
    },
    expertise: ['Wine Buying', 'Italian Wines', 'Pacific Northwest Wines', 'Value Wines'],
    experience: '14 years in wine retail',
    featured: true,
  },
];

/**
 * Get author by slug
 */
export function getAuthorBySlug(slug: string): Author | undefined {
  return authors.find(a => a.slug === slug);
}

/**
 * Get author by ID
 */
export function getAuthorById(id: string): Author | undefined {
  return authors.find(a => a.id === id);
}

/**
 * Get featured authors
 */
export function getFeaturedAuthors(): Author[] {
  return authors.filter(a => a.featured);
}

/**
 * Get random author for article attribution
 */
export function getRandomAuthor(): Author {
  return authors[Math.floor(Math.random() * authors.length)];
}

/**
 * Generate Person schema for an author
 */
export function getAuthorSchema(author: Author): object {
  return {
    "@type": "Person",
    "name": author.name,
    "jobTitle": author.role,
    "description": author.shortBio,
    "url": `https://winequickstart.com/about/${author.slug}`,
    "image": `https://winequickstart.com${author.image}`,
    "sameAs": Object.values(author.socials).filter(Boolean),
    "knowsAbout": author.expertise,
    "hasCredential": author.credentials.map(cred => ({
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "Professional Certification",
      "name": cred
    }))
  };
}
