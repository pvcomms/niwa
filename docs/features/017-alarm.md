---
title: The alarm — will this pathway set off your fight or flight?
status: shipped
created: 2026-09-24
---

# 017 — The alarm

## Why

The standalone sandbox (`pvcomms/nervous-system-sandbox`, "Fight or Flight — an autonomic
nervous system you can poke") is a live toy of the threat circuit: a cue hits the thalamus and
splits into the low road to the amygdala and the high road to the prefrontal cortex; the PFC
and the vagus are the brakes; the amygdala drives the sympathetic surge into the body. Dials
for sleep debt, chronic stress, caffeine and vagal tone make the whole thing twitchier and
slower to recover. It teaches the mechanism well and knows nothing about the person poking
it: the threat is a generic dial, the brakes are "breathe" and "cold plunge".

The ask: for a person to tell whether a specific pathway — a decision, a plan, a trajectory —
will activate their known defence and coping mechanisms and put their nervous system on the
hypervigilant road rather than the calm one. The instrument cannot know that. The person can
name it: what they know sets their alarm off and how hard, what fires on its own when it
does, what brings it down and how fast, and how loaded they are today. Marked against those,
a pathway draws a line to one road or the other by the marks alone, and the toy body can be
poked with the person's own triggers and braked with their own brakes. It holds and draws
the reader's knowledge of themselves; it never supplies it.

## What changes

- **An eighth view, `/alarm`.** The sandbox's circuit, hand-drawn: sensory cue → thalamus →
  amygdala (low road, fast) and → prefrontal cortex (high road, slow); the PFC brake and the
  vagus, dashed; the surge through the hypothalamus to a heart that beats at the body's rate.
  The nodes light with the toy's state; the PFC greys and says _offline_ in a hijack. To the
  right, two exits — _hypervigilance_ and _calm_ — and the pathway's line between them.
- **The circuit is the reader's**, kept as `niwa-vault/content/alarm/circuit.json`:
  _triggers_ (label, how hard it hits 1–3, the first sign in the body, the defences it
  usually pulls), _defences_ (label, its shape: fight, flight, freeze or fawn; what it
  costs), _brakes_ (label, how fast it works: seconds, hours, days), and the _load_ — the
  sandbox's four dials as _how you are today_, stamped with the day they were set. All
  editable on the desk; nothing is seeded from memory.
- **A pathway** is one markdown file at `niwa-vault/content/alarm/pathways/<slug>.md`: the
  title, the pathway in words, which triggers it touches and how much of each is on it
  (1–3), which brakes are within reach on it, which defences the reader expects to fire,
  bound stones, the note, the day it was asked — and, after the fact, how it went (_calm_,
  _vigilant_, _mixed_) and when the reader said so. _Its alarm_ from the reader and the
  catalogue page asks a pathway bound to that stone.
- **The line.** Each touched trigger bends it up by its charge times the dose; each brake
  within reach bends it down by its reach, scaled by the brake's room today (the sandbox's
  PFC ceiling: sleep debt and stress lower it). The marks are drawn in order as beads on the
  line — hover one and the card says what it is, its first sign, what it usually pulls. The
  end lands on hypervigilance, calm, or between, and the reading says which _as marked_. It
  is the reader's marks added up and nothing else.
- **Poke it.** Space, or the chip. The toy body starts at rest as loaded as the reader said,
  and each touched trigger arrives as a cue in turn — intensity from charge and dose — down
  the low road with the high road behind. The reader's own brakes within reach are the
  buttons; pressing one applies the sandbox's slow breath or plunge by its reach. The
  banner names the state (_Calm_, _Rest & digest_, _Alert_, _Fight or flight_, _Amygdala
  hijack_, _Freeze / shutdown_) in the sandbox's words; eight gauges show the body
  downstream (heart rate, HRV, breathing, skin sweat, pupil, blood pressure, muscle tension,
  digestion); a balance marker runs parasympathetic to sympathetic; the timeline draws the
  last forty seconds with the presses marked. When it quiets, a sentence says what the run
  reached and when, and that it was a toy body.
- **The reading.** Facts, none a verdict: _touches 3 of your 4 known triggers: Being watched
  while working (hits hard), Raised voices and A room I can't leave · you said Being watched
  while working usually pulls Over-preparing and Going quiet · you expect Over-preparing and
  Going quiet to fire · 2 of your 5 brakes are within reach: A long exhale and A walk — the
  fastest works in seconds · as you are today: sleep debt 35, chronic stress 40, caffeine 25,
  vagal tone 50 — the brake has 68 of 100 to work with · as marked, the line runs to
  hypervigilance · 3 pathways asked; you said how 2 went: 1 calm, 1 vigilant, 0 mixed · the
  ones that went vigilant touched Being watched while working most often._
