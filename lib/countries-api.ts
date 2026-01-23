// API endpoint for country data
const COUNTRIES_API_URL = "https://www.apicountries.com/countries";
const COUNTRIES_CACHE_KEY = "countries_data";

export interface Country {
  code: string; // ISO 3166-1 alpha-2 code
  flag: string;
  dialCode: string;
  name: string;
}

// Simple storage functions
const storeCountries = async (countries: Country[]): Promise<void> => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(COUNTRIES_CACHE_KEY, JSON.stringify(countries));
    }
  } catch (error) {
    console.error("Error storing countries:", error);
  }
};

const getCachedCountries = async (): Promise<Country[] | null> => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const cachedData = localStorage.getItem(COUNTRIES_CACHE_KEY);
      return cachedData ? JSON.parse(cachedData) : null;
    }
  } catch (error) {
    console.error("Error getting cached countries:", error);
  }
  return null;
};

// Convert country code to flag emoji
const getCountryFlagEmoji = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return "";

  try {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch (_e) {
    return "";
  }
};

// Extract and clean country data
const extractCountryData = (apiCountry: any): Country | null => {
  const code = apiCountry.alpha2Code || apiCountry.code;
  const dialCode = apiCountry.callingCodes?.[0] || apiCountry.dial_code;
  const name = apiCountry.name;

  if (!code || !name || !dialCode) return null;

  return {
    code,
    flag: getCountryFlagEmoji(code),
    dialCode: `+${dialCode.replace(/\D/g, "")}`, // Ensure format is +XXX
    name,
  };
};

// Main fetch function
export async function fetchCountries(): Promise<Country[]> {
  try {
    // Check cache first
    const cachedCountries = await getCachedCountries();
    if (cachedCountries && cachedCountries.length > 0) {
      return cachedCountries;
    }

    // Fetch from API
    const response = await fetch(COUNTRIES_API_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch countries: ${response.status}`);
    }

    const data = await response.json();

    // Transform and clean the data
    const countries: Country[] = data
      .map(extractCountryData)
      .filter(Boolean) // Remove null entries
      .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

    // Store for future use
    await storeCountries(countries);

    return countries;
  } catch (error) {
    console.error("Error fetching countries:", error);

    // Fallback to cache if API fails
    const cachedCountries = await getCachedCountries();
    if (cachedCountries && cachedCountries.length > 0) {
      return cachedCountries;
    }

    throw error;
  }
}
