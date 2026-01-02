# Supabase 이메일 확인 메일 발송 설정 가이드

## 문제 해결 체크리스트

### 1. Supabase 대시보드 설정 확인

#### Authentication → URL Configuration
- **Site URL**: 
  - 로컬 개발: `http://localhost:5175` (또는 사용 중인 포트)
  - 프로덕션: `https://speaking-ai-tan.vercel.app`

- **Redirect URLs**에 다음 추가:
  ```
  http://localhost:5175/**
  http://localhost:5175/auth/callback
  https://speaking-ai-tan.vercel.app/**
  https://speaking-ai-tan.vercel.app/auth/callback
  ```

#### Authentication → Settings
- **Enable email confirmations**: **ON** (이메일 확인 활성화)
- **Enable email change confirmations**: ON (선택)

#### Authentication → Email Templates
- **Confirm signup** 템플릿이 존재하고 활성화되어 있는지 확인
- 템플릿 내용에서 `{{ .RedirectTo }}` 또는 `{{ .SiteURL }}` 사용 확인

### 2. Rate Limiting 확인
- **Authentication → Rate Limits**에서 이메일 발송 한도 확인
- 무료 플랜은 일일 발송 한도가 있을 수 있음

### 3. 코드에서 확인할 사항

#### 브라우저 콘솔 확인
회원가입 시 다음 로그를 확인하세요:
- `Redirect URL:` - 올바른 URL인지 확인
- `SignUp request:` - 요청 파라미터 확인
- `SignUp success:` - 성공 시 상세 정보 확인
- 에러 발생 시 `Supabase signUp error details:` 확인

#### 정상적인 동작
- 이메일 확인이 활성화되어 있으면:
  - `data.user`가 `null`이고 `data.session`도 `null`일 수 있음
  - 이것은 정상이며, 이메일이 발송되었을 가능성이 높음
  - 사용자는 이메일 확인 후 로그인 가능

- 이메일 확인이 비활성화되어 있으면:
  - `data.user`가 즉시 생성됨
  - 이메일 발송 없이 바로 로그인 가능

### 4. 문제 해결 단계

1. **Supabase 대시보드에서 Site URL과 Redirect URLs 확인**
2. **브라우저 콘솔에서 에러 메시지 확인**
3. **이메일 스팸 폴더 확인**
4. **다른 이메일 주소로 테스트**
5. **Supabase 대시보드 → Authentication → Users에서 사용자 생성 여부 확인**

### 5. 임시 해결 방법 (개발 중)

개발 중에는 이메일 확인을 비활성화할 수 있습니다:
- **Authentication → Settings → Enable email confirmations**: OFF
- 프로덕션 배포 전에는 다시 활성화 필요

### 6. 디버깅 팁

브라우저 콘솔에서 다음을 확인:
```javascript
// 현재 URL 확인
console.log('Current URL:', window.location.origin);

// Supabase 클라이언트 확인
import { getSupabase } from '$lib/utils/supabaseClient';
const supabase = await getSupabase();
console.log('Supabase URL:', supabase.supabaseUrl);
```