- **The specimen.** Under `NIWA_MODE` the route serves Specimen A's circuit and three
  pathways, read-only, with a banner saying it is fiction. Locally a reader who has named
  nothing can show it to learn the instrument; nothing is written.
- **The Mac app** gets ⌘8.

## What it deliberately does not do

It does not decide whether a pathway will set the alarm off. It does not infer triggers from
the garden, score a pathway, rank pathways, or recommend a brake. The physics of the run are
the sandbox's, unchanged, and the sheet says in as many words that the body is a toy. The
_went_ marks are counted, never turned into an accuracy of the reader's own forecasts.

## Where

| File                                | Change                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `lib/alarm.ts`, its test            | the toy body, the marks' bends, the tally and readings, the files                             |
| `lib/alarm-store.ts`                | `circuit.json` and one file per pathway under `pathways/`                                     |
| `content/specimen-alarm.ts`         | Specimen A's circuit and pathways                                                             |
| `app/api/alarm/route.ts`            | GET circuit + pathways (the specimen when deployed), PUT a pathway, PATCH the circuit, DELETE |
| `app/alarm/page.tsx`                | the route                                                                                     |
| `components/Alarm.tsx`              | the circuit, the line, the run, the desk                                                      |
| `lib/palette.ts`                    | `--alarm-amyg`, `--alarm-pfc`, `--alarm-vagal`, `--alarm-symp`, `--alarm-freeze`              |
| `components/ViewSwitch.tsx`         | eighth tab                                                                                    |
| `components/Reader.tsx`, `Page.tsx` | "its alarm"                                                                                   |
| `scripts/NiwaApp.swift`             | ⌘8                                                                                            |
| `app/globals.css`                   | the wires' draw-on, the dials                                                                 |

## Out of scope

Reading Whoop or any device into the load — the dials are the reader's estimate of today,
on purpose. Suggesting triggers from a pathway's words. A pathway for a bearing decision
(011) — decisions are not garden stones yet.

## Acceptance checks

Run on 2026-09-24.

```bash
pnpm test
# ℹ tests 116 · pass 116 · fail 0   (tsc clean first)

curl -s -o /dev/null -w '%{http_code}\n' 127.0.0.1:5050/alarm
# 200

curl -s -X PATCH 127.0.0.1:5050/api/alarm -H 'content-type: application/json' \
  -d '{"circuit":{"triggers":[{"id":"noise","label":"Noise","charge":3}],"defences":[],"brakes":[{"id":"earplugs","label":"Earplugs","reach":"seconds"}],"load":{"sleep":30,"stress":30,"caffeine":20,"tone":55}}}' | head -c 120
# {"triggers":[{"id":"noise","label":"Noise","charge":3,"pulls":[],"signs":"","note":""}],"defences":[],"brakes":[{"id":"e

curl -s -X PUT 127.0.0.1:5050/api/alarm -H 'content-type: application/json' \
  -d '{"pathway":{"title":"Check","touches":{"noise":2},"brakes":["earplugs"]},"fresh":true}' | head -c 120
# {"slug":"check","title":"Check","put":"","touches":{"noise":2},"brakes":["earplugs"],"expects":[],"stones":[],"asked":"2
ls ~/personal/garden/niwa-vault/content/alarm/pathways/
# check.md
curl -s -X DELETE '127.0.0.1:5050/api/alarm?slug=check'
# {"gone":true}
```

- [x] The specimen's circuit draws; choosing a pathway draws its line with beads for each mark
      and lands on the road the reading names
- [x] _Poke it_ runs the toy: cues travel the low and high roads, the banner changes state,
      the gauges and the timeline move, a brake pressed marks the timeline, and a sentence
      sums the run
- [x] A trigger, a defence and a brake named on the desk are kept in `circuit.json`; the load
      dials are kept with the day
- [x] A pathway asked on the desk is kept as a file; _how did it go?_ is kept with its day;
      _take it back_ asks twice
- [x] The reading counts and names what the marks touch, pull, expect and reach, and grades
      nothing
- [x] Sumi and 375px hold
- [x] Under `NIWA_MODE` the route serves the specimen and refuses every write
