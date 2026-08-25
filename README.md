# OW Perk API

## 주요 기능

- `/특전 아나` — 모든 모드 통합 선택률(기본값)
- `/특전 아나 빠른대전` — 빠른 대전 선택률
- `/특전 아나 경쟁전` — 경쟁전 선택률
- 지정한 특전 전용 채널에서는 `아나`, `아나 빠대`, `아나 경쟁`처럼 바로 검색
- `아나 상성` — 검수된 주요 카운터·피카운터·시너지·경쟁 픽 조회
- `아나 로드호그 상성` — 두 영웅의 방향별 기술 상호작용과 조건 조회
- 전체 영웅 관계 지원, 기존 `/관계 아나`와 `/상성 아나 로드호그`도 호환
- `GET /api/relations/:hero` 및 `GET /api/relations/:hero/:target` 관계 API
- 한국어·영문 영웅 이름 지원
- 소형/주요 특전별 1순위 강조, 선택률·선택 횟수·표본 수 표시
- 100게임 미만 소표본 경고
- 모든 응답에 Overlooker 출처와 해외 사용자 편향 안내 표시
- 한국시간 매일 자정 갱신 캐시, 업스트림 타임아웃/재시도, API 요청 제한

## 출처

- 통계: [Overlooker](https://stats.overlooker.app)
- 관계 근거: [Overwatch 공식 영웅 페이지](https://overwatch.blizzard.com/ko-kr/heroes/)
- 미검수 관계 후보: [OverPicker API](https://api.overpicker.com/) — 로컬 검토용이며 사용자 응답에 자동 노출하지 않음
- 한국어 특전명: [Overwatch 공식 영웅 페이지](https://overwatch.blizzard.com/ko-kr/heroes/)
- 영웅 초상화/메타데이터: [overlooker-dev/ow-data](https://github.com/overlooker-dev/ow-data)
