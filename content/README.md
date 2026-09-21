# 텍스트 커스터마이징

게임에 나오는 **모든 글자**는 이 폴더의 JSON 두 개에서 온다. 코드를 건드릴 필요가 없다.

| 파일 | 담당 | 예시 |
|---|---|---|
| `ui.ko.json` | **화면 텍스트** — 버튼·라벨·가이드 문구·엔딩 항목·폰트 설정 | `다음 ▶`, `부품 찾기`, `정답률` |
| `dialogue.ko.json` | **대사** — NPC가 말하는 것 전부 | `잘 왔구나, 견습 메카닉.` |

> 나누는 기준: **사람이 입으로 말하면 dialogue, 화면에 붙어 있으면 ui.**

---

## 고치는 법 — 두 가지

### 1. 부스에서 즉석으로 (재빌드 없음) ⭐

게임 실행 중에 **JSON 파일을 화면에 드래그&드롭**하면 즉시 적용된다.
또는 **F4** → 파일 선택.

- `file://` 로 연 배포본에서도 된다
- 파일 이름에 `ui` 가 들어 있으면 UI로, 아니면 대사로 인식한다
  (`meta.kind` 를 `"ui"` / `"dialogue"` 로 적어두면 이름과 무관하게 정확히 들어간다)
- 새로고침하면 원래대로 돌아온다 — 영구 반영은 아래 2번

### 2. 영구 반영 (배포본에 굽기)

```bash
# 1) content/ui.ko.json 또는 content/dialogue.ko.json 을 편집
# 2) 검사 — 오타난 키, 깨진 JSON을 잡아준다
npm test
# 3) 단일 HTML 재생성
npm run build
```

`npm run build` 가 JSON을 `dist/spike-prime-rpg.html` 안에 통째로 넣는다.
학교 PC는 인터넷도 별도 파일도 필요 없다.

---

## 키 규칙

키는 **영어 점 표기법**이고, 코드가 이 이름으로 찾아간다.

```
ui.ko.json          →  S.T('common.next')        →  "다음 ▶"
dialogue.ko.json    →  S.D('village.gran.repeat')
```

값은 세 가지 형태를 쓴다.

```jsonc
"repeat": "한 칸짜리 대사",
"intro":  ["첫 칸", "둘째 칸"],        // 배열 = Z 로 넘기는 여러 칸
"appear": "{name}이(가) 나타났다!"      // {중괄호} = 치환 변수
```

`\n` 은 대사 안에서 줄바꿈이다. 메시지창은 2줄이 안전하다.

### ⚠ 키 이름은 바꾸지 말 것

값만 고친다. 키를 바꾸거나 지우면 그 자리에 `[village.gran.repeat]` 처럼
**키 이름이 그대로 화면에 뜬다.** `npm test` 가 이걸 잡아준다:

```
FAIL 텍스트 키 전수 검사
     JSON 에 없는 키 1개:
     guide.find.warn
```

---

## 자주 고칠 만한 곳

| 하고 싶은 것 | 어디 |
|---|---|
| 조립 단계 설명 문구 | `ui.ko.json` → `guide.<단계>.body` / `.warn` |
| 장인이 재촉하는 말 | `dialogue.ko.json` → `workshop.late.*` |
| 주문서 블록 문장 | `ui.ko.json` → `code.blocks.*` |
| SPIKE 앱 서랍 안내 | `ui.ko.json` → `code.findIt` (항목 개수도 자유) |
| NPC 이름 | `dialogue.ko.json` → `names.*` |
| 랭크별 칭찬 멘트 | `ui.ko.json` → `ending.ranks.*` |

조립 단계 키는 `find` · `motor` · `beam` · `flag` · `cable` · `code` 여섯이며,
순서와 조립도는 `src/data/steps.js` 가 정한다 (텍스트는 전부 JSON).

---

## 폰트

`ui.ko.json` 의 `font` 블록으로 바꾼다.

```jsonc
"font": {
  "family": "\"내가받은픽셀폰트\", DungGeunMo, Dotum, monospace",
  "threshold": 96,      // 알파 이진화 기준 (낮을수록 획이 두꺼워짐)
  "binarize": true      // 진짜 픽셀 폰트를 넣었다면 false 권장
}
```

시스템 폰트를 이진화하는 현재 방식은 **10px 이하에서 획이 뭉개진다**
(예: `0.3초` → `D.5초`). 제대로 된 픽셀 폰트를 설치하거나 임베드한 뒤
`binarize: false` 로 끄는 것이 정석이다.

`scripts/fonttest.html` 을 `npm run serve` 로 열면
크기 × 임계값 조합을 한눈에 비교할 수 있다.

---

## 다른 언어 만들기

```bash
cp content/ui.ko.json content/ui.en.json
```

번역한 뒤 F4로 불러오면 바로 확인된다.
기본값으로 삼으려면 `index.dev.html` 의 `data-src` 를 새 파일로 바꾸고 `npm run build`.
