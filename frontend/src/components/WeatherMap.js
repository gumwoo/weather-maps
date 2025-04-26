import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './WeatherMap.css';
import { convertToGridWithCache } from '../utils/gridUtil';

const WeatherMap = ({ weatherState }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState({ lat: 37.5665, lng: 126.9780 }); // 서울 기본 좌표
  const [weatherOverlays, setWeatherOverlays] = useState([]);

  // 네이버 맵 초기화
  useEffect(() => {
    console.log('네이버 지도 초기화 시작');
    
    // 브라우저의 위치 정보 가져오기
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`현재 위치: 위도 ${latitude}, 경도 ${longitude}`);
          setPosition({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('위치 정보를 가져오는 중 오류 발생:', error);
        }
      );
    }
    
    // 네이버 맵 스크립트 로드 확인 및 추가
    const loadNaverMapsScript = () => {
      // 이미 스크립트가 로드되어 있는지 확인
      if (document.querySelector('script[src*="maps.js"]')) {
        console.log('네이버 맵 스크립트가 이미 로드되어 있습니다.');
        checkNaverMapsLoaded();
        return;
      }
      
      console.log('네이버 맵 스크립트 로드 시작');
      const script = document.createElement('script');
      script.type = 'text/javascript';
      // 중요: 네이버 클라우드 콘솔에서 Web Service URL 등록 시 localhost 대신 127.0.0.1 사용해야 함
      // 예: http://127.0.0.1:3003 형태로 등록해야 함 (로컬호스트 사용 불가)
      script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.REACT_APP_NAVER_MAP_CLIENT_ID || 'eZGFFZA7xMFOkJOltaZWec9nkdRYwEpkbIPqb9D3'}`;
      script.async = true;
      script.onload = () => {
        console.log('네이버 맵 스크립트 로드 완료');
        checkNaverMapsLoaded();
      };
      script.onerror = () => {
        console.error('네이버 맵 스크립트 로드 실패');
        setError('지도를 불러오는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
      };
      document.head.appendChild(script);
    };
    
    // 지도 API가 로드되었는지 확인하는 함수
    const checkNaverMapsLoaded = () => {
      if (window.naver && window.naver.maps) {
        console.log('naver.maps 객체 확인됨, 지도 초기화 시작');
        initializeMap();
      } else {
        console.log('naver.maps 객체가 아직 준비되지 않음, 대기 시작');
        // naver 객체가 로드될 때까지 대기
        let attempts = 0;
        const maxAttempts = 20;
        const checkInterval = setInterval(() => {
          attempts++;
          console.log(`지도 API 로드 확인 시도: ${attempts}/${maxAttempts}`);
          
          if (window.naver && window.naver.maps) {
            clearInterval(checkInterval);
            console.log('네이버 지도 API 로드 확인됨');
            initializeMap();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.error('네이버 지도 API가 로드되지 않았습니다.');
            setError('지도를 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
          }
        }, 500);
      }
    };
    
    // 네이버 맵 스크립트 로드 시작
    loadNaverMapsScript();
    
    return () => {
      // 컴포넌트 언마운트 시 정리 작업
      if (map) {
        console.log('컴포넌트 언마운트 - 지도 리소스 정리');
        // 지도 이벤트 리스너 제거 및 자원 정리
        weatherOverlays.forEach(overlay => {
          if (overlay && typeof overlay.setMap === 'function') {
            overlay.setMap(null);
          }
        });
      }
    };
  }, []);
  
  // 날씨 상태가 변경될 때 날씨 데이터 다시 가져오기
  useEffect(() => {
    console.log(`날씨 상태 변경됨: ${weatherState}`);
    
    // 맵과 위치 정보가 모두 준비된 경우 새로운 날씨 데이터 요청
    if (map && position) {
      console.log(`날씨 상태 변경으로 새 데이터 요청: ${weatherState}`);
      // 이전 상태 초기화 후 새 데이터 요청
      setWeatherData(null);
      setLoading(true);
      setError(null);
      fetchWeatherData(position.lat, position.lng);
    } else {
      console.log('맵 또는 위치 정보가 없어 날씨 데이터를 가져올 수 없음');
      if (!map) console.log('맵이 준비되지 않음');
      if (!position) console.log('위치 정보가 준비되지 않음');
    }
  }, [map, position, weatherState]);
  
  // 날씨 데이터가 변경될 때 지도 오버레이 업데이트
  useEffect(() => {
    console.log('날씨 데이터 변경됨');
    if (!loading && map && weatherData) {
      console.log('맵과 날씨 데이터가 있어 오버레이 업데이트 시도');
      try {
        updateWeatherOverlays();
      } catch (err) {
        console.error('오버레이 업데이트 중 오류 발생:', err);
        // 오류가 발생해도 정보 패널은 표시
        displayWeatherInfoPanel();
      }
    } else {
      console.log('맵 또는 날씨 데이터가 없어 오버레이 업데이트 실패');
      if (!map) console.log('맵이 준비되지 않음');
      if (!weatherData) console.log('날씨 데이터가 준비되지 않음');
      if (loading) console.log('아직 로딩 중');
    }
  }, [map, weatherData, loading]);
  
  // 위치가 변경될 때 지도 업데이트
  useEffect(() => {
    console.log('위치 변경: 지도 업데이트 시도');
    if (map && position && window.naver && window.naver.maps) {
      console.log(`지도 업데이트: 위도 ${position.lat}, 경도 ${position.lng}`);
      try {
        const naverLatLng = new window.naver.maps.LatLng(position.lat, position.lng);
        map.setCenter(naverLatLng);
        
        // 마커 업데이트
        if (marker) {
          console.log('기존 마커 업데이트');
          marker.setPosition(naverLatLng);
        } else {
          console.log('새 마커 생성');
          const newMarker = new window.naver.maps.Marker({
            position: naverLatLng,
            map: map,
            icon: {
              content: '<div class="custom-marker"><i class="fas fa-map-marker-alt"></i></div>',
              anchor: new window.naver.maps.Point(15, 30)
            }
          });
          setMarker(newMarker);
        }
        
        // 날씨 정보 가져오기
        fetchWeatherData(position.lat, position.lng);
      } catch (error) {
        console.error('지도 업데이트 중 오류 발생:', error);
        setError(`지도 업데이트 중 오류가 발생했습니다: ${error.message}`);
      }
    } else {
      console.log('지도 또는 위치 정보가 준비되지 않아 업데이트 실패');
      if (!map) console.log('맵이 준비되지 않음');
      if (!position) console.log('위치 정보가 준비되지 않음');
      if (!window.naver || !window.naver.maps) console.log('네이버 맵 API가 준비되지 않음');
    }
  }, [map, position]);
  
  // 네이버 지도 초기화 함수
  const initializeMap = () => {
    try {
      if (!window.naver || !window.naver.maps) {
        console.error('네이버 맵 객체가 존재하지 않습니다.');
        setError('지도 API가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
        setLoading(false);
        return;
      }
      
      if (!mapRef.current) {
        console.error('지도를 표시할 DOM 요소가 없습니다.');
        setError('지도를 표시할 DOM 요소를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      
      console.log('네이버 지도 객체 생성 시작');
      
      // 위치 정보가 유효한지 확인
      if (!position || typeof position.lat !== 'number' || typeof position.lng !== 'number') {
        console.warn('위치 정보가 유효하지 않습니다. 기본 위치(서울)로 초기화합니다.');
        setPosition({ lat: 37.5665, lng: 126.9780 }); // 서울 기본 좌표로 초기화
        // 위치가 업데이트 되면 useEffect를 통해 다시 이 함수가 호출됨
        return;
      }
      
      try {
        const naverLatLng = new window.naver.maps.LatLng(position.lat, position.lng);
        console.log(`지도 중심 좌표: 위도 ${position.lat}, 경도 ${position.lng}`);
        
        const mapOptions = {
          center: naverLatLng,
          zoom: 10,
          zoomControl: true,
          zoomControlOptions: {
            position: window.naver.maps.Position.TOP_RIGHT
          }
        };
        
        const newMap = new window.naver.maps.Map(mapRef.current, mapOptions);
        console.log('지도 객체 생성 완료');
        
        setMap(newMap);
        
        // 지도 클릭 이벤트
        window.naver.maps.Event.addListener(newMap, 'click', (e) => {
          const latlng = e.coord;
          if (!latlng || typeof latlng.y !== 'number' || typeof latlng.x !== 'number') {
            console.error('클릭한 위치 정보가 유효하지 않습니다:', latlng);
            return;
          }
          console.log(`지도 클릭: 위도 ${latlng.y}, 경도 ${latlng.x}`);
          setPosition({ lat: latlng.y, lng: latlng.x });
        });
        
        console.log('지도 초기화 완료');
      } catch (mapInitError) {
        console.error('지도 객체 생성 중 오류:', mapInitError);
        setError(`지도 객체를 생성하는 중 오류가 발생했습니다: ${mapInitError.message}`);
        setLoading(false);
      }
    } catch (error) {
      console.error('지도를 초기화하는 중 오류 발생:', error);
      setError(`지도를 불러오는 중 오류가 발생했습니다: ${error.message}`);
      setLoading(false);
    }
  };
  
  // 날씨 데이터 가져오기
  const fetchWeatherData = async (lat, lng) => {
    try {
      console.log(`날씨 데이터 요청 시작: 위도 ${lat}, 경도 ${lng}, 날씨 상태: ${weatherState}`);
      setLoading(true);
      setError(null); // 기존 오류 초기화
      
      // 위도, 경도 좌표를 nx, ny 격자 좌표로 프론트엔드에서 직접 변환
      const { nx, ny } = convertToGridWithCache(lat, lng);
      console.log(`격자 좌표: nx=${nx}, ny=${ny} (프론트엔드에서 계산됨)`);
      
      // 날씨 상태에 따라 적절한 API 호출
      let apiEndpoint = '';
      switch (weatherState) {
        case 'temperature':
          apiEndpoint = `/api/v1/weather/current-temperature?nx=${nx}&ny=${ny}`;
          break;
        case 'precipitation':
          apiEndpoint = `/api/v1/weather/precipitation-probability?nx=${nx}&ny=${ny}`;
          break;
        case 'wind':
          apiEndpoint = `/api/v1/weather/wind-speed?nx=${nx}&ny=${ny}`;
          break;
        case 'humidity':
          apiEndpoint = `/api/v1/weather/humidity?nx=${nx}&ny=${ny}`;
          break;
        default:
          apiEndpoint = `/api/v1/weather/current-temperature?nx=${nx}&ny=${ny}`;
      }
      
      console.log(`API 요청: ${apiEndpoint}`);
      const response = await axios.get(apiEndpoint);
      console.log('날씨 데이터 응답 받음:', response.status);
      
      // 응답 유효성 검사
      if (!response.data) {
        throw new Error('응답 데이터가 없습니다.');
      }
      
      if (!response.data.success) {
        throw new Error(response.data.message || '서버에서 오류가 발생했습니다.');
      }
      
      console.log('날씨 데이터 가져오기 성공');
      setWeatherData(response.data);
    } catch (error) {
      console.error('날씨 정보를 가져오는 중 오류 발생:', error);
      if (error.response) {
        console.error('API 응답 오류:', error.response.status, error.response.data);
      }
      setError(`날씨 정보를 불러오는 중 오류가 발생했습니다: ${error.message}`);
      setWeatherData(null);
    } finally {
      setLoading(false);
    }
  };
  
  // 날씨 상태에 따른 오버레이 업데이트
  const updateWeatherOverlays = () => {
    console.log('날씨 오버레이 업데이트 시작');
    
    // 기존 오버레이 제거
    weatherOverlays.forEach(overlay => {
      if (overlay && typeof overlay.setMap === 'function') {
        overlay.setMap(null);
      }
    });
    setWeatherOverlays([]);
    
    // 필수 데이터 존재 여부 확인
    if (!map) {
      console.error('맵이 준비되지 않아 오버레이를 표시할 수 없습니다.');
      displayWeatherInfoPanel();
      return;
    }
    
    if (!weatherData || !weatherData.data) {
      console.error('날씨 데이터가 준비되지 않아 오버레이를 표시할 수 없습니다.');
      displayWeatherInfoPanel();
      return;
    }
    
    if (!window.naver || !window.naver.maps) {
      console.error('네이버 맵 API가 준비되지 않아 오버레이를 표시할 수 없습니다.');
      displayWeatherInfoPanel();
      return;
    }
    
    try {
      // 날씨 정보 표시 오버레이 생성
      const contentEl = document.createElement('div');
      contentEl.className = 'weather-info-overlay';
      
      let content = '';
      let colorClass = '';
      
      // 데이터 구조 확인을 위한 헬퍼 함수
      const isTemperatureData = (data) => {
        return data && typeof data === 'object' && typeof data.temperature !== 'undefined';
      };

      const isPrecipitationData = (data) => {
        return data && Array.isArray(data) && data.length > 0 && typeof data[0].value !== 'undefined';
      };

      const isWindData = (data) => {
        return data && Array.isArray(data) && data.length > 0 && typeof data[0].speed !== 'undefined';
      };

      const isHumidityData = (data) => {
        return data && Array.isArray(data) && data.length > 0 && typeof data[0].value !== 'undefined';
      };

      switch (weatherState) {
        case 'temperature':
          // temperature 데이터 구조 확인
          if (isTemperatureData(weatherData.data)) {
            const temp = weatherData.data.temperature;
            content = `<div class="weather-value">${temp}°C</div>`;
            
            // 온도에 따른 색상 설정
            if (temp < 0) {
              colorClass = 'very-cold';
            } else if (temp < 10) {
              colorClass = 'cold';
            } else if (temp < 20) {
              colorClass = 'mild';
            } else if (temp < 30) {
              colorClass = 'warm';
            } else {
              colorClass = 'hot';
            }
          } else {
            console.error('온도 데이터가 유효하지 않습니다:', weatherData.data);
            content = `<div class="weather-value">--°C</div>`;
            colorClass = 'mild';
          }
          break;
          
        case 'precipitation':
          // precipitation 데이터 구조 확인
          if (isPrecipitationData(weatherData.data)) {
            const prob = weatherData.data[0]?.value || '0';
            content = `<div class="weather-value">${prob}%</div>`;
            
            // 강수확률에 따른 색상 설정
            if (prob < 30) {
              colorClass = 'low-prob';
            } else if (prob < 60) {
              colorClass = 'medium-prob';
            } else {
              colorClass = 'high-prob';
            }
          } else {
            console.error('강수 확률 데이터가 유효하지 않습니다:', weatherData.data);
            content = `<div class="weather-value">--%</div>`;
            colorClass = 'low-prob';
          }
          break;
          
        case 'wind':
          // wind 데이터 구조 확인
          if (isWindData(weatherData.data)) {
            const speed = weatherData.data[0]?.speed || '0';
            content = `<div class="weather-value">${speed}m/s</div>`;
            
            // 풍속에 따른 색상 설정
            if (speed < 4) {
              colorClass = 'light-wind';
            } else if (speed < 9) {
              colorClass = 'medium-wind';
            } else {
              colorClass = 'strong-wind';
            }
          } else {
            console.error('풍속 데이터가 유효하지 않습니다:', weatherData.data);
            content = `<div class="weather-value">--m/s</div>`;
            colorClass = 'light-wind';
          }
          break;
          
        case 'humidity':
          // humidity 데이터 구조 확인
          if (isHumidityData(weatherData.data)) {
            const humidity = weatherData.data[0]?.value || '0';
            content = `<div class="weather-value">${humidity}%</div>`;
            
            // 습도에 따른 색상 설정
            if (humidity < 30) {
              colorClass = 'low-humidity';
            } else if (humidity < 70) {
              colorClass = 'medium-humidity';
            } else {
              colorClass = 'high-humidity';
            }
          } else {
            console.error('습도 데이터가 유효하지 않습니다:', weatherData.data);
            content = `<div class="weather-value">--%</div>`;
            colorClass = 'medium-humidity';
          }
          break;
          
        default:
          content = `<div class="weather-value">--</div>`;
          colorClass = 'mild';
      }
      
      contentEl.innerHTML = content;
      contentEl.classList.add(colorClass);
      
      // 오버레이 생성 및 표시 (마커로 대체)
      try {
        if (!position) {
          console.error('위치 정보가 없어 오버레이를 표시할 수 없습니다.');
          displayWeatherInfoPanel();
          return;
        }
        
        // 기존 weatherOverlays 배열 복사해서 사용 (문제 방지)
        const newOverlays = [...weatherOverlays];
        
        const overlay = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(position.lat, position.lng),
          map: map,
          icon: {
            content: contentEl,
            anchor: new window.naver.maps.Point(15, 15)
          }
        });
        
        console.log('날씨 오버레이가 성공적으로 생성되었습니다.');
        newOverlays.push(overlay);
        setWeatherOverlays(newOverlays);
      } catch (overlayError) {
        console.error('오버레이 생성 오류:', overlayError);
      }
      
      // 정보 창 표시 (맵 인증 없이도 표시 가능)
      displayWeatherInfoPanel();
    } catch (error) {
      console.error('날씨 오버레이 업데이트 중 오류 발생:', error);
      // 인증 오류의 경우에도 기본 정보 표시
      displayWeatherInfoPanel();
    }
  };
  
  // 날씨 정보 패널 표시
  const displayWeatherInfoPanel = () => {
    console.log('날씨 정보 패널 표시 시도');
    
    const infoPanel = document.getElementById('weather-info-panel');
    if (!infoPanel) {
      console.error('weather-info-panel 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 로딩 상태 표시
    if (loading) {
      infoPanel.innerHTML = `
        <div class="loading">날씨 정보를 불러오는 중...</div>
      `;
      return;
    }
    
    // 오류 상태 표시
    if (error) {
      infoPanel.innerHTML = `
        <div class="error">${error}</div>
        <div class="last-updated">
          시도 시간: ${new Date().toLocaleTimeString()}
        </div>
      `;
      return;
    }
    
    // 데이터가 없는 경우
    if (!weatherData || !weatherData.data) {
      infoPanel.innerHTML = `
        <div class="info-placeholder">
          지도에서 위치를 클릭하면 날씨 정보가 표시됩니다.
        </div>
      `;
      return;
    }
    
    console.log('날씨 데이터 확인:', JSON.stringify(weatherData).substring(0, 200));
    
    let title = '';
    let content = '';
    
    try {
      switch (weatherState) {
        case 'temperature':
          title = '현재 기온';
          const { temperature, skyStatus, rainType } = weatherData.data || {};
          const description = getWeatherDescription(skyStatus, rainType);
          content = `
            <div class="info-item">
              <span class="info-label">기온:</span>
              <span class="info-value">${temperature || '--'}°C</span>
            </div>
            <div class="info-item">
              <span class="info-label">날씨:</span>
              <span class="info-value">${description || '정보 없음'}</span>
            </div>
          `;
          
          // 위치 정보가 있는 경우에만 추가
          if (position) {
            content += `
              <div class="info-item">
                <span class="info-label">위치:</span>
                <span class="info-value">위도 ${position.lat.toFixed(4)}, 경도 ${position.lng.toFixed(4)}</span>
              </div>
            `;
          }
          break;
          
        case 'precipitation':
          title = '강수 확률';
          if (weatherData.data && Array.isArray(weatherData.data) && weatherData.data.length > 0) {
            content = weatherData.data.slice(0, 5).map(item => `
              <div class="info-item">
                <span class="info-label">${item.formattedTime || '--'}:</span>
                <span class="info-value">${item.value || '--'}%</span>
              </div>
            `).join('');
          } else {
            content = '<div class="info-item">강수 확률 정보가 없습니다.</div>';
          }
          break;
          
        case 'wind':
          title = '풍속 정보';
          if (weatherData.data && Array.isArray(weatherData.data) && weatherData.data.length > 0) {
            content = weatherData.data.slice(0, 5).map(item => `
              <div class="info-item">
                <span class="info-label">${item.formattedTime || '--'}:</span>
                <span class="info-value">${item.speed || '--'}m/s (${item.directionText || '--'}, ${item.speedLevel || '--'})</span>
              </div>
            `).join('');
          } else {
            content = '<div class="info-item">풍속 정보가 없습니다.</div>';
          }
          break;
          
        case 'humidity':
          title = '습도 정보';
          if (weatherData.data && Array.isArray(weatherData.data) && weatherData.data.length > 0) {
            content = weatherData.data.slice(0, 5).map(item => `
              <div class="info-item">
                <span class="info-label">${item.formattedTime || '--'}:</span>
                <span class="info-value">${item.value || '--'}%</span>
              </div>
            `).join('');
          } else {
            content = '<div class="info-item">습도 정보가 없습니다.</div>';
          }
          break;
          
        default:
          title = '날씨 정보';
          content = '<div class="info-item">날씨 상태를 선택해주세요.</div>';
      }
      
      
      infoPanel.innerHTML = `
        <h2>${title}</h2>
        <div class="info-content">
          ${content}
        </div>
        <div class="last-updated">
          마지막 업데이트: ${new Date().toLocaleTimeString()}
        </div>
      `;
    } catch (err) {
      console.error('정보 패널 생성 중 오류:', err);
      // 오류 발생시 기본 패널만 표시
      infoPanel.innerHTML = `
        <h2>날씨 정보</h2>
        <div class="info-content">
          <div class="info-item">정보를 표시하는 중 오류가 발생했습니다.</div>
        </div>
        <div class="last-updated">
          마지막 업데이트: ${new Date().toLocaleTimeString()}
        </div>
      `;
    }
  };
  
  // 하늘상태와 강수형태 정보로 날씨 설명 반환
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
    
    if (ptyValue && ptyValue !== '0') {
      return ptyStatus[ptyValue] || '알 수 없음';
    } else if (skyValue) {
      return skyStatus[skyValue] || '알 수 없음';
    }
    
    return '정보 없음';
  };
  
  // 현재 위치로 이동 함수
  const moveToCurrentLocation = () => {
    setLoading(true); // 위치 정보를 가져오는 동안 로딩 상태 표시
    setError(null); // 이전 오류 초기화
    
    if (navigator.geolocation) {
      console.log('현재 위치 정보 요청 중...');
      
      // 위치 정보 옵션 설정
      const options = {
        enableHighAccuracy: true, // 높은 정확도 요청
        timeout: 10000, // 10초 타임아웃
        maximumAge: 0 // 캐시된 위치 정보 사용하지 않음
      };
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`현재 위치 정보 수신 성공: 위도 ${latitude}, 경도 ${longitude}`);
          
          // 유효한 좌표인지 검증
          if (isNaN(latitude) || isNaN(longitude)) {
            console.error('유효하지 않은 위치 좌표:', { latitude, longitude });
            setError('유효하지 않은 위치 정보를 받았습니다.');
            setLoading(false);
            return;
          }
          
          // 위치 정보 상태 업데이트
          setPosition({ lat: latitude, lng: longitude });
          setLoading(false);
        },
        (error) => {
          console.error('위치 정보를 가져오는 중 오류 발생:', error);
          
          // 오류 코드에 따른 메시지 설정
          let errorMessage = '현재 위치를 가져올 수 없습니다.';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '위치 정보 접근 권한이 거부되었습니다. 브라우저 설정에서 위치 정보 접근을 허용해주세요.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '현재 위치 정보를 사용할 수 없습니다.';
              break;
            case error.TIMEOUT:
              errorMessage = '위치 정보 요청 시간이 초과되었습니다.';
              break;
          }
          
          setError(errorMessage);
          setLoading(false);
        },
        options
      );
    } else {
      console.error('Geolocation API를 지원하지 않는 브라우저입니다.');
      setError('이 브라우저에서는 위치 정보를 지원하지 않습니다. 다른 브라우저를 사용해보세요.');
      setLoading(false);
    }
  };
  
  return (
    <div className="weather-map-container">
      <div id="map" ref={mapRef} className="map-wrapper"></div>
      
      <div id="weather-info-panel" className="weather-info-panel">
        {loading ? (
          <div className="loading">날씨 정보를 불러오는 중...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="info-placeholder">
            지도에서 위치를 클릭하면 날씨 정보가 표시됩니다.
          </div>
        )}
      </div>
      
      <div className="map-controls">
        <button onClick={moveToCurrentLocation} className="current-location-btn">
          <i className="fas fa-location-arrow"></i>
          내 위치
        </button>
        <div className="scale-indicator">
          <div className="scale-bar"></div>
          <div className="scale-text">5km</div>
        </div>
      </div>
    </div>
  );
};

export default WeatherMap;
