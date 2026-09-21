# SPIKE 마스터 ~잠든 허브 왕~

중학생 **학과 체험(부스)** 용 LEGO Education SPIKE Prime 안내 RPG.
쯔꾸르(RPG Maker) 스타일 2D 도트 게임으로 **10분 안에** 주요 부품 이해 → 조립 → 블록코딩 → 해체까지 안내한다.

## 실행

```
dist/spike-prime-rpg.html   ← 더블클릭. 인터넷 불필요, 단일 파일.
```

## 개발

```bash
npm test      # 헤드리스 스모크 테스트 (전 씬 구동 + 스프라이트 전수 검사)
npm run build # dist/spike-prime-rpg.html 단일 파일 생성
npm run serve # http://localhost:5173 (index.dev.html)
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

90초 무입력 시 자동으로 타이틀로 돌아가고 진행 상태가 완전히 초기화된다 (반복 순환형 부스 대응).

## 구조

```
DESIGN.md              기획서 (확정 사항 · 교육 내용 · 개발 순서)
content/               ★ 텍스트 리소스 — 대사·UI를 JSON으로 직접 수정
  ui.ko.json             화면 텍스트 (버튼 · 라벨 · 가이드 문구 · 폰트)
  dialogue.ko.json       대사 (NPC가 말하는 것)
  README.md              수정 방법
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
- [x] S7 보스 · 엔딩 · 어트랙트 · 강사 단축키
- [ ] S8 폴리싱

자세한 기획은 [DESIGN.md](DESIGN.md) 참고 (v1.2 — 운영 매뉴얼·검수 체크리스트 포함).

> 조립과 코딩은 **게임이 판정하지 않는다.** 화면은 조립도와 정답 코드를 보여주기만 하고,
> 실물 조립의 확인은 강사와 학생이 맡는다. (DESIGN.md §7-0 · §8-1)
