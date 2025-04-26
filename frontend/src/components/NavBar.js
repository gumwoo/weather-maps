import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './NavBar.css';

const NavBar = ({ weatherState, setWeatherState }) => {
  const location = useLocation();
  const [currentTemp, setCurrentTemp] = useState('--');
  const [precipitationProb, setPrecipitationProb] = useState('--');
  const [windSpeed, setWindSpeed] = useState('--');
  const [humidity, setHumidity] = useState('--');
  const [loading, setLoading] = useState(true);
  
  // 현재 위치의 날씨 정보 가져오기
  useEffect(() => {
    console.log('NavBar 컴포넌트 마운트');
    
    // 브라우저 위치 정보 가져오기
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // 위도, 경도 좌표를 nx, ny 격자 좌표로 변환
            const { latitude, longitude } = position.coords;
            console.log(`현재 위치: 위도 ${latitude}, 경도 ${longitude}`);
            
            const gridResponse = await axios.get(`/api/v1/weather/convert-grid?lat=${latitude}&lon=${longitude}`);
            const { nx, ny } = gridResponse.data.data;
            console.log(`격자 좌표: nx=${nx}, ny=${ny}`);
            
            // 각 날씨 정보 가져오기
            const tempResponse = await axios.get(`/api/v1/weather/current-temperature?nx=${nx}&ny=${ny}`);
            const precipResponse = await axios.get(`/api/v1/weather/precipitation-probability?nx=${nx}&ny=${ny}`);
            const windResponse = await axios.get(`/api/v1/weather/wind-speed?nx=${nx}&ny=${ny}`);
            const humidityResponse = await axios.get(`/api/v1/weather/humidity?nx=${nx}&ny=${ny}`);
            
            // 데이터 설정
            if (tempResponse.data.success) {
              setCurrentTemp(tempResponse.data.data.temperature);
            }
            
            if (precipResponse.data.success && precipResponse.data.data.length > 0) {
              setPrecipitationProb(precipResponse.data.data[0].value);
            }
            
            if (windResponse.data.success && windResponse.data.data.length > 0) {
              setWindSpeed(windResponse.data.data[0].speed);
            }
            
            if (humidityResponse.data.success && humidityResponse.data.data.length > 0) {
              setHumidity(humidityResponse.data.data[0].value);
            }
            
            setLoading(false);
          } catch (error) {
            console.error('날씨 정보를 가져오는 중 오류 발생:', error);
            setLoading(false);
          }
        },
        (error) => {
          console.error('위치 정보를 가져오는 중 오류 발생:', error);
          setLoading(false);
        }
      );
    } else {
      console.error('이 브라우저에서는 위치 정보를 지원하지 않습니다.');
      setLoading(false);
    }
  }, []);
  
  const handleStateChange = (newState) => {
    console.log(`날씨 상태 변경: ${newState}`);
    setWeatherState(newState);
  };
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Weather Map
        </Link>
        
        <div className="nav-items">
          <div 
            className={`nav-item ${weatherState === 'temperature' ? 'active' : ''}`}
            onClick={() => handleStateChange('temperature')}
          >
            <i className="fas fa-temperature-high"></i>
            <div className="nav-item-content">
              <div className="nav-item-title">기온</div>
              <div className="nav-item-value">{loading ? '--' : `${currentTemp}°C`}</div>
            </div>
          </div>
          
          <div 
            className={`nav-item ${weatherState === 'precipitation' ? 'active' : ''}`}
            onClick={() => handleStateChange('precipitation')}
          >
            <i className="fas fa-cloud-rain"></i>
            <div className="nav-item-content">
              <div className="nav-item-title">강수확률</div>
              <div className="nav-item-value">{loading ? '--' : `${precipitationProb}%`}</div>
            </div>
          </div>
          
          <div 
            className={`nav-item ${weatherState === 'wind' ? 'active' : ''}`}
            onClick={() => handleStateChange('wind')}
          >
            <i className="fas fa-wind"></i>
            <div className="nav-item-content">
              <div className="nav-item-title">풍속</div>
              <div className="nav-item-value">{loading ? '--' : `${windSpeed}m/s`}</div>
            </div>
          </div>
          
          <div 
            className={`nav-item ${weatherState === 'humidity' ? 'active' : ''}`}
            onClick={() => handleStateChange('humidity')}
          >
            <i className="fas fa-water"></i>
            <div className="nav-item-content">
              <div className="nav-item-title">습도</div>
              <div className="nav-item-value">{loading ? '--' : `${humidity}%`}</div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
