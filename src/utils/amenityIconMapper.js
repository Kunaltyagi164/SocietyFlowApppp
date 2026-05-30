/**
 * Intelligent Amenity Icon Mapper
 * Maps amenity names to appropriate MaterialCommunityIcons icon names
 * Uses keyword matching to automatically select relevant icons
 */

const AMENITY_ICON_MAP = {
  // Swimming & Water Sports
  'swimming pool': 'pool',
  'pool': 'pool',
  'swim': 'pool',
  'swimming': 'pool',
  'water': 'water-drop',
  'spa': 'hot-tub',
  'sauna': 'sauna',

  // Sports & Recreation
  'gym': 'dumbbell',
  'fitness': 'dumbbell',
  'workout': 'dumbbell',
  'badminton': 'badminton',
  'badminton court': 'badminton',
  'tennis': 'tennis-ball',
  'tennis court': 'tennis-ball',
  'basketball': 'basketball',
  'basketball court': 'basketball',
  'cricket': 'cricket',
  'cricket ground': 'cricket',
  'squash': 'tennis-ball',
  'table tennis': 'table-tennis',
  'volleyball': 'volleyball',
  'football': 'soccer',
  'soccer': 'soccer',

  // Community Spaces
  'club house': 'office-building',
  'clubhouse': 'office-building',
  'community hall': 'office-building',
  'community center': 'office-building',
  'town hall': 'town-hall',
  'townhall': 'town-hall',
  'meeting room': 'briefcase',
  'conference room': 'briefcase',
  'party hall': 'account-group',
  'event hall': 'account-group',
  'function hall': 'account-group',
  'banquet': 'account-group',

  // Outdoor Spaces
  'garden': 'tree',
  'terrace garden': 'tree',
  'park': 'pine-tree-box',
  'landscape': 'leaf',
  'green space': 'leaf',
  'lawn': 'pine-tree',
  'court': 'tennis-ball',
  'playground': 'play',
  'kids play area': 'play',
  'play area': 'play',
  'children': 'play',

  // Dining & Kitchen
  'cafeteria': 'silverware-fork-knife',
  'cafe': 'coffee',
  'restaurant': 'silverware-fork-knife',
  'dining': 'silverware-fork-knife',
  'kitchen': 'silverware-fork-knife',
  'bar': 'glass-mug-variant',
  'lounge': 'armchair-alt',

  // Health & Wellness
  'clinic': 'hospital-box',
  'medical': 'hospital-box',
  'health center': 'hospital-box',
  'yoga': 'spa',
  'meditation': 'spa',
  'wellness': 'spa',
  'therapist': 'hospital-box',
  'doctor': 'hospital-box',

  // Parking & Transport
  'parking': 'parking',
  'car park': 'parking',
  'bike parking': 'bike',
  'garage': 'garage',
  'vehicle': 'car',
  'charging': 'ev-station',
  'ej charging': 'ev-station',

  // Library & Study
  'library': 'library-shelves',
  'study room': 'library-shelves',
  'reading room': 'book-open',
  'study': 'library-shelves',

  // Entertainment
  'cinema': 'movie',
  'theater': 'theater-masks',
  'game room': 'joystick',
  'gaming': 'gamepad-variant',
  'billiards': 'pool',
  'bowling': 'bowling',
  'arcade': 'game-controller-classic',

  // Beauty & Grooming
  'salon': 'hair-dryer',
  'spa': 'spa',
  'massage': 'spa',
  'beauty': 'lipstick',
  'barber': 'hair-dryer',

  // Security & Services
  'security': 'shield',
  'gate': 'gate',
  'office': 'office-building',
  'reception': 'information',
  'administration': 'office-building',
  'management': 'office-building',

  // Transportation Services
  'shuttle': 'shuttle-van',
  'transport': 'bus',
  'bus': 'bus',
  'cab': 'taxi',
  'auto': 'taxi',

  // Storage
  'storage': 'storage-tank',
  'warehouse': 'warehouse',
  'locker': 'file-cabinet',

  // Other
  'other': 'office-building',
};

/**
 * Get icon name for an amenity based on its name
 * Uses intelligent keyword matching to find the best icon
 * 
 * @param {string} amenityName - Name of the amenity (e.g., "Swimming Pool", "Badminton Court")
 * @param {string} fallbackIcon - Icon to use if no match found (default: 'office-building')
 * @returns {string} MaterialCommunityIcons icon name
 */
export const getAmenityIcon = (amenityName, fallbackIcon = 'office-building') => {
  if (!amenityName || typeof amenityName !== 'string') {
    return fallbackIcon;
  }

  // Convert to lowercase for matching
  const lowerName = amenityName.toLowerCase().trim();

  // First, try direct match
  if (AMENITY_ICON_MAP[lowerName]) {
    return AMENITY_ICON_MAP[lowerName];
  }

  // Second, try partial keyword matching (longest match first)
  const keys = Object.keys(AMENITY_ICON_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return AMENITY_ICON_MAP[key];
    }
  }

  // If no match found, return fallback
  return fallbackIcon;
};

/**
 * Enhance amenities array with icon names
 * Used to add iconName to amenities from API that don't have them
 * 
 * @param {Array} amenities - Array of amenity objects
 * @returns {Array} Amenities with iconName property added
 */
export const enrichAmenitiesWithIcons = (amenities) => {
  if (!Array.isArray(amenities)) {
    return amenities;
  }

  return amenities.map((amenity) => ({
    ...amenity,
    iconName: amenity.iconName || getAmenityIcon(amenity.name),
  }));
};

/**
 * Get list of all available icon-to-amenity mappings
 * Useful for debugging or documentation
 * 
 * @returns {Object} Mapping of amenity names to icon names
 */
export const getAmenityIconMap = () => {
  return { ...AMENITY_ICON_MAP };
};

export default {
  getAmenityIcon,
  enrichAmenitiesWithIcons,
  getAmenityIconMap,
};
