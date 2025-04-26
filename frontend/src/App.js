import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import WeatherMap from './components/WeatherMap';
import './App.css';

function App() {
  const [weatherState, setWeatherState] = useState('temperature');
  
  // 애플리케이션 시작 시 동작 로깅
  useEffect(() => {
    console.log('Weather Map 애플리케이션이 시작되었습니다.');
    
    // 추가 작업이 필요할 경우 여기에 추가
    
    return () => {
      // 컴포넌트 언마운트 시 정리 작업
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <NavBar weatherState={weatherState} setWeatherState={setWeatherState} />
        
        <main className="app-content">
          <Routes>
            <Route path="/" element={<WeatherMap weatherState={weatherState} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
