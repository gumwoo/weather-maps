const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
const dotenv = require('dotenv');
const axios = require('axios');

// 환경 변수 설정
dotenv.config();

// 로그 디렉토리 확인 및 생성
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 로그 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// 앱 초기화
const app = express();
const PORT = process.env.PORT || 5002;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// 라우트 설정
const weatherRoutes = require('./routes/weather');
app.use('/api/v1/weather', weatherRoutes);

// 프론트엔드 정적 파일 제공 (빌드 후)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
  });
}

// 서버 시작
app.listen(PORT, () => {
  logger.info(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
