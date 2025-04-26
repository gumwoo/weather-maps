/**
 * 위경도 좌표를 기상청 격자 좌표로 변환하는 유틸리티 함수
 * 
 * 한반도 기준으로 격자 변환을 수행합니다.
 * 기상청에서 사용하는 격자 좌표는 LCC(Lambert Conformal Conic) 투영법을 기반으로 합니다.
 */

// 기상청 LCC 좌표계 파라미터
const RE = 6371.00877; // 지구 반경(km)
const GRID = 5.0; // 격자 간격(km)
const SLAT1 = 30.0; // 표준위도 1
const SLAT2 = 60.0; // 표준위도 2
const OLON = 126.0; // 기준점 경도
const OLAT = 38.0; // 기준점 위도
const XO = 43; // 기준점 X좌표
const YO = 136; // 기준점 Y좌표

/**
 * 위경도 좌표를 기상청 격자 좌표(nx, ny)로 변환
 * @param {number} lat - 위도
 * @param {number} lon - 경도
 * @returns {{nx: number, ny: number}} 변환된 격자 좌표
 */
export const convertToGrid = (lat, lon) => {
  // 경계값 체크
  if (!lat || !lon) {
    console.error('유효하지 않은 좌표:', { lat, lon });
    return { nx: 0, ny: 0 };
  }

  const DEGRAD = Math.PI / 180.0;
  const RADDEG = 180.0 / Math.PI;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);

  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;
  
  const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  
  return { nx: x, ny: y };
};

/**
 * 다수의 좌표를 빠르게 변환하는 배치 변환 함수
 * @param {Array<{lat: number, lng: number}>} coordinates - 변환할 좌표 배열
 * @returns {Array<{lat: number, lng: number, nx: number, ny: number}>} 원본 좌표와 변환된 격자 좌표
 */
export const batchConvertToGrid = (coordinates) => {
  return coordinates.map(coord => {
    const grid = convertToGrid(coord.lat, coord.lng);
    return { ...coord, nx: grid.nx, ny: grid.ny };
  });
};

// 격자 좌표 캐시
const gridCache = new Map();

/**
 * 위경도 좌표를 격자 좌표로 변환 (캐싱 기능 포함)
 * @param {number} lat - 위도
 * @param {number} lon - 경도
 * @returns {{nx: number, ny: number}} 변환된 격자 좌표
 */
export const convertToGridWithCache = (lat, lon) => {
  // 소수점 넷째 자리까지만 사용 (약 11m 정밀도)
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLon = Math.round(lon * 10000) / 10000;
  
  // 캐시 키 생성
  const cacheKey = `${roundedLat},${roundedLon}`;
  
  // 캐시에서 확인
  if (gridCache.has(cacheKey)) {
    console.log('격자 좌표 캐시 히트:', cacheKey);
    return gridCache.get(cacheKey);
  }
  
  // 캐시에 없으면 변환 수행
  const grid = convertToGrid(roundedLat, roundedLon);
  
  // 캐시 저장 (최대 100개까지만 저장)
  if (gridCache.size >= 100) {
    // 가장 오래된 항목 제거 (Map은 삽입 순서 유지)
    const oldestKey = gridCache.keys().next().value;
    gridCache.delete(oldestKey);
  }
  gridCache.set(cacheKey, grid);
  console.log('격자 좌표 캐시 저장:', cacheKey, grid);
  
  return grid;
};
