import axios from "axios";
import { logger } from "../utils/logger.js";
import type { Place } from "../types/index.js";

const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const BASE_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";

// Category codes for Kakao Map API
export const CATEGORY_CODES = {
  RESTAURANT: "FD6",    // 음식점
  CAFE: "CE7",          // 카페
  CULTURE: "CT1",       // 문화시설
  TOUR: "AT4",          // 관광명소
  ACCOMMODATION: "AD5", // 숙박
  ENTERTAINMENT: "CE7", // 놀거리
} as const;

interface SearchParams {
  query: string;
  category_group_code?: string;
  x?: string;  // 경도 (longitude)
  y?: string;  // 위도 (latitude)
  radius?: number;  // 검색 반경 (미터)
  size?: number;    // 결과 개수
  page?: number;    // 페이지 번호
  sort?: "accuracy" | "distance";  // 정렬 기준
}

interface KakaoPlaceDocument {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  address_name: string;
  road_address_name: string;
  phone: string;
  place_url: string;
  x: string;
  y: string;
  distance?: string;
}

interface KakaoSearchResponse {
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
    same_name: {
      region: string[];
      keyword: string;
      selected_region: string;
    };
  };
  documents: KakaoPlaceDocument[];
}

/**
 * Custom error for Kakao API failures
 */
export class KakaoApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isApiKeyMissing: boolean = false
  ) {
    super(message);
    this.name = "KakaoApiError";
  }
}

/**
 * Validate that API key is configured
 */
function validateApiKey(): void {
  if (!KAKAO_API_KEY) {
    throw new KakaoApiError(
      "KAKAO_REST_API_KEY is not configured. Please add it to your .env file.",
      undefined,
      true
    );
  }
}

/**
 * Search places using Kakao Map API
 * @throws KakaoApiError if API call fails or key is missing
 */
export async function searchPlaces(params: SearchParams): Promise<Place[]> {
  validateApiKey();

  const startTime = performance.now();

  try {
    logger.info({
      query: params.query,
      category: params.category_group_code,
      size: params.size
    }, "Kakao Map API request");

    const response = await axios.get<KakaoSearchResponse>(BASE_URL, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_API_KEY}`
      },
      params: {
        query: params.query,
        category_group_code: params.category_group_code,
        x: params.x,
        y: params.y,
        radius: params.radius || 5000,
        size: params.size || 5,
        page: params.page || 1,
        sort: params.sort || "accuracy"
      },
      timeout: 10000  // 10초 타임아웃
    });

    const duration = performance.now() - startTime;
    const places = response.data.documents.map((doc): Place => ({
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

    logger.info({
      query: params.query,
      totalCount: response.data.meta.total_count,
      returnedCount: places.length,
      duration: `${duration.toFixed(2)}ms`
    }, "Kakao Map API success");

    return places;

  } catch (error) {
    const duration = performance.now() - startTime;

    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;

      logger.error({
        query: params.query,
        statusCode,
        error: errorMessage,
        duration: `${duration.toFixed(2)}ms`
      }, "Kakao Map API error");

      if (statusCode === 401) {
        throw new KakaoApiError(
          "Invalid Kakao API key. Please check your KAKAO_REST_API_KEY.",
          statusCode
        );
      }

      if (statusCode === 429) {
        throw new KakaoApiError(
          "Kakao API rate limit exceeded. Please try again later.",
          statusCode
        );
      }

      throw new KakaoApiError(
        `Kakao API error: ${errorMessage}`,
        statusCode
      );
    }

    logger.error({ error, query: params.query }, "Unexpected error in Kakao Map API");
    throw new KakaoApiError("Failed to connect to Kakao Map API");
  }
}

/**
 * Search restaurants by location
 */
export async function searchRestaurants(
  location: string,
  limit: number = 5
): Promise<Place[]> {
  return searchPlaces({
    query: `${location} 맛집`,
    category_group_code: CATEGORY_CODES.RESTAURANT,
    size: limit
  });
}

/**
 * Search cafes by location
 */
export async function searchCafes(
  location: string,
  limit: number = 5
): Promise<Place[]> {
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

/**
 * Search places near coordinates
 */
export async function searchNearby(
  x: string,  // 경도
  y: string,  // 위도
  keyword: string,
  radius: number = 3000,
  limit: number = 5
): Promise<Place[]> {
  return searchPlaces({
    query: keyword,
    x,
    y,
    radius,
    size: limit,
    sort: "distance"
  });
}

/**
 * Get place details URL for Kakao Map
 */
export function getPlaceMapUrl(placeId: string): string {
  return `https://map.kakao.com/link/map/${placeId}`;
}

/**
 * Get directions URL for Kakao Map
 */
export function getDirectionsUrl(
  placeName: string,
  lat: string,
  lng: string
): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(placeName)},${lat},${lng}`;
}
