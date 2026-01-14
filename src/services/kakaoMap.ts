import axios from "axios";
import type { Place } from "../types/index.js";

const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const BASE_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";

// Category codes for Kakao Map
export const CATEGORY_CODES = {
  RESTAURANT: "FD6",
  CAFE: "CE7",
  CULTURE: "CT1",
  TOUR: "AT4",
  ACCOMMODATION: "AD5"
} as const;

interface SearchParams {
  query: string;
  category_group_code?: string;
  x?: string;
  y?: string;
  radius?: number;
  size?: number;
}

interface KakaoPlaceResponse {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  phone: string;
  place_url: string;
  x: string;
  y: string;
}

/**
 * Search places using Kakao Map API
 */
export async function searchPlaces(params: SearchParams): Promise<Place[]> {
  if (!KAKAO_API_KEY) {
    console.warn("KAKAO_REST_API_KEY is not set. Using mock data.");
    return getMockPlaces(params.query);
  }

  try {
    const response = await axios.get(BASE_URL, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_API_KEY}`
      },
      params: {
        query: params.query,
        category_group_code: params.category_group_code,
        x: params.x,
        y: params.y,
        radius: params.radius || 5000,
        size: params.size || 5
      }
    });

    return response.data.documents.map((doc: KakaoPlaceResponse) => ({
      id: doc.id,
      name: doc.place_name,
      category: doc.category_name,
      address: doc.address_name,
      road_address: doc.road_address_name,
      phone: doc.phone,
      url: doc.place_url,
      x: doc.x,
      y: doc.y
    }));
  } catch (error) {
    console.error("Kakao Map API Error:", error);
    return getMockPlaces(params.query);
  }
}

/**
 * Get mock places for testing without API key
 */
function getMockPlaces(query: string): Place[] {
  const mockData: Place[] = [
    {
      id: "mock_1",
      name: `${query} 맛집 1`,
      category: "음식점 > 한식",
      address: "서울 강남구 테헤란로 123",
      road_address: "서울 강남구 테헤란로 123",
      phone: "02-1234-5678",
      url: "https://map.kakao.com/",
      x: "127.027610",
      y: "37.497942"
    },
    {
      id: "mock_2",
      name: `${query} 맛집 2`,
      category: "음식점 > 양식",
      address: "서울 강남구 테헤란로 456",
      road_address: "서울 강남구 테헤란로 456",
      phone: "02-2345-6789",
      url: "https://map.kakao.com/",
      x: "127.028610",
      y: "37.498942"
    },
    {
      id: "mock_3",
      name: `${query} 카페`,
      category: "카페",
      address: "서울 강남구 테헤란로 789",
      road_address: "서울 강남구 테헤란로 789",
      phone: "02-3456-7890",
      url: "https://map.kakao.com/",
      x: "127.029610",
      y: "37.499942"
    }
  ];

  return mockData;
}

/**
 * Search restaurants by location
 */
export async function searchRestaurants(location: string, limit: number = 5): Promise<Place[]> {
  return searchPlaces({
    query: `${location} 맛집`,
    category_group_code: CATEGORY_CODES.RESTAURANT,
    size: limit
  });
}

/**
 * Search cafes by location
 */
export async function searchCafes(location: string, limit: number = 5): Promise<Place[]> {
  return searchPlaces({
    query: `${location} 카페`,
    category_group_code: CATEGORY_CODES.CAFE,
    size: limit
  });
}

/**
 * Search date spots by location and category
 */
export async function searchDateSpots(
  location: string,
  category: "restaurant" | "cafe" | "activity" | "all" = "all",
  limit: number = 5
): Promise<Place[]> {
  let query = location;
  let categoryCode: string | undefined;

  switch (category) {
    case "restaurant":
      query += " 데이트 맛집";
      categoryCode = CATEGORY_CODES.RESTAURANT;
      break;
    case "cafe":
      query += " 데이트 카페";
      categoryCode = CATEGORY_CODES.CAFE;
      break;
    case "activity":
      query += " 데이트 코스";
      categoryCode = CATEGORY_CODES.CULTURE;
      break;
    default:
      query += " 데이트";
  }

  return searchPlaces({
    query,
    category_group_code: categoryCode,
    size: limit
  });
}
