---
title: The margin — what you say to yourself while looking, kept beside what you were looking at
status: shipped
created: 2026-09-24
---

# 018 — The margin

## Why

The ask, in the reader's words: on every page and tab, be able to freely express — a voice
note or a line of text — to catch any latent thought about what is being engaged with, and
have it all feed a view where it can be seen later, timestamped, with which artifact it was
about and in relation to what. Narrativisation and self-authorship are the point; the
instruments only earn their place if the reader can talk back to them in their own words.

The garden already has nine views and each keeps its own files. What none of them keeps is
the aside — the thing said while looking, which is neither an entry nor a pathway nor a
decision, and which is lost if it has to wait for a form. So the aside gets a place of its
own at the edge of every view, and a view of its own to be read back in.

## What changes

- **A tab at the edge of every view.** A small paper tab reading _margin_ sits on the right
  edge of every page; the apostrophe key opens it too, from anywhere the reader is not
  typing. Behind it is a strip: a line saying where the note will be filed — _at the alarm ·
  about The open-plan job_ — a place to type, a _record_ button, and _keep_ (⌘↵). Escape
  closes it before any view hears the key. A deployed garden has no reader and shows no tab.
- **What is on the desk.** Each view puts its chosen thing down for the margin to see: the
  stone open in the reader or the catalogue's page, the centre of the flow, the belief on the
  course, the entry on the chronology, the pathway on the alarm, the way, the decision on the
  bearing, the thing in the distribution's tray. A note keeps it as `about` — kind, id and
  label — beside the view and the view's whole address at the time, so _go there_ later lands
  where the reader was.
- **A voice note** is recorded in the window with `MediaRecorder` and kept as a file beside
  the note, in whatever container the window produces (`.m4a` in the Mac app, `.webm` in a
  browser). The Mac app grants the microphone to the stand's own origin and nothing else, and
  the system asks the person once.
- **Written out, on this machine.** A spoken note can be _written out_ through the speech
  server already on the machine (`com.param.speech`, 127.0.0.1:8880, mlx-audio; model
  `parakeet`; `NIWA_SPEECH` and `NIWA_SPEECH_MODEL` override). The audio goes there and
  nowhere else. What comes back is kept under the note's own `## said` heading and can be
  corrected by hand. When no speech server answers, the button is not offered and the strip
  says so; spoken notes stay spoken.
- **A tenth view, `/margin`.** Every note newest first, grouped by day with the weekday and
  the count; each with its minute, the view it was made at, what it was about, _go there_,
  the words, and — if spoken — _play_ and _write it out_. Double-click the words to change
  them; _take it back_ asks once. Read by view, by what it was about, or by a word; the
  chips in the desk carry counts, and an about-chip on any note narrows to it. The filter is
  kept in the address (`?view=`, `?about=`), so a reading can be come back to.
- **The reading** says what was counted: _5 notes since 19 Sep: 2 spoken, 3 written · made
  on 4 days; the last 24 Sep at 12:00 · most at the alarm (2), then the garden (1) and the
  chronology (1) · most often about The open-plan job (2) · 1 spoken note not yet written
  out._ Never a grade.
