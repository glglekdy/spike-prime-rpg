/* ============================================================
 *  SPIKE Prime RPG — 전역 상수
 *  논리 해상도 384x288 (4:3), 타일 16px, 정수배 스케일
 * ============================================================ */
var SPIKE = window.SPIKE || (window.SPIKE = {});

SPIKE.W = 384;   // 논리 가로
SPIKE.H = 288;   // 논리 세로
SPIKE.TILE = 16; // 타일 한 변

/* 전체 체험 제한시간 (초). 참고용 타이머 — 강제 진행은 하지 않는다.
 *
 *  5분판 타임라인 (DESIGN.md §4-1). 10분판에서 전 구간을 절반으로 줄였다.
 *    0:00~0:10  오프닝
 *    0:10~1:00  MAP1 허브 마을 (카드 + 관문 퀴즈 2문제)
 *    1:00~3:45  MAP2 조립 공방 (가이드 6장 + 확인 퀴즈 1문제)
 *    3:45~4:40  MAP3 해체의 방 (보스 4문제 = 해체 4단계)
 *    4:40~5:00  엔딩
 *
 *  ⚠ 이 값만 바꾸면 10분판으로 못 돌아간다. 같이 봐야 하는 곳:
 *    data/steps.js  S.GUIDE_PAGES 의 budget (가이드 6장 합계 150초)
 *    data/quiz.js   S.ASK (세트별 출제 수)
 *    core/state.js  hp/maxHp (= 비보스 문제 수)
 */
SPIKE.TOTAL_SECONDS = 300;

/* 쯔꾸르풍 팔레트 */
SPIKE.C = {
  black:    '#000000',
  white:    '#ffffff',
  shadow:   '#00000099',

  // 메시지 윈도우 (RPG Maker 2000 기본 스킨 계열)
  winTop:   '#2b4fa8',
  winBot:   '#0b1b50',
  winEdge:  '#ffffff',
  winEdge2: '#6d8fe0',

  // 텍스트
  text:     '#ffffff',
  textDim:  '#9fb4d8',
  textHi:   '#ffe066',
  textOk:   '#7dff9b',
  textNg:   '#ff7d7d',

  // 필드
  grass:    '#4a8b3a',
  grass2:   '#5c9e45',
  path:     '#c9a86a',
  path2:    '#b8955a',
  wall:     '#6b6b7a',
  wall2:    '#54545f',
  floor:    '#8a7355',
  floor2:   '#7a6449',
  water:    '#3a6bb5',

  // SPIKE 블록 카테고리 색 (실제 앱과 동일 계열)
  blkEvent: '#ffbf00', // 이벤트 노랑
  blkMotor: '#4ecdc4', // 모터 민트
  blkMove:  '#4a90e2', // 움직임 파랑
  blkLight: '#9b59b6', // 조명 보라
  blkSound: '#ff6b9d', // 소리 분홍
  blkCtrl:  '#ff9f43', // 제어 주황
  blkSense: '#54c7ec', // 센서 하늘
  blkOp:    '#5cb85c', // 연산 초록
};

/* 블록 카테고리 메타 (도감/코딩 퍼즐 공용) */
SPIKE.BLOCK_CATS = [
  { id: 'event', name: '이벤트', spell: '시동 주문', color: SPIKE.C.blkEvent },
  { id: 'motor', name: '모터',   spell: '힘의 주문', color: SPIKE.C.blkMotor },
  { id: 'move',  name: '움직임', spell: '이동 주문', color: SPIKE.C.blkMove  },
  { id: 'light', name: '조명',   spell: '빛의 주문', color: SPIKE.C.blkLight },
  { id: 'sound', name: '소리',   spell: '울림 주문', color: SPIKE.C.blkSound },
  { id: 'ctrl',  name: '제어',   spell: '시간의 주문', color: SPIKE.C.blkCtrl },
  { id: 'sense', name: '센서',   spell: '감지 주문', color: SPIKE.C.blkSense },
  { id: 'op',    name: '연산',   spell: '계산 주문', color: SPIKE.C.blkOp    },
];
