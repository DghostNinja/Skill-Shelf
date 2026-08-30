---
name: slide-maker
description: Use when the user asks to make slides, a slide deck, a presentation, or training/teaching materials as HTML slides and PPTX (or just one of the two). Produces human-readable, plain-tone decks with interactive quizzes in the HTML and a matching PPTX generated with python-pptx, keeping presenter prep out of the deck. Trigger words: slides, deck, presentation, PPTX, training deck, class deck.
metadata:
  category: Slides
  version: 1.0.0
  date: 2026-08-30
  tags: slides, presentation, pptx, html, deck, training
  related: workflow
---

# Slide Maker

Make slide decks that read like a person wrote them, not a marketing robot.
Always produce BOTH an interactive HTML deck and a matching PPTX (16:9),
using the small generator script this skill bundles.

## Output contract

Deliver these files next to each other:

| File | What it is | Rules |
|---|---|---|
| `NAME.html` | The presentable deck | Open in a browser, arrow keys + buttons navigate, quizzes clickable, Ctrl+P prints a clean PDF. **Never contain presenter prep text.** |
| `make_pptx.py` | Generator script | python-pptx, 16:9 (13.333 x 7.5 in). Run it whenever deck content changes. |
| `NAME.pptx` | Generated PowerPoint | Same slides as the HTML. Quizzes are static: correct answer highlighted. |
| `presenter-prep.html` (optional) | Presenter-only prep | Run-of-show, per-slide "Say" scripts, demo steps. **Never send this to the audience.** |

A self-contained starter lives in this skill folder:

- `html_skeleton.html`  the deck skeleton (CSS + JS + example slides)
- `make_pptx_template.py`  the PPTX generator to copy and fill in

Copy both into the working folder, rename, and extend. Do not invent a parallel
design system; keep the dark theme, cards, chips, quizzes, and footer.

## Tone rules (the "human readable" part)

These are hard rules, not style hints:

- Write like a good colleague explaining over coffee. Plain words, short
  sentences, active voice.
- NO em-dashes (`—`). Use periods and commas instead. Same for the generated
  PPTX and any code comments in a deck you write.
- No AI-flavored phrasing or buzzwords: no "unlock", "elevate", "seamless",
  "leverage", "delve", "robust", "seamlessly integrate", "in today's fast-paced
  world", "supercharge". Delete them.
- Small steps. One idea per slide, one idea per card.
- For a noob audience, ground abstract ideas in everyday analogies (fast
  intern, manager/worker, USB plug). For a technical audience, skip the stories,
  they cost trust.
- Quizzes: exactly 3 options, one clearly correct, plain wording. No trick
  questions.
- Numbered steps: keep each step to a headline plus one short clarifying line.

## Workflow

1. Find the audience and length before writing anything. If the user did not
   say: ask. Do not start sliding until you know who is in the room.
2. Sketch the outline as a numbered slide list (one line per slide). Show it
   to the user, agree, then build. Put a quiz and a "questions so far" breather
   slide after every 4-7 content slides.
3. Build the HTML deck from `html_skeleton.html`, keeping the slide order
   exactly as agreed. Quizzes use `data-ok="true/false"` buttons plus a `.fb`
   feedback line (the skeleton wires them up).
4. Copy `make_pptx_template.py`, adapt the slide list so EVERY slide in the
   HTML exists in the PPTX in the same order, with the same copy. Then run
   `python3 make_pptx.py`.
5. For each quiz in the PPTX, mark the correct option green and show a
   "Correct: ..." note (function `quiz()` in the template already does this).
6. Run the verification checklist below. Fix, regenerate, re-verify.

## Verification checklist

```bash
# slide counts must match between deck and generator
grep -c 'class="slide' NAME.html                # count of slides in HTML
grep -c "slide_" make_pptx.py                   # count in the generator
# human-readability gate: the deck must contain no em-dashes
grep -n '—' NAME.html && echo "em-dashes found" || echo "clean"
# regenerate and sanity-render if LibreOffice is available
python3 make_pptx.py
soffice --headless --convert-to pdf NAME.pptx --outdir /tmp && pdfinfo /tmp/NAME.pdf | grep Pages
# balanced tags before shipping
python3 - <<'PY'
import re
h = open('NAME.html', encoding='utf-8').read()
bad = [t for t in ['section','div','button','pre'] if h.count('<'+t) != h.count('</'+t+'>')]
print('unbalanced:', bad or 'none')
PY
```

If the deck changes later: regenerate the PPTX, keep the slide count in sync,
and never let presenter prep text leak into the deck file.

## Reference implementation

The working reference is the "AI Coding Agents" class deck. Copy its tone and
structure for anything new: plain copy, an analogy anchor per section, quizzes
every few slides, Q&A breathers, and a separate `presenter-prep.html` that the
presenter never shows.

## Don'ts

- Do not add demo videos or animation that the PPTX cannot mirror.
- Do not stuff a slide over ~60 words. If it does not fit, split the slide.
- Do not hide the correct answer in PPTX quizzes. Static and honest.
- Do not put speaker notes, timings, or internal cues inside the deck file.
- Do not over-engineer: no build pipeline, no framework, no dependencies
  beyond python-pptx for the generator and plain HTML for the deck.