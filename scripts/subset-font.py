#!/usr/bin/env python3
"""
scripts/subset-font.py — Mona 원본 TTF 를 게임용 woff2 로 줄인다.

원본 TTF 는 합쳐서 30MB 라 단일 HTML 배포본에 넣을 수 없다.
여기서 필요한 글자만 남기고 woff2 로 압축하면 둘이 합쳐 230KB 정도가 된다.

글자 범위는 "게임이 지금 쓰는 글자"가 아니라 **한글 음절 전체**로 잡는다.
content/*.json 을 수정해서 새 문구를 넣는 것이 이 프로젝트의 기능이므로,
쓰는 글자만 넣으면 문구를 고치는 순간 두부(□)가 뜬다.

    pip install fonttools brotli
    python scripts/subset-font.py

결과: src/font/subset/Mona10.woff2, Mona12.woff2  (git 에 커밋된다)
원본 TTF 는 src/font/*.ttf 에 두며 git 에서는 제외한다 (.gitignore).
"""
import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src', 'font')
OUT = os.path.join(SRC, 'subset')
FAMILIES = ['Mona10', 'Mona12']          # 10px용, 12px용 (font.js 의 크기 사다리 참조)


def charset():
    """한글 음절 전체 + ASCII + 한글 자모 + 게임이 쓰는 기호"""
    chars = []
    chars += [chr(c) for c in range(0xAC00, 0xD7A4)]   # 가 ~ 힣 (11,172자)
    chars += [chr(c) for c in range(0x20, 0x7F)]       # ASCII
    chars += [chr(c) for c in range(0x3131, 0x3164)]   # ㄱ ~ ㅣ
    chars += list('◆◀▶▲▼■□●○★☆☑☐✓✗←→↑↓↻↺⏱⚠×·—–…「」『』【】♪※℃')
    return ''.join(chars)


def main():
    os.makedirs(OUT, exist_ok=True)
    txt = os.path.join(OUT, '.charset.txt')
    cs = charset()
    io.open(txt, 'w', encoding='utf-8').write(cs)

    total = 0
    for fam in FAMILIES:
        src = os.path.join(SRC, fam + '.ttf')
        if not os.path.exists(src):
            print('원본 없음:', src)
            print('  → Mona 원본 TTF 를 src/font/ 에 두고 다시 실행하세요.')
            return 1
        dst = os.path.join(OUT, fam + '.woff2')
        r = subprocess.run([
            sys.executable, '-m', 'fontTools.subset', src,
            '--text-file=' + txt,
            '--flavor=woff2',
            '--output-file=' + dst,
            '--layout-features=',      # GSUB/GPOS 불필요 (고정폭 비트맵)
            '--no-hinting',            # 정수배 스케일만 쓰므로 힌팅 무의미
            '--desubroutinize',
        ], capture_output=True, text=True)
        if r.returncode:
            print(fam, '실패:', r.stderr[-500:])
            return 1
        kb = os.path.getsize(dst) / 1024
        total += kb
        print('%-8s %6d자 → %7.1f KB  %s' % (fam, len(cs), kb, dst))

    os.remove(txt)
    print('합계 %.1f KB' % total)
    return 0


if __name__ == '__main__':
    sys.exit(main())
