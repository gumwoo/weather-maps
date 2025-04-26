# Weather Map

지도 기반 날씨 정보 제공 웹 애플리케이션

## 프로젝트 소개

Weather Map은 네이버 지도 API와 기상청 단기예보 조회 서비스 API를 활용하여 지도 위에 다양한 날씨 정보를 시각적으로 제공하는 웹 애플리케이션입니다. 사용자는 지도에서 원하는 위치를 선택하여 해당 지역의 현재 기온, 강수확률, 풍속, 습도 등의 다양한 날씨 정보를 확인할 수 있습니다.

## 주요 기능

- 지도에서 위치 선택하여 날씨 정보 조회
- 현재 위치 기반 날씨 정보 자동 표시
- 다양한 날씨 정보 모드 지원
  - 현재 기온
  - 24시간 내 강수 확률
  - 풍속 정보
  - 습도 정보
- 날씨 정보의 시각적 표현 (색상 코딩)
- 반응형 디자인 (PC, 모바일 지원)

## 기술 스택

### 프론트엔드
- React
- React Router
- Axios
- Naver Maps API

### 백엔드
- Node.js
- Express
- Axios
- Winston (로깅)

### 외부 API
- 기상청 단기예보 조회 서비스 API
- 네이버 Maps API

## 설치 및 실행 방법

### 사전 요구사항
- Node.js 14.x 이상
- npm 6.x 이상

### 백엔드 설정
1. 프로젝트 클론:
```
git clone <repository-url>
cd weather_map
```

2. 의존성 설치:
```
npm install
```

3. 환경 변수 설정:
`.env` 파일을 다음과 같이 생성:
```
PORT=5002
WEATHER_API_KEY=your_weather_api_key
NAVER_MAPS_KEY=your_naver_maps_key
```

4. 백엔드 서버 실행:
```
nodemon server.js
```

### 프론트엔드 설정
1. 프론트엔드 디렉토리로 이동:
```
cd frontend
```

2. 의존성 설치:
```
npm install
```

3. 프론트엔드 개발 서버 실행:
```
npm start
```

4. 브라우저에서 접속:
http://localhost:3003

## API 엔드포인트

### 현재 기온 조회
```
GET /api/v1/weather/current-temperature?nx=<X좌표>&ny=<Y좌표>
```

### 강수 확률 조회
```
GET /api/v1/weather/precipitation-probability?nx=<X좌표>&ny=<Y좌표>
```

### 풍속 정보 조회
```
GET /api/v1/weather/wind-speed?nx=<X좌표>&ny=<Y좌표>
```

### 습도 정보 조회
```
GET /api/v1/weather/humidity?nx=<X좌표>&ny=<Y좌표>
```

### 위경도를 격자 좌표로 변환
```
GET /api/v1/weather/convert-grid?lat=<위도>&lon=<경도>
```

## 프로젝트 구조

```
weather_map/
├── docs/                      # 문서
│   └── project_plan.md
├── logs/                      # 로그 파일
├── frontend/                  # React 프론트엔드
│   ├── src/
│   │   ├── components/        # React 컴포넌트
│   │   │   ├── NavBar.js      # 네비게이션 바
│   │   │   ├── NavBar.css
│   │   │   ├── WeatherMap.js  # 지도 컴포넌트
│   │   │   └── WeatherMap.css
│   │   ├── App.js             # 메인 애플리케이션
│   │   └── App.css            # 앱 스타일
│   └── package.json           # 프론트엔드 의존성
├── routes/                    # 백엔드 라우트
│   └── weather.js             # 날씨 API 라우트
├── server.js                  # 백엔드 서버
├── package.json               # 백엔드 의존성
└── .env                       # 환경 변수
```

## 기술적 고려사항

### Glassmorphism / Neumorphism 디자인
UI에 현대적인 Glassmorphism과 Neumorphism 디자인 요소를 적용하여 시각적으로 매력적인 인터페이스를 구현했습니다.

### 상태 관리
React 컴포넌트 상태를 활용하여 애플리케이션의 다양한 날씨 상태(기온, 강수확률, 풍속, 습도)를 관리합니다.

### API 응답 캐싱
API 호출 제한을 고려하여 향후 캐싱 전략 도입 예정입니다.

### 로깅
Winston 라이브러리를 사용하여 서버 로그와 API 호출 로그를 관리합니다.

## 라이센스

MIT License
