# 30초 뒤 Push Notification 데모

Cloudflare Pages에서 호스팅하고 Supabase Edge Function을 통해 30초 뒤에 push notification을
보내는 간단한 웹앱입니다. 사용자가 버튼을 누르면 브라우저가 푸시 권한을 요청하고,
구독 정보를 Supabase Function에 전달합니다. 함수는 30초 대기 후 Web Push API를 사용해
알림을 발송합니다.

## 구성 요소

- `web/` – 정적 웹앱 소스. Service Worker로 푸시 알림을 처리합니다.
- `scripts/build.js` – Cloudflare Pages에서 사용할 빌드 스크립트. 환경 변수를 정적 파일에
  주입하고 `dist/` 폴더를 생성합니다.
- `supabase/functions/send-push/` – 알림 전송을 담당하는 Supabase Edge Function(Deno).

## 준비 사항

1. **VAPID 키 생성**
   ```bash
   npx web-push generate-vapid-keys
   ```
   출력되는 `publicKey`, `privateKey` 값을 기록합니다.

2. **Supabase 프로젝트**
   - Supabase CLI가 설치되어 있어야 합니다.
   - `.env` 등에 다음 환경 변수를 설정한 뒤 Edge Function을 배포합니다.
     ```bash
     supabase functions deploy send-push \
       --project-ref <your-project-ref> \
       --env VAPID_PUBLIC_KEY=<publicKey> \
       --env VAPID_PRIVATE_KEY=<privateKey> \
       --env VAPID_SUBJECT="mailto:you@example.com"
     ```
   - 배포 후 함수 URL은
     `https://<your-project-ref>.functions.supabase.co/send-push` 형태입니다.

3. **Cloudflare Pages 프로젝트**
   - 빌드 명령: `npm run build`
   - 빌드 출력 디렉터리: `dist`
   - 환경 변수:
     - `VAPID_PUBLIC_KEY` – 1단계에서 생성한 공개 키
     - `SUPABASE_FUNCTION_URL` – 2단계에서 확인한 함수 URL

## 동작 방식

1. 사용자가 버튼을 클릭하면 Service Worker가 등록되고 Notification 권한을 요청합니다.
2. Push 구독 정보를 생성하고 Supabase Function으로 전송합니다.
3. Edge Function이 30초 동안 대기한 뒤 Web Push를 이용해 알림을 발송합니다.
4. Service Worker가 `push` 이벤트를 받아 알림을 표시합니다.

## 로컬 빌드 (선택)

로컬에서 실행하지 않아도 되지만, 정적 파일이 올바르게 생성되는지 확인하려면 다음
명령을 사용할 수 있습니다.

```bash
npm install
VAPID_PUBLIC_KEY=<your-public-key> \
SUPABASE_FUNCTION_URL=https://<project-ref>.functions.supabase.co/send-push \
npm run build
```

`dist/` 폴더가 생성되며, 이 폴더가 Cloudflare Pages에 배포됩니다.

## 참고 사항

- Push Notification은 HTTPS 환경에서만 동작합니다.
- 사용자가 알림을 차단한 경우 버튼을 다시 눌러도 서버 요청이 실패합니다.
- Supabase Edge Function의 실행 제한(현재 60초) 내에서 30초 지연을 수행합니다.
