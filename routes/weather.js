const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const winston = require('winston');

// 로그 설정
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'api_error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'api.log') })
  ]
});

// 기상청 API 기본 URL - HTTPS 사용
const WEATHER_API_BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
// API 키 - 이중 인코딩 방지를 위해 API 키를 디코딩하여 사용
let SERVICE_KEY = process.env.WEATHER_API_KEY;
// %2F와 같은 이중 인코딩된 문자가 있다면 한 번 디코딩
if (SERVICE_KEY && SERVICE_KEY.includes('%')) {
  try {
    SERVICE_KEY = decodeURIComponent(SERVICE_KEY);
    logger.info('API 키 디코딩 완료');
  } catch (e) {
    logger.error(`API 키 디코딩 오류: ${e.message}`);
  }
}

// API 키 인코딩 관련 추가 디버깅
if (SERVICE_KEY) {
  logger.info(`서비스 키 원본: ${SERVICE_KEY.substring(0, 10)}...`);
  logger.info(`서비스 키 디코딩 여부: ${SERVICE_KEY.includes('%') ? '필요' : '불필요'}`);
} else {
  logger.error('SERVICE_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.');
}

// 기상청 API 호출 함수
async function callWeatherAPI(apiUrl, params) {
  try {
    const queryParams = new URLSearchParams(params);
    const url = `${apiUrl}?${queryParams}`;
    
    logger.info(`API 요청 URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*'
      }
    });
    
    // 응답 디버깅 (첫 200자만 로깅)
    if (typeof response.data === 'string') {
      logger.info(`API 응답 데이터 (문자열): ${response.data.substring(0, 200)}...`);
    } else {
      logger.info(`API 응답 데이터 (객체): ${JSON.stringify(response.data).substring(0, 200)}...`);
    }
    
    // XML 응답이 문자열로 올 경우 처리
    if (typeof response.data === 'string' && response.data.includes('<OpenAPI_ServiceResponse>')) {
      // XML 오류 메시지인 경우
      const errorMatch = response.data.match(/<returnAuthMsg>([^<]+)<\/returnAuthMsg>/);
      const errorCode = response.data.match(/<returnReasonCode>([^<]+)<\/returnReasonCode>/);
      
      if (errorMatch && errorMatch[1]) {
        throw new Error(`API 오류: ${errorMatch[1]} (코드: ${errorCode ? errorCode[1] : '알 수 없음'})`);
      } else {
        throw new Error('API 응답 형식이 유효하지 않습니다.');
      }
    }
    
    return response.data;
  } catch (error) {
    if (error.response) {
      logger.error(`API 응답 오류: ${error.response.status} - ${error.message}`);
    } else {
      logger.error(`API 요청 오류: ${error.message}`);
    }
    throw error;
  }
}

// 현재 날짜/시간 포맷 변환 함수 (YYYYMMDDHHmm 형식으로)
const formatDateTime = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return {
    date: `${year}${month}${day}`,
    time: `${hours}${minutes}`
  };
};

// 날씨 API 호출 시 가장 가까운 발표 시간 계산
const getBaseTime = (currentHour) => {
  // 기상청 API는 2, 5, 8, 11, 14, 17, 20, 23시에 발표
  const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];
  
  // 가장 가까운 이전 발표 시간 찾기
  let baseTime = baseTimes[baseTimes.length - 1];
  for (let i = 0; i < baseTimes.length; i++) {
    if (baseTimes[i] > currentHour) {
      baseTime = baseTimes[i - 1 >= 0 ? i - 1 : baseTimes.length - 1];
      break;
    }
  }
  
  return String(baseTime).padStart(2, '0') + '00';
};

// 날씨 코드 변환 함수 (하늘상태, 강수형태)
const getWeatherDescription = (skyValue, ptyValue) => {
  // 하늘상태(SKY) 코드 : 맑음(1), 구름많음(3), 흐림(4)
  const skyStatus = {
    '1': '맑음',
    '3': '구름많음',
    '4': '흐림'
  };
  
  // 강수형태(PTY) 코드 : 없음(0), 비(1), 비/눈(2), 눈(3), 소나기(4)
  const ptyStatus = {
    '0': '없음',
    '1': '비',
    '2': '비/눈',
    '3': '눈',
    '4': '소나기'
  };
  
  if (ptyValue !== '0') {
    return ptyStatus[ptyValue];
  } else {
    return skyStatus[skyValue];
  }
};

// 1. 현재 기온 API (단기예보 조회)
router.get('/current-temperature', async (req, res) => {
  try {
    const { nx, ny } = req.query;
    
    if (!nx || !ny) {
      return res.status(400).json({ message: '위치 정보(nx, ny)가 필요합니다.' });
    }
    
    logger.info(`현재 기온 정보 요청: nx=${nx}, ny=${ny}`);
    
    const now = new Date();
    const { date: baseDate, time } = formatDateTime(now);
    const baseTime = getBaseTime(now.getHours());
    
    // 기상청 단기예보 API 호출
    const apiUrl = `${WEATHER_API_BASE_URL}/getVilageFcst`;
    const params = {
      serviceKey: SERVICE_KEY,
      numOfRows: '1000',
      pageNo: '1',
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx: nx,
      ny: ny
    };
    
    const response = await callWeatherAPI(apiUrl, params);
    
    // API 응답 정상 확인
    if (!response.response) {
      throw new Error('API 응답에 데이터가 없습니다.');
    }
    
    logger.info(`API 응답 코드: ${response.response.header.resultCode}`);
    
    if (response.response.header.resultCode !== '00') {
      throw new Error(`API 오류: ${response.response.header.resultMsg}`);
    }
    
    const items = response.response.body.items.item;
    
    // 예보 데이터 중 필요한 정보 추출
    const weatherData = {
      temperature: null,  // 기온
      skyStatus: null,    // 하늘상태
      rainType: null,     // 강수형태
      humidity: null,     // 습도
      precipitation: null, // the 1 시간 강수량
      windSpeed: null     // 풍속
    };
    
    // 가장 가까운 시간의 데이터 필터링
    const currentHour = String(now.getHours()).padStart(2, '0') + '00';
    const filteredData = items.filter(item => {
      return item.fcstTime === currentHour || 
             (parseInt(item.fcstTime) > parseInt(currentHour) && 
              parseInt(item.fcstTime) <= parseInt(currentHour) + 100);
    });
    
    // 필요한 데이터 추출
    filteredData.forEach(item => {
      switch(item.category) {
        case 'TMP': // 기온
          weatherData.temperature = item.fcstValue;
          break;
        case 'SKY': // 하늘상태
          weatherData.skyStatus = item.fcstValue;
          break;
        case 'PTY': // 강수형태
          weatherData.rainType = item.fcstValue;
          break;
        case 'REH': // 습도
          weatherData.humidity = item.fcstValue;
          break;
        case 'PCP': // 1시간 강수량
          weatherData.precipitation = item.fcstValue;
          break;
        case 'WSD': // 풍속
          weatherData.windSpeed = item.fcstValue;
          break;
      }
    });
    
    // 하늘상태와 강수형태 정보로 날씨 설명 추가
    if (weatherData.skyStatus && weatherData.rainType) {
      weatherData.description = getWeatherDescription(weatherData.skyStatus, weatherData.rainType);
    }
    
    res.json({
      success: true,
      data: weatherData,
      location: { nx, ny },
      baseDateTime: { baseDate, baseTime }
    });
    
  } catch (error) {
    logger.error(`현재 기온 정보 조회 오류: ${error.message}`);
    res.status(500).json({ 
      success: false,
      message: '날씨 정보를 가져오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 2. 24시간 강수 확률 API
router.get('/precipitation-probability', async (req, res) => {
  try {
    const { nx, ny } = req.query;
    
    if (!nx || !ny) {
      return res.status(400).json({ message: '위치 정보(nx, ny)가 필요합니다.' });
    }
    
    logger.info(`강수 확률 정보 요청: nx=${nx}, ny=${ny}`);
    
    const now = new Date();
    const { date: baseDate } = formatDateTime(now);
    const baseTime = getBaseTime(now.getHours());
    
    // 기상청 단기예보 API 호출
    const apiUrl = `${WEATHER_API_BASE_URL}/getVilageFcst`;
    const params = {
      serviceKey: SERVICE_KEY,
      numOfRows: '1000',
      pageNo: '1',
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx: nx,
      ny: ny
    };
    
    const response = await callWeatherAPI(apiUrl, params);
    
    // API 응답 확인
    if (!response.response) {
      throw new Error('API 응답에 데이터가 없습니다.');
    }
    
    logger.info(`API 응답 코드: ${response.response.header.resultCode}`);
    
    if (response.response.header.resultCode !== '00') {
      throw new Error(`API 오류: ${response.response.header.resultMsg}`);
    }
    
    const items = response.response.body.items.item;
    
    // 향후 24시간 강수 확률 추출 (3시간 간격)
    const popData = items
      .filter(item => item.category === 'POP') // 강수확률
      .map(item => ({
        time: item.fcstTime,
        date: item.fcstDate,
        value: item.fcstValue,
        formattedTime: `${item.fcstDate.slice(4, 6)}/${item.fcstDate.slice(6, 8)} ${item.fcstTime.slice(0, 2)}:00`
      }))
      .slice(0, 8); // 향후 24시간(8개 데이터)
    
    res.json({
      success: true,
      data: popData,
      location: { nx, ny },
      baseDateTime: { baseDate, baseTime }
    });
    
  } catch (error) {
    logger.error(`강수 확률 정보 조회 오류: ${error.message}`);
    res.status(500).json({ 
      success: false,
      message: '강수 확률 정보를 가져오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 3. 풍량(풍속) API
router.get('/wind-speed', async (req, res) => {
  try {
    const { nx, ny } = req.query;
    
    if (!nx || !ny) {
      return res.status(400).json({ message: '위치 정보(nx, ny)가 필요합니다.' });
    }
    
    logger.info(`풍속 정보 요청: nx=${nx}, ny=${ny}`);
    
    const now = new Date();
    const { date: baseDate } = formatDateTime(now);
    const baseTime = getBaseTime(now.getHours());
    
    // 기상청 단기예보 API 호출
    const apiUrl = `${WEATHER_API_BASE_URL}/getVilageFcst`;
    const params = {
      serviceKey: SERVICE_KEY,
      numOfRows: '1000',
      pageNo: '1',
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx: nx,
      ny: ny
    };
    
    const response = await callWeatherAPI(apiUrl, params);
    
    // API 응답 확인
    if (!response.response) {
      throw new Error('API 응답에 데이터가 없습니다.');
    }
    
    logger.info(`API 응답 코드: ${response.response.header.resultCode}`);
    
    if (response.response.header.resultCode !== '00') {
      throw new Error(`API 오류: ${response.response.header.resultMsg}`);
    }
    
    const items = response.response.body.items.item;
    
    // 풍속(WSD)과 풍향(VEC) 데이터 추출
    const windData = [];
    const processedTimes = new Set();
    
    // 향후 24시간 데이터만 추출(3시간 간격, 총 8개 시점)
    items.forEach(item => {
      if ((item.category === 'WSD' || item.category === 'VEC') && !processedTimes.has(`${item.fcstDate}-${item.fcstTime}`)) {
        
        const windItem = {
          time: item.fcstTime,
          date: item.fcstDate,
          formattedTime: `${item.fcstDate.slice(4, 6)}/${item.fcstDate.slice(6, 8)} ${item.fcstTime.slice(0, 2)}:00`
        };
        
        // 해당 시간의 풍속과 풍향 찾기
        const wsdItem = items.find(i => 
          i.category === 'WSD' && 
          i.fcstDate === item.fcstDate && 
          i.fcstTime === item.fcstTime
        );
        
        const vecItem = items.find(i => 
          i.category === 'VEC' && 
          i.fcstDate === item.fcstDate && 
          i.fcstTime === item.fcstTime
        );
        
        if (wsdItem) {
          windItem.speed = wsdItem.fcstValue;
          
          // 풍속에 따른 단계 구분
          const speed = parseFloat(wsdItem.fcstValue);
          if (speed < 4) {
            windItem.speedLevel = '약한 바람';
          } else if (speed < 9) {
            windItem.speedLevel = '약간 강한 바람';
          } else if (speed < 14) {
            windItem.speedLevel = '강한 바람';
          } else {
            windItem.speedLevel = '매우 강한 바람';
          }
        }
        
        if (vecItem) {
          windItem.direction = vecItem.fcstValue;
          
          // 풍향 각도를 방향으로 변환 (16방위)
          const dir = parseFloat(vecItem.fcstValue);
          const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
          const index = Math.round(((dir % 360) / 22.5)) % 16;
          windItem.directionText = directions[index];
        }
        
        if (wsdItem && vecItem) {
          windData.push(windItem);
          processedTimes.add(`${item.fcstDate}-${item.fcstTime}`);
        }
      }
    });
    
    // 시간순으로 정렬하고 24시간(최대 8개) 데이터만 반환
    windData.sort((a, b) => {
      if (a.date !== b.date) return a.date - b.date;
      return a.time - b.time;
    });
    
    const result = windData.slice(0, 8);
    
    res.json({
      success: true,
      data: result,
      location: { nx, ny },
      baseDateTime: { baseDate, baseTime }
    });
    
  } catch (error) {
    logger.error(`풍속 정보 조회 오류: ${error.message}`);
    res.status(500).json({ 
      success: false,
      message: '풍속 정보를 가져오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 4. 습도 API
router.get('/humidity', async (req, res) => {
  try {
    const { nx, ny } = req.query;
    
    if (!nx || !ny) {
      return res.status(400).json({ message: '위치 정보(nx, ny)가 필요합니다.' });
    }
    
    logger.info(`습도 정보 요청: nx=${nx}, ny=${ny}`);
    
    const now = new Date();
    const { date: baseDate } = formatDateTime(now);
    const baseTime = getBaseTime(now.getHours());
    
    // 기상청 단기예보 API 호출
    const apiUrl = `${WEATHER_API_BASE_URL}/getVilageFcst`;
    const params = {
      serviceKey: SERVICE_KEY,
      numOfRows: '1000',
      pageNo: '1',
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx: nx,
      ny: ny
    };
    
    const response = await callWeatherAPI(apiUrl, params);
    
    // API 응답 확인
    if (!response.response) {
      throw new Error('API 응답에 데이터가 없습니다.');
    }
    
    logger.info(`API 응답 코드: ${response.response.header.resultCode}`);
    
    if (response.response.header.resultCode !== '00') {
      throw new Error(`API 오류: ${response.response.header.resultMsg}`);
    }
    
    const items = response.response.body.items.item;
    
    // 습도(REH) 데이터 추출
    const humidityData = items
      .filter(item => item.category === 'REH')
      .map(item => ({
        time: item.fcstTime,
        date: item.fcstDate,
        value: item.fcstValue,
        formattedTime: `${item.fcstDate.slice(4, 6)}/${item.fcstDate.slice(6, 8)} ${item.fcstTime.slice(0, 2)}:00`
      }))
      .slice(0, 8); // 향후 24시간(8개 데이터)
    
    res.json({
      success: true,
      data: humidityData,
      location: { nx, ny },
      baseDateTime: { baseDate, baseTime }
    });
    
  } catch (error) {
    logger.error(`습도 정보 조회 오류: ${error.message}`);
    res.status(500).json({ 
      success: false,
      message: '습도 정보를 가져오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 5. 위도/경도를 격자 좌표(nx, ny)로 변환하는 API
router.get('/convert-grid', (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ message: '위도(lat)와 경도(lon) 정보가 필요합니다.' });
    }
    
    // 위경도를 기상청 격자 좌표로 변환
    const { nx, ny } = convertToGrid(parseFloat(lat), parseFloat(lon));
    
    res.json({
      success: true,
      data: { nx, ny },
      original: { lat, lon }
    });
    
  } catch (error) {
    logger.error(`좌표 변환 오류: ${error.message}`);
    res.status(500).json({ 
      success: false,
      message: '좌표 변환 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 위경도를 기상청 격자 좌표로 변환하는 함수
function convertToGrid(lat, lon) {
  const RE = 6371.00877; // 지구 반경(km)
  const GRID = 5.0; // 격자 간격(km)
  const SLAT1 = 30.0; // 표준위도 1
  const SLAT2 = 60.0; // 표준위도 2
  const OLON = 126.0; // 기준점 경도
  const OLAT = 38.0; // 기준점 위도
  const XO = 210 / GRID; // 기준점 X좌표
  const YO = 675 / GRID; // 기준점 Y좌표
  
  const DEGRAD = Math.PI / 180.0;
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
  
  // 위경도를 격자로 변환
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;
  
  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  
  return { nx, ny };
}

module.exports = router;