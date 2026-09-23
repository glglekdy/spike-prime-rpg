# SPIKE 마스터 ~잠든 허브 왕~

중학생 **학과 체험(부스)** 용 LEGO Education SPIKE Prime 안내 RPG.
쯔꾸르(RPG Maker) 스타일 2D 도트 게임으로 **5분 안에** 주요 부품 이해 → 조립 → 블록코딩 → 해체까지 안내한다.

## 실행

```
dist/spike-prime-rpg.html   ← 더블클릭. 인터넷 불필요, 단일 파일.
```

## 웹 배포 (Vercel)

부스에서는 `dist/spike-prime-rpg.html` 을 더블클릭해 **오프라인으로** 쓴다.
웹 배포는 미리보기·공유용이다.

GitHub 저장소를 Vercel 에 Import 하면 `vercel.json` 을 읽어 그대로 돌아간다.
설정은 건드릴 것이 없다.

| 항목 | 값 |
|---|---|
| Framework Preset | Other (자동) |
| Build Command | `npm run build` |
| Output Directory | `dist` |

| 주소 | 내용 |
|---|---|
| `/` | 게임 (= `dist/index.html`) |
| `/spike-prime-rpg.html` | 오프라인 배포본 **다운로드** |

> 외부 요청이 하나도 없는 단일 파일이라 CDN·빌드 캐시 설정이 필요 없다.
> ⚠ 폰트가 HTML 에 임베드된 채 공개된다 — Mona 폰트의 재배포 조건을 확인할 것.

### ⚠ `.vercelignore` 를 지우지 말 것

`.vercelignore` 가 없으면 Vercel 이 `.gitignore` 를 대신 적용한다.
`.gitignore` 에는 `dist/index.html` 이 들어 있는데(빌드로 생기는 사본이라
저장소에는 안 올린다) 그게 바로 `/` 로 서빙될 파일이라, 배포 산출물에서
걸러지면서 빌드가 이렇게 깨진다.

```
Error: No Output Directory named "dist" found after the Build completed.
```

빌드 로그에 `→ /vercel/path0/dist/index.html` 이 찍혔는데도 위 오류가 난다면
`.vercelignore` 가 사라졌거나, Vercel 프로젝트 설정의 **Output Directory
override** 가 `dist` 가 아닌 값으로 켜져 있는지 확인한다.

## 개발

```bash
npm test      # 헤드리스 스모크 테스트 (전 씬 구동 + 스프라이트 전수 검사)
npm run build # dist/spike-prime-rpg.html 단일 파일 생성
npm run serve # http://localhost:5173 (index.dev.html)
              #   /scripts/overflow.html  문구 넘침 검사
              #   /scripts/fonttest.html  폰트 비교
              #   /scripts/perf.html      프레임·이동 속도 측정
```

## 조작

| 키 | 기능 |
|---|---|
| 방향키 / WASD | 이동 |
| Z · Space · Enter | 말 걸기 / 확인 |
| X · Esc | 도감 / 취소 |
| 마우스 | 선택 · 가이드 페이지 넘김 |
| `Q` / `E` | 가이드 이전 / 다음 페이지 |

### 강사 단축키

| 키 | 기능 |
|---|---|
| `Ctrl+R` | 즉시 초기화 (다음 학생) |
| `F1` | 조작법 |
| `F2` | 챕터 점프 |
| `F3` | 타이머 일시정지 |
| `F4` | 텍스트 JSON 불러오기 |
| `M` | 음소거 |
| `L` | 언어 전환 (타이틀 화면) |

90초 무입력 시 자동으로 타이틀로 돌아가고 진행 상태가 완전히 초기화된다 (반복 순환형 부스 대응).
조립 중에는 두 손이 실물에 가 있으므로 이 90초는 5분판에서도 줄이지 않았다.

## 플레이 타임 — 5분판

| 구간 | 예산 |
|---|---|
| 오프닝 | 0:10 |
| MAP1 허브 마을 — 카드 4장 + 관문 퀴즈 2문제 | 0:50 |
| MAP2 조립 공방 — 가이드 6장 + 확인 퀴즈 1문제 | 2:45 |
| MAP3 해체의 방 — 보스 4문제 = 해체 4단계 | 0:55 |
| 엔딩 | 0:20 |
| **합계** | **5:00** |

