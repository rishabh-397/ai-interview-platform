import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  const loginPayload = JSON.stringify({
    email: __ENV.LOAD_TEST_EMAIL || 'test@test.com',
    password: __ENV.LOAD_TEST_PASSWORD || 'TestPassword123',
  });
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(loginRes, {
    'login responded': (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);
}