# OW Perk API

Overlooker의 실제 경기 표본을 바탕으로 영웅별 특전 선택률을 알려주는 한국어 Discord 봇 겸 HTTP API 서버입니다.

## 주요 기능

- `/특전 영웅:아나` — 모든 모드 통합 선택률(기본값)
- `/특전 영웅:아나 모드:빠른 대전` — 빠른 대전 선택률
- `/특전 영웅:아나 모드:경쟁전` — 경쟁전 선택률
- 한국어·영문 영웅 이름 및 자동완성 지원
- 소형/주요 특전별 1순위 강조, 선택률·선택 횟수·표본 수 표시
- 100게임 미만 소표본 경고
- 모든 응답에 Overlooker 출처와 해외 사용자 편향 안내 표시
- 5분 메모리 캐시, 업스트림 타임아웃/재시도, API 요청 제한

> 선택률은 승률이나 반드시 골라야 할 정답을 의미하지 않습니다. Overlooker 이용자는 해외 비중이 높아 한국 서버의 실제 선택 경향과 다를 수 있습니다.

## 로컬 실행

Node.js 20 이상이 필요합니다.

```bash
npm install
cp .env.example .env
# .env 값을 설정한 뒤
npm start
```

Node.js는 `.env`를 자동으로 읽지 않으므로 로컬에서는 셸에서 환경변수를 내보내거나 `node --env-file=.env src/index.js`로 실행하세요. `DISCORD_TOKEN` 없이 실행하면 HTTP API만 시작합니다.

### Discord 환경변수

| 이름 | 필수 | 설명 |
|---|---:|---|
| `DISCORD_TOKEN` | 봇 사용 시 | Discord Developer Portal의 봇 토큰 |
| `CLIENT_ID` | 권장 | Application ID. 시작할 때 명령어를 자동 등록합니다. |
| `GUILD_ID` | 선택 | 개발 서버 ID. 설정 시 명령어가 즉시 반영되며, 미설정 시 전역 등록됩니다. |
| `PORT` | 선택 | HTTP 포트, 기본 `3000` |
| `CACHE_TTL_MS` | 선택 | 통계 캐시 시간, 기본 5분 |

Discord Developer Portal에서 봇을 초대할 때 `bot`, `applications.commands` 스코프를 선택하세요. 별도의 Message Content Intent는 필요하지 않습니다.

## HTTP API

```text
GET /health
GET /api/heroes?mode=all
GET /api/perks/아나?mode=all
GET /api/perks/ana?mode=quickplay
GET /api/perks/ana?mode=competitive
```

`mode`는 `all`(기본), `quickplay`, `competitive` 중 하나입니다. 응답의 `source`와 `notice` 필드는 재사용 시에도 삭제하지 않는 것을 권장합니다.

## DisHost 배포

저장소의 `dishost.yml`을 인식하므로 GitHub 저장소를 연결하고 다음 환경변수만 대시보드에서 입력하면 됩니다.

1. `DISCORD_TOKEN`
2. `CLIENT_ID`
3. 개발 서버에 먼저 설치한다면 `GUILD_ID`

`main` 브랜치 Push 자동 배포가 설정되어 있습니다. 토큰이나 `.env` 파일은 저장소에 커밋하지 마세요.

## 데이터 및 출처

- 통계: [Overlooker](https://stats.overlooker.app)
- 영웅 초상화/메타데이터: [overlooker-dev/ow-data](https://github.com/overlooker-dev/ow-data)

Overwatch 및 관련 명칭과 이미지는 Blizzard Entertainment의 상표·자산입니다.
