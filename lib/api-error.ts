export function apiError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
export function apiSuccess(data: unknown) {
  return Response.json(data);
}

/** 환경변수가 없으면 apiError(500)을 반환하고, 있으면 값을 돌려줌 */
export function requireEnv(key: string): string | Response {
  const value = process.env[key];
  if (!value) {
    console.error(`[VELA] 필수 환경변수 누락: ${key}`);
    return apiError(`서버 설정 오류 (${key} 누락)`, 500);
  }
  return value;
}

/**
 * AI 프롬프트에 대한 기본 injection 방어
 * 사용자 입력을 AI에 전달하기 전에 위험 패턴을 제거
 */
export function sanitizeUserInput(input: string, maxLength = 4000): string {
  return input
    .slice(0, maxLength)
    .replace(/ignore\s+(previous|above|all|prior|system)\s+instructions?/gi, "")
    .replace(/disregard\s+(previous|above|all|prior|system)\s+instructions?/gi, "")
    .replace(/you\s+are\s+now/gi, "")
    .replace(/act\s+as/gi, "")
    .replace(/new\s+instructions?:/gi, "")
    .replace(/system\s*prompt:/gi, "")
    .replace(/\[INST\]/gi, "")
    .replace(/<\|im_start\|>/gi, "")
    .replace(/<\|im_end\|>/gi, "");
}
