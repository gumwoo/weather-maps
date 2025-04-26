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

## 상세 기술 명세

### 아키텍처 설명

#### 백엔드 아키텍처
- **Express API 서버**: RESTful API를 제공하는 Node.js/Express 서버
- **날씨 데이터 처리 레이어**: 기상청 API 응답을 가공하고 클라이언트에 적합한 형태로 변환
- **로깅 시스템**: Winston을 활용한 다단계 로그 기록 (콘솔, 파일)
- **환경 설정**: dotenv를 사용한 환경 변수 관리

#### 프론트엔드 아키텍처
- **React 컴포넌트 기반 구조**: 기능별 컴포넌트 분리
- **클라이언트 사이드 격자 변환**: 위경도 → 기상청 격자 좌표 변환을 프론트엔드에서 처리
- **캐싱 레이어**: 중복 계산 방지를 위한 좌표 변환 캐싱 메커니즘
- **네이버 지도 통합**: 동적 지도 로딩 및 이벤트 처리

### 성능 최적화

#### 프론트엔드 최적화
1. **격자 변환 클라이언트 처리**
   - 백엔드 API 호출 50% 감소 (위치당 2회 → 1회)
   - 네트워크 지연 시간 약 300-500ms 단축
   - LCC(Lambert Conformal Conic) 투영법 기반 격자 변환 클라이언트 구현

2. **캐싱 메커니즘**
   - 소수점 4자리 좌표 반올림으로 약 11m 정밀도 유지하며 캐싱
   - LRU(Least Recently Used) 알고리즘 기반 캐시 관리
   - 최대 100개 좌표 정보 메모리 캐싱

3. **네이버 지도 최적화**
   - 지도 스크립트 동적 로딩
   - 컴포넌트 마운트/언마운트 시 리소스 관리
   - 지도 이벤트 효율적 처리

#### 백엔드 최적화
1. **API 응답 처리**
   - 기상청 API 응답 데이터 경량화 (필요한 정보만 추출)
   - 오류 처리 및 로깅 강화

2. **보안 고려**
   - API 키 이중 인코딩 방지
   - CORS 설정
   - 환경 변수 분리

### 기술적 세부 구현

#### 기상청 격자 좌표 변환 시스템
```javascript
// 위경도를 기상청 격자 좌표로 변환하는 LCC 투영법 구현
export const convertToGrid = (lat, lon) => {
  // 경계값 체크
  if (!lat || !lon) {
    console.error('유효하지 않은 좌표:', { lat, lon });
    return { nx: 0, ny: 0 };
  }

  const DEGRAD = Math.PI / 180.0;
  // ... 추가 계산 로직 ...
  
  const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  
  return { nx: x, ny: y };
};
```

#### 날씨 데이터 시각화
- 온도별 색상 코딩 (매우 추움: 파랑 ~ 매우 더움: 빨강)
- 강수확률에 따른 단계별 색상 표시
- 풍속 정보 방향 및 세기 표시
- 습도 정보 시각적 표현

#### 로깅 시스템
- 서버 로그: 요청/응답 정보, 오류 정보
- API 로그: 외부 API 호출 정보, 응답 결과
- 클라이언트 로그: 사용자 조작, 오류 상황

### 제한사항 및 알려진 이슈

1. **기상청 API 제한**
   - 일별 요청 횟수 제한 (무료 계정 1일 1,000회)
   - 발표 시간에 따른 데이터 갱신 지연

2. **네이버 지도 API 제한**
   - 모바일 환경에서 일부 기능 제한
   - Web Service URL 등록 시 localhost 대신 127.0.0.1 사용 필요

3. **브라우저 호환성**
   - IE11 미지원
   - 모던 브라우저(Chrome, Firefox, Safari, Edge) 최적화

### 확장 계획

1. **데이터 시각화 개선**
   - 시계열 데이터 차트 추가
   - 날씨 애니메이션 효과

2. **기능 추가**
   - 위치 검색 기능
   - 즐겨찾기 위치 저장
   - 주간 예보 통합

3. **성능 최적화**
   - 서버 사이드 렌더링(SSR) 도입 고려
   - 데이터 압축 및 전송 최적화

## 라이센스

MIT License
