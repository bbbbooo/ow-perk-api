# 영웅 관계 데이터 운영 가이드

## 데이터 성격

관계 데이터는 승률이나 정답이 아니라 기술 상호작용과 역할 조건을 설명하는 검수 자료다. `strength`는 해당 상호작용의 영향력, `confidence`는 기록된 근거의 확실성을 나타내며 둘을 서로 바꾸어 해석하지 않는다.

사용자에게는 기본적으로 `verified` 관계만 노출한다. `candidate`와 `needs_review`는 `RELATIONS_ADMIN_TOKEN`과 `x-relations-admin-token` 헤더가 일치하는 관리 요청에서만 조회할 수 있다.

## 파일 구조

- `src/data/relations/relations.json`: 검수 관계와 후보 상태
- `src/data/relations/roster-relations.json`: 전체 영웅 커버리지 관계
- `src/data/relations/relation-sources.json`: 출처 URL, 확인일, 데이터 버전
- `src/relations.js`: 스키마 검증과 결정론적 조회
- `scripts/validate-relations.js`: CI·로컬 검증 명령
- `scripts/build-roster-relations.js`: 전체 영웅 관계 JSON 생성
- `scripts/sync-overpicker-relations.js`: 외부 후보 동기화
- `work/relation-sync/`: 원본 스냅샷과 정규화 후보를 저장하는 Git 제외 작업 폴더

## 관계 추가 체크리스트

1. `source_hero`와 `target_hero`는 `src/heroes.js`에 존재하는 slug를 사용한다.
2. 자기 자신과의 관계를 만들지 않는다.
3. `counter`는 실제 방향대로 저장한다. `synergy`와 `competition`은 slug 사전순으로 한 번만 저장한다.
4. 기술 또는 플레이 특성으로 설명 가능한 한국어 이유를 최소 한 개 기록한다.
5. `strength`와 `confidence`를 각각 0~1로 기록한다.
6. 신뢰도 0.8 이상이면 서로 보완하는 근거를 최소 두 개 기록한다.
7. 맵, 역할 고정, 거리, 재사용 대기시간처럼 결과가 달라지는 조건을 `contexts`와 `caveats_ko`에 기록한다.
8. 출처 URL과 `checked_at`을 `relation-sources.json` 및 관계의 `evidence`에 기록한다.
9. 패치 영향을 받으면 즉시 `needs_review`로 바꾸고 재검수 전까지 일반 응답에서 숨긴다.
10. `npm run validate:relations`와 `npm test`를 모두 통과시킨다.

## OverPicker 후보 동기화

```bash
npm run sync:relations:candidates
```

동기화 스크립트는 `/hero-counters`와 `/hero-synergies` 원본, 수집 시각, SHA-256 해시를 `work/relation-sync/`에 저장한다. 영웅 이름 변환에 실패하면 작업 전체가 실패한다. 점수 0은 원본에는 남지만 정규화 후보에서는 제외한다.

동일한 원본으로 두 번 실행하면 두 번째 diff는 `added=0 removed=0 changed=0`이어야 한다. 후보 점수는 검수 JSON을 자동으로 수정하지 않는다. OverPicker의 원본 재배포 및 상업적 이용 조건이 명확히 확인되기 전에는 작업 폴더의 원본을 커밋하거나 배포하지 않는다.

## API

```text
GET /api/relations/:hero
GET /api/relations/:hero?type=counter|synergy|competition
GET /api/relations/:hero/:target
```

관리 후보 조회:

```text
GET /api/relations/:hero?include_candidates=true
x-relations-admin-token: <RELATIONS_ADMIN_TOKEN>
```

관리 토큰이 없거나 일치하지 않으면 `403`을 반환한다. 알 수 없는 영웅은 `404`, 잘못된 `type`은 `400`을 반환한다.

## 패치 검수 절차

1. 공식 패치 노트에서 변경된 영웅과 기술을 찾는다.
2. 해당 `source_ability` 또는 `target_trait`를 참조하는 관계를 `needs_review`로 변경한다.
3. 패치 이후 공식 기술 설명과 실제 상호작용을 다시 확인한다.
4. 이유·조건·출처·확인일을 갱신하고 `verified`로 복원한다.
5. 데이터 버전과 `last_reviewed_at`을 올린다.

현재 단계에서는 패치 영향을 자동 추론하거나 LLM으로 관계를 생성하지 않는다.

## Discord 명령

```text
아나 상성
아나 로드호그 상성
```

영웅명 뒤에 `상성`을 붙이는 형식이 기본이다. 기존 `/관계 아나`와 `/상성 아나 로드호그`도 이전 사용자와의 호환을 위해 유지한다. 관계 데이터 검증기는 `src/heroes.js`에 등록된 모든 영웅이 최소 하나 이상의 `verified` 관계에 포함되는지 검사한다.