- **Kept as files.** One markdown file per note at `niwa-vault/content/margin/<id>.md`, the
  id being the local moment (`20260924-215830-wly`), the voice note beside it under the same
  name. Frontmatter carries `at` (with the machine's offset), `view`, `url`, `about`,
  `audio`, `seconds`; the body is the words; `## said` is the transcript. `NIWA_MARGIN_DIR`
  moves the folder.
- **The Mac app** gets ⌘M, and the microphone usage string in its Info.plist.

## What it deliberately does not do

It does not tag, cluster, summarise or rank the notes, and it does not send the audio
anywhere but the loopback address. It does not transcribe on its own: writing out is asked
for, one note at a time, because the speech server is a model and its words are a proposal
the reader can correct. It does not put a note on the chronology or into the garden's graph;
a note that turns out to be an entry is the reader's to make one.

## Where

| File                          | Change                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `lib/margin.ts`, its test     | the note, its id and moment, the file form, filters, by-day, the tally, readings |
| `lib/margin-store.ts`         | one file per note, the audio beside it                                           |
| `lib/speech.ts`               | the speech server on this machine: is it up, write a note out                    |
| `content/specimen-margin.ts`  | Specimen A's asides, for a deployed garden                                       |
| `app/api/margin/route.ts`     | GET (`?head=1` for the strip), POST multipart, PATCH, DELETE; frozen under `NIWA_MODE` |
| `app/api/margin/audio/[name]` | a voice note by name; 404 when deployed                                          |
| `app/api/margin/say/route.ts` | POST asks the speech server; 404 when deployed                                   |
| `app/margin/page.tsx`         | the route                                                                        |
| `components/MarginStrip.tsx`  | the tab and the strip, mounted in `app/layout.tsx` under every view              |
| `components/Margin.tsx`       | the notes by day, the desk, the reading                                          |
| `components/desk.ts`          | what is on the desk: `putOnDesk`, `useOnDesk`                                    |
| nine view components          | each puts its chosen thing on the desk                                           |
| `components/ViewSwitch.tsx`   | tenth tab                                                                        |
| `scripts/NiwaApp.swift`, `build-app.sh` | ⌘M; the microphone granted to the stand's origin; the usage string    |
| `app/globals.css`             | the tab, the strip's arrival, the recording dot                                  |

## Out of scope

Transcribing as it is spoken. Notes from a phone. Sending a note on to another view as an
entry or a decision (open the view and make one). Any speech model not on this machine.

## Acceptance checks

Run on 2026-09-24.

```bash
pnpm test
# tsc clean · 121 pass · 0 fail (lib/margin.test.ts: 5)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/margin
# 200

curl -s '127.0.0.1:5050/api/margin?head=1'
# {"notes":[],"writable":true,"specimen":false,"speech":true,"dir":"/Users/p/personal/garden/niwa-vault/content/margin"}

curl -s -X POST 127.0.0.1:5050/api/margin -F 'audio=@aside.wav;type=audio/wav' -F view=/way \
  -F 'url=/way?id=a-test-way' -F seconds=5.2 -F 'about={"kind":"way","id":"a-test-way","label":"A test way"}'
# {"id":"20260924-215830-wly","at":"2026-09-24T21:58:30+02:00","view":"/way","url":"/way?id=a-test-way","about":{…},"text":"","audio":"20260924-215830-wly.wav","seconds":5.2,"said":null}

curl -s -o /dev/null -w '%{http_code} %{content_type}\n' 127.0.0.1:5050/api/margin/audio/20260924-215830-wly.wav
# 200 audio/wav

curl -s -X POST 127.0.0.1:5050/api/margin/say -H 'content-type: application/json' -d '{"id":"20260924-215830-wly"}'
# …"said":"On the line it is not one decision. It is three months of not renewing things."  (2.9 s, parakeet; the wav was the speech server's own voice saying that sentence)

curl -s -X DELETE '127.0.0.1:5050/api/margin?id=20260924-215830-wly'
# {"gone":true}
```

- [x] The tab shows on every view; the apostrophe opens the strip; Escape closes it
- [x] The strip names the view and what is on the desk; a typed note kept from the flow reads _at the flow · about Cognitive Sovereignty_
- [x] A spoken note is kept beside its file, plays back, and _write it out_ fills `## said`
- [x] `/margin` reads by day, by view, by about and by a word; the address keeps the filter
- [x] Sumi and 375px hold (scrollWidth 375; the strip sits 12..363 of 375)
- [x] Under `NIWA_MODE` the route serves the specimen's notes, refuses writes, and the tab is not shown (scratch copy on :5079: GET serves the specimen, `/margin` 200, POST/say/audio 404, `writable: false` so the strip renders nothing)
