const vapidPublicKey = '__VAPID_PUBLIC_KEY__';
const supabaseFunctionUrl = '__SUPABASE_FUNCTION_URL__';

const notifyButton = document.getElementById('notifyButton');
const statusLog = document.getElementById('statusLog');

const serviceWorkerReady = registerServiceWorker();

notifyButton.addEventListener('click', async () => {
  notifyButton.disabled = true;
  logStatus('알림을 준비하는 중입니다.');

  try {
    const permission = await ensureNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('알림 권한이 필요합니다. 브라우저 설정을 확인하세요.');
    }

    const registration = await serviceWorkerReady;
    if (!registration) {
      throw new Error('Service Worker 등록에 실패했습니다.');
    }

    const subscription = await subscribeToPush(registration);
    logStatus('서버에 알림을 요청합니다. 30초 뒤에 알림이 도착합니다.');

    await schedulePush(subscription);
    logStatus('요청 완료! 알림이 도착할 때까지 잠시 기다려 주세요.');
  } catch (error) {
    console.error(error);
    logStatus(error.message ?? '알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.');
    notifyButton.disabled = false;
    return;
  }

  setTimeout(() => {
    notifyButton.disabled = false;
  }, 32000);
});

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    logStatus('이 브라우저는 Service Worker를 지원하지 않습니다.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    logStatus('Service Worker가 준비되었습니다.');
    return registration;
  } catch (error) {
    console.error(error);
    logStatus('Service Worker 등록에 실패했습니다.');
    return null;
  }
}

async function ensureNotificationPermission() {
  if (!('Notification' in window)) {
    throw new Error('이 브라우저는 알림 기능을 지원하지 않습니다.');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

async function subscribeToPush(registration) {
  if (!('pushManager' in registration)) {
    throw new Error('이 브라우저는 Push API를 지원하지 않습니다.');
  }

  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    logStatus('이미 Push 구독이 존재합니다.');
    return existingSubscription;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(vapidPublicKey)
  });

  logStatus('Push 구독이 생성되었습니다.');
  return subscription;
}

async function schedulePush(subscription) {
  const message = {
    title: '30초가 지났어요 ⏰',
    body: '요청하신 지 30초가 지나 push 알림을 전송합니다.'
  };

  const response = await fetch(supabaseFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ subscription, message })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`서버 오류가 발생했습니다: ${response.status} ${text}`);
  }
}

function base64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function logStatus(message) {
  const item = document.createElement('li');
  const timestamp = new Date().toLocaleTimeString('ko-KR', {
    hour12: false
  });

  item.textContent = `[${timestamp}] ${message}`;
  statusLog.prepend(item);
}
