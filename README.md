# Speaking AI - 실시간 영어 회화 서비스

OpenAI Realtime API를 사용한 초저지연 영어 회화 연습 서비스입니다.

## 기능

- 🎤 **음성 녹음**: 마이크를 사용한 음성 녹음 및 재생
- 🌊 **실시간 파형 시각화**: 녹음 중 오디오 파형 실시간 표시
- 🗣️ **실시간 영어 회화**: OpenAI Realtime API를 통한 초저지연 음성 대화
- 💬 **대화 로그**: 실시간 대화 내용 기록

## 시작하기

### 1. 의존성 설치

```sh
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 OpenAI API 키를 설정하세요:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

OpenAI API 키는 [OpenAI Platform](https://platform.openai.com/api-keys)에서 발급받을 수 있습니다.

### 3. 개발 서버 실행

```sh
npm run dev

# 또는 브라우저에서 자동으로 열기
npm run dev -- --open
```

## 사용 방법

### 기본 녹음 기능

1. "녹음 시작" 버튼을 클릭하여 마이크 권한 허용
2. 음성을 녹음
3. "녹음 중지" 버튼으로 녹음 종료
4. 녹음된 오디오를 재생하고 확인
5. 필요시 다운로드

### 실시간 영어 회화

1. 우측 상단의 "실시간 회화" 버튼 클릭
2. "대화 시작" 버튼으로 연결 시작
3. 연결이 완료되면 자연스럽게 영어로 대화 시작
4. AI 튜터가 실시간으로 응답합니다
5. "대화 종료" 버튼으로 연결 종료

## 기술 스택

- **프레임워크**: SvelteKit 5
- **스타일링**: Tailwind CSS
- **오디오 처리**: Web Audio API, MediaRecorder API
- **실시간 통신**: OpenAI Realtime API (WebRTC)
- **에이전트 SDK**: @openai/agents

## 프로젝트 구조

```
src/
├── lib/
│   ├── components/          # 재사용 가능한 컴포넌트
│   │   ├── MicIndicator.svelte
│   │   ├── WaveformCanvas.svelte
│   │   ├── RecordingControls.svelte
│   │   ├── AudioPlayback.svelte
│   │   └── RealtimeConversation.svelte
│   ├── services/           # 비즈니스 로직
│   │   ├── recordingService.js
│   │   └── realtimeAgentService.js
│   └── utils/              # 유틸리티 함수
│       ├── formatTime.js
│       ├── audioUtils.js
│       └── canvasUtils.js
├── routes/
│   ├── api/
│   │   └── realtime-client-secret/  # Ephemeral key 생성 API
│   └── +page.svelte        # 메인 페이지
```

## 빌드

프로덕션 빌드를 생성하려면:

```sh
npm run build
```

프로덕션 빌드를 미리보려면:

```sh
npm run preview
```

## 배포

Vercel 어댑터가 이미 설정되어 있습니다. Vercel에 배포하려면:

1. GitHub에 프로젝트 푸시
2. [Vercel](https://vercel.com)에서 프로젝트 import
3. 환경 변수 `OPENAI_API_KEY` 설정
4. 배포 완료!

## 주의사항

- OpenAI API 키는 절대 클라이언트 코드에 노출되지 않도록 서버 사이드에서만 사용됩니다
- 실시간 회화 기능은 브라우저의 마이크 권한이 필요합니다
- WebRTC 연결을 위해 HTTPS 환경에서 실행하는 것을 권장합니다 (로컬 개발 시 localhost는 예외)

## 라이선스

MIT