줄인 것은 **시간과 출제 수뿐이다.** 조립 6단계·해체 4단계·도감 15종·문제 풀 9문제는
그대로 있고, 그중 7문제를 낸다. 관문 퀴즈는 풀 3문제 중 2문제라 회차마다 달라진다.

시간을 정하는 값은 네 곳뿐이다.

| 파일 | 값 |
|---|---|
| `src/core/const.js` | `TOTAL_SECONDS` — 전체 제한시간(참고용 타이머) |
| `src/data/steps.js` | `GUIDE_PAGES[].budget` — 가이드 페이지별 예산 |
| `src/data/quiz.js` | `S.ASK` — 세트별 출제 수 |
| `src/core/state.js` | `hp` / `maxHp` — 체력 = 보스전 이전 출제 수 |

10분판으로 되돌리는 방법은 [DESIGN.md §4-6](DESIGN.md).
`npm test` 의 「5분 예산 검사」가 이 값들이 슬금슬금 늘어나는 것을 막는다.

## 구조

```
DESIGN.md              기획서 (확정 사항 · 교육 내용 · 개발 순서)
content/               ★ 텍스트 리소스 — 코드 수정 없이 JSON으로 고친다
  ui.{ko,en}.json        화면 텍스트 (버튼 · 라벨 · 가이드 문구 · 폰트)
  dialogue.{ko,en}.json  대사 (NPC · 오프닝 내레이션)
  parts.{ko,en}.json     부품 도감 15종
  quiz.{ko,en}.json      퀴즈 9문제 + 해설
  README.md              수정 방법 · 언어 추가
src/font/subset/       Mona 비트맵 폰트 서브셋 (배포본에 임베드)
index.dev.html         개발용 (개별 스크립트 로드)
build.mjs              단일 HTML 병합 빌드
scripts/smoke.mjs      헤드리스 테스트
src/core/              엔진 · 렌더러 · 도트 폰트 · 오디오 · 스프라이트
src/data/              부품 도감 · 퀴즈 · 맵 · 대사 · BGM
src/scenes/            타이틀 · 필드 · 전투 · 카드 · 도감 · 엔딩
src/ui/                메시지 윈도우
```

### 텍스트 수정

게임의 모든 글자는 `content/` 의 JSON 두 개에 있다. 코드를 건드릴 필요가 없다.
실행 중 **JSON 파일을 화면에 드래그&드롭**하거나 **F4** 로 불러오면 즉시 반영된다
(`file://` 배포본에서도 된다). 영구 반영은 `npm test && npm run build`.
자세한 건 [content/README.md](content/README.md).

외부 이미지·사운드 파일이 **하나도 없다.** 도트 그래픽은 코드로 생성하고,
음악은 WebAudio로 합성한다.
한글 도트 글꼴만 Mona 비트맵 폰트 서브셋(228KB)을 배포본에 임베드한다.

## 진행 상황

- [x] S1 코어 (렌더러 · 도트 한글 · 오디오 · 씬 매니저)
- [x] S2 필드 (타일맵 · 이동 · NPC · 메시지 윈도우)
- [x] S3 데이터 (부품 도감 15종 · 퀴즈 · 맵 3개 · 대사)
- [x] S4 퀴즈 배틀
- [x] S5 조립 가이드 패널 (좌우 분할 · 조립도 6장 · 페이지 넘김)
- [x] S6 코드 가이드 (주문서 카드 · SPIKE 앱 대응표)
- [x] 텍스트 JSON 분리 (대사 / UI) — [content/README.md](content/README.md)
- [x] Mona 비트맵 폰트 (소형 글자 깨짐 해결) — [src/font/README.md](src/font/README.md)
- [x] 한국어 / English 전환 (타이틀 화면 버튼 또는 `L`)
- [x] S7 보스 · 엔딩 · 어트랙트 · 강사 단축키
- [ ] S8 폴리싱

자세한 기획은 [DESIGN.md](DESIGN.md) 참고 (v1.3 — 5분판 재배분).

> 조립과 코딩은 **게임이 판정하지 않는다.** 화면은 조립도와 정답 코드를 보여주기만 하고,
> 실물 조립의 확인은 강사와 학생이 맡는다. (DESIGN.md §7-0 · §8-1)
