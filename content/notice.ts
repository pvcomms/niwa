import type { Notice } from "../lib/notice.ts";

/**
 * The notice at the gate: what the garden is for, how to walk it, and what
 * it leaves to the reader. Plain text, kept here so it can be changed
 * without touching the view that sets it. `lib/notice.test.ts` checks that
 * every view still has its card and that nothing here belongs to one machine.
 */
export const NOTICE: Notice = {
  stance: [
    "This is an instrument for overthinking on purpose. Overthinking is what a decision does when it has nowhere to go: the same few considerations, round again, with nothing new arriving. The garden gives it somewhere to go. Every view is a sheet you set something down on — a decision, a belief, a claim, a plan, a stretch of your life — and a desk that reads back what your own record already holds about it: what you wrote, when, what it rests on, which parts you never went and looked at.",
    "Go round as many times as it takes. The aim is to come out the other side with something you can act on that has been checked against what is actually so, rather than against how it feels at the time. The garden cannot make that check for you. It can put the record where you can see it, count what is there, and draw hollow what you have not checked yet.",
    "The judgment is yours. Nothing here scores, ranks, recommends or says whether a thing is true. Where a sheet draws a line, your marks drew it. Where it counts, the count is what there is, not what it means. Read what it reads back, then decide as you would have had to anyway — better informed, and knowing which of your reasons are on the record and which are only in your head.",
  ],

  model:
    "Five views ask a model — the way, the provenance, the dialogue, the mask and the tack. It is the one running on this machine; it is asked what to propose, what to ask and what to go and look at; and everything it says arrives hollow until you keep it. It is never asked what you should do, or what is so.",

  grounded: {
    lead: "The garden's idea of reality is your own record, read at the moment you ask.",
    items: [
      {
        what: "your writing",
        how: "Memory, the vault and the garden's notes are read from disk on every request. Nothing is cached, so a stone is exactly as current as its file.",
      },
      {
        what: "dates",
        how: "Every note, entry, hand and check carries a day. A belief's inputs are dated by the first commit in which they appear in its file: when they arrived, not when they last changed.",
      },
      {
        what: "what you checked",
        how: "A hand is drawn solid only where you read its link once or saw it with your own eyes. A step, a check and a proposal are hollow until you keep them.",
      },
      {
        what: "words, counted",
        how: "The census counts the words a claim leans on; hand to hand shows what a wording gained and lost; the distribution places a thing by the words it shares. All of it can be checked against the source.",
      },
      {
        what: "your own marks",
        how: "Values, triggers, brakes, interests, toward and away, how it went: written by you, in your words, kept as files you can open.",
      },
      {
        what: "the limit",
        how: "It is only as grounded as the record. A fallow bed, a hollow hand and an empty margin are signals, not defects: they say where you have not looked.",
      },
    ],
  },

  round: [
    {
      when: "say it first",
      views: ["/margin"],
      key: "'",
      text: "The apostrophe, on any view. Get it out of your head in the words it arrives in. Nothing is asked of it yet.",
    },
    {
      when: "find what you already have",
      views: ["/catalogue", "/"],
      key: "⌘2 · /",
      text: "Search every word of every note and open what matches. The reader keeps the path you walked, so you can go back along it.",
    },
    {
      when: "if it is a decision",
      views: ["/bearing"],
      key: "⌘3",
      text: "Set it down where you judge it sits among your values. The sheet says which it serves and which it is silent on, and finds the stones about each.",
    },
    {
      when: "if it sets you off",
      views: ["/alarm"],
      key: "⌘8",
      text: "Mark it as a pathway against your own triggers, defences and brakes. Poke the toy body. Afterwards, say how it went.",
    },
    {
      when: "if a belief is under it",
      views: ["/course", "/flow"],
      key: "⌘6 · ⌘5",
      text: "Put the belief on the course and mark what bent it toward or away; see what has hit it since you last rewrote it. Then put it at the centre of the flow: what it rests on, which roots have gone fallow, which were never written.",
    },
    {
      when: "if a claim is doing the work",
      views: ["/provenance"],
      key: "⌘P",
      text: "Name the hands it came through, read a link once, say what would settle it, and go and check. Ask what to ask, never whether.",
    },
    {
      when: "if something new is coming in",
      views: ["/distribution"],
      key: "⌘4",
      text: "Weigh it against what you already have: kin to the garden, or new to it. Let it in, or pass.",
    },
    {
      when: "if you have lost the thread",
      views: ["/canon"],
      key: "⌘N",
      text: "Pick a stone many others reach for and read the strand that grows from it. Ring what carries it, strike what does not, and say in your words what the story is — or that it is not one.",
    },
    {
      when: "if something sounds right and you cannot say where you heard it",
      views: ["/voice"],
      key: "⌘Y",
      text: "Sit the session: skim an assistant's answers, tell it one small thing, rate how true sixteen statements feel. Then read what having met a statement once did to how true it felt, and what six stock phrases did to how understood you felt, with the information held the same.",
    },
    {
      when: "put it in time",
      views: ["/chronology"],
      key: "⌘7",
      text: "Set it down on the line and see what else was so when it began. Drag the present back and read the record as it stood.",
    },
    {
      when: "write the then",
      views: ["/way"],
      key: "⌘9",
      text: "Where you are, and where you mean to be as if it were already so. Count the sentences that still look ahead. Keep the steps you would actually take; set a dated one down on the chronology.",
    },
    {
      when: "if you are sure",
      views: ["/dialogue"],
      key: "⌘D",
      text: "Put the thesis down and let it be questioned: what you mean, what you assume, how you know, who would put it differently, what follows, why you are asking. Answer in your own words; examine each assumption as it surfaces; then re-put the thesis and read what it lost.",
    },
    {
      when: "if you cannot see how anyone thinks otherwise",
      views: ["/mask"],
      key: "⌘T",
      text: "Write the other side's case as they would put it, to be read by them, then mark each sentence for what you could mean. Where the mask slips is where you actually stand; write that down last.",
    },
    {
      when: "if you keep updating and never land",
      views: ["/tack"],
      key: "⌘L",
      text: "Put the claim down and ask the flinch: do you want evidence to be able to change this? A belief goes in the sails — say where you lean, write what it expects to see, and move it a tack at a time as you look. A commitment goes in the hull — write why, name the day before which you will not reopen it, and hold it through the stretch where the water looks bad.",
    },
    {
      when: "if two stories fit what you saw",
      views: ["/sieve"],
      key: "⌘S",
      text: "Put the question down with the worlds that could answer it, and give each a width — how you weigh them before looking. Then sift what you saw: for each world, how many in a hundred of it would show this. The box shades that much of each column and only the shaded areas are compared. Sift the next thing through what passed. Every number is yours.",
    },
    {
      when: "if the day has made you hard",
      views: ["/wish"],
      key: "⌘G",
      text: "Sit for ten minutes. You first, then someone who has been good to you, a friend, someone you pass without a thought, someone you find difficult — only as far as you can hold them — then everyone. The rings hold your own people; the truths said of each are true of every being; the facts are the ones you kept about yourself. Nothing has to be felt.",
    },
    {
      when: "if something hurts and the critic has the floor",
      views: ["/break"],
      key: "⌘B",
      text: "Take the break. Say what hurts in a line, then three sentences in your own words: that it hurts, that others feel this too, and something kind. A hand where it helps. Then, if you want, write what you are saying to yourself beside what you would say to a friend in your spot, and read the two.",
    },
    {
      when: "if you keep putting it off",
      views: ["/overview"],
      key: "⌘E",
      text: "Write the step, how hard it will be at its worst and for how long, then the life it opens as if it were already so, and who you are on that road. Pull back until the dip is a hairline. Take it — the clock runs until you say it is over, and you say how it was — or hold to let it go for today.",
    },
    {
      when: "before you clear something away",
      views: ["/fence"],
      key: "⌘F",
      text: "Put down what you mean to clear away and what it costs to keep. Then go and find out what it was for — ask whoever put it up, read what was written when it went up, watch what it does — and say whether each reason still holds. Say what would come through, and whether it could go back up. Then make the call, or take it down for a while and look again on a day you name.",
    },
    {
      when: "if you find yourself defending it",
      views: ["/muster"],
      key: "⌘U",
      text: "Put the claim down with where you stood before anything came in and which way you would rather it came out. Then each piece as it came — how much it weighs, whether you argued with it, where you stood after — and read your marks beside the scout's and the paladin's line on your own weights, and the soldier's and the pacifist's. Then run a room of the four and watch who carries it.",
    },
    {
      when: "if it turns on how much",
      views: ["/botec"],
      key: "\\",
      text: "Work it out on the back of an envelope, on whatever view you are on. Say what you are after, then what it is made of, a line at a time, each as a range you would be surprised to be outside. Read where the answer lands, how far it could run and which guess it leans on most — then go and find out that one.",
    },
    {
      when: "if you have just put the phone down and cannot say why you picked it up",
      views: ["/half-second"],
      key: "⌘J",
      text: "Run the synthetic feed against the toy body and watch the gauges move before there is a word for it. Then answer the question twice: what you would say you were doing, in your own words, beside what the trace shows — the dwells, the skips, the taps, what moved and did not move back. Keep the trace; afterwards, say what each had that the other did not.",
    },
    {
      when: "if you are going round in circles",
      views: ["/oblique"],
      key: "⌘O",
      text: "Deal a card and take it literally for ten minutes. Some come from a deck; some the garden deals from what you have let lie fallow or never wrote. Say what it turned up in the margin.",
    },
    {
      when: "read yourself back, then decide",
      views: ["/margin"],
      key: "⌘M",
      text: "Everything you said along the way, by thing. The garden has done what it can. The rest is yours.",
    },
    {
      when: "then take it into the world",
      views: ["/act"],
      key: "⌘I",
      text: "Say what you mean to do, the best that would come of it, what in you would stand in the way and what you will do if it does. Then the steps, each as when this happens, I will do that, on a real day — the first small enough to do today. Do them in the world, mark each one, and say what it was like.",
    },
  ],

  views: [
    {
      href: "/",
      name: "garden",
      key: "⌘1",
      for: "The whole, drawn: every stone and every thread, growing as the files change.",
      do: "Search with /, hover a stone for its card, click to open it. Hold ⇧ and draw a ring to gather stones. Fit re-frames.",
      reads:
        "Size is degree, colour is kind, opacity is how lately the file was touched. A hollow stone is an idea named and never written.",
      never: "Ranks a stone.",
    },
    {
      href: "/catalogue",
      name: "catalogue",
      key: "⌘2",
      for: "The same garden as a table, one row a note.",
      do: "Search every word, group by bed, section or stage, sort by place, title, date or threads. The state lives in the address.",
      reads:
        "The whole, lit where the search is; a page for each note with its trail, its family and what its threads reach.",
      never: "Hides a note it cannot place.",
    },
    {
      href: "/bearing",
      name: "bearing",
      key: "⌘3",
      for: "Your values as overlapping circles a decision can be set down on.",
      do: "Type a decision and drag its stone to where you judge it sits. Double-click to set down, arrows nudge. Draw where it leads.",
      reads:
        "Which values it serves, which it is silent on, the stones about each; what a move gains and leaves.",
      never: "Scores the placement.",
    },
    {
      href: "/distribution",
      name: "distribution",
      key: "⌘4",
      for: "The garden's own taste as a measured curve.",
      do: "Paste a title and a line, or a link read once on your press. Say let it in, or pass. The garden seals a guess at your call when you weigh a thing and opens it only after you make it.",
      reads:
        "Where it falls against everything and against lately, its kin, the words they share, the terms it speaks. After the call, the garden's sealed guess beside the base rate; across the record, how far its guesses and the base rate's sat from what you did, and the skill between them once there are ten.",
      never: "Grades what you read, or shows its guess before you choose.",
    },
    {
      href: "/flow",
      name: "flow",
      key: "⌘5",
      for: "The threads given the direction writing gave them.",
      do: "Put any stone at the centre. Click a stone to walk to it; [ walks back.",
      reads:
        "What it rests on, which roots have gone fallow, which were never written, which single root is a linchpin, what loops back.",
      never: "Weighs a thread.",
    },
    {
      href: "/course",
      name: "course",
      key: "⌘6",
      for: "A belief and everything that bent it, in the order it came.",
      do: "Put the belief on the sheet. Mark each input toward or away, after the fact. Re-put the question when it changes.",
      reads:
        "The course your marks imply, what kind of thing did the bending, what has hit the belief since you last rewrote it.",
      never: "Marks an input for you.",
    },
    {
      href: "/chronology",
      name: "chronology",
      key: "⌘7",
      for: "Your life as a number line: the inner lanes above, the world below.",
      do: "Double-click to set down, drag to re-date, bind to stones. Let a public happening in. Thread two entries with a plain verb. ⌘ and the wheel zoom.",
      reads:
        "What was so and beside what; the record as it stood when the present is dragged back.",
      never: "Says what mattered.",
    },
    {
      href: "/alarm",
      name: "alarm",
      key: "⌘8",
      for: "Your fight-or-flight circuit, in your own names.",
      do: "Name triggers, defences, brakes and today's load. Mark a pathway against them. Poke it. Afterwards, say how it went.",
      reads:
        "The line your marks add up to, toward hypervigilance or calm; the toy body's run, gauge by gauge.",
      never: "Predicts you.",
    },
    {
      href: "/way",
      name: "way",
      key: "⌘9",
      for: "From where you are to where you mean to be, written as if it is so.",
      do: "Write the now and the then. Ask the model on this machine for the way. Keep or drop each step. Stand at the then.",
      reads:
        "Which sentences still look ahead, what the then speaks of that the now does not, the way as a memoir.",
      never: "Scores a step's chances.",
    },
    {
      href: "/margin",
      name: "margin",
      key: "⌘M · '",
      for: "What you said to yourself while looking, on every view.",
      do: "Type or record at the edge of any view. Read it back by day, view, thing or word. Have a spoken note written out.",
      reads: "When, where, about what, in your words; counts.",
      never: "Summarises you.",
    },
    {
      href: "/provenance",
      name: "provenance",
      key: "⌘P",
      for: "How a claim reached you, hand by hand; and, on its second sheet, how each stone in the garden came in.",
      do: "Put the claim down as it arrived and as first said. Name each hand with its day, wording, link and interests. Read a link once. Name a check and say how it went. On the stones: say where you think your ideas come from, then ask the model to read the unread, and keep or change what it proposes.",
      reads:
        "The chain, solid only where checked; what each wording gained and lost; the words the claim leans on. The stones by route — read, told, asked, made, lived, thought — yours, read off the file and proposed kept apart, beside your own split.",
      never: "Says whether it is so, or that one route is the better way for an idea to arrive.",
    },
    {
      href: "/oblique",
      name: "oblique",
      key: "⌘O",
      for: "A card dealt at random, to come at the thing from an angle.",
      do: "Deal with a click, space or →; ← goes back. Strike a source from the shuffle. Type or paste your own cards into a deck. Say what it turned up in the margin.",
      reads:
        "Where the card came from — the starter deck, a deck of yours, or your own garden: a stone lying fallow, a ghost, one of your terms or values — and the counts.",
      never: "Picks the card for you, or says what it means.",
    },
    {
      href: "/dialogue",
      name: "dialogue",
      key: "⌘D",
      for: "Socratic questioning: a thesis of yours asked about, in the open, across six families of question, until its meaning is clearer and its assumptions are on the table.",
      do: "Put the thesis down. Take a question from the bank, the garden or your own hand and answer it in your words. Ask the model on this machine what to ask next. Surface an assumption; examine it. Re-put the thesis.",
      reads:
        "Which families have been asked and which not, where the questions came from, assumptions surfaced and how each went, terms clarified, what the thesis gained and lost. Counts, never a verdict.",
      never: "Answers, agrees, disagrees, or says whether the thesis holds.",
    },
    {
      href: "/mask",
      name: "mask",
      key: "⌘T",
      for: "An ideological Turing test turned inward: write the other side's case as they would put it, then find out which of it you could mean.",
      do: "Name the matter and the two sides. Write your case in your voice, then theirs in the mask — to be read by them. Mark each sentence of the mask: mean it, could say it, refuse it. Ask an adherent what gives you away. Write where you stand.",
      reads:
        "The tells in each voice — distancing, scare quotes, hedging, sneer, absolutes — and who each case says 'we' about; the sentences that crossed; which of your values each case leans on; what the two share. Counts, never a grade.",
      never: "Says whether the mask passes, or which side is right.",
    },
    {
      href: "/tack",
      name: "tack",
      key: "⌘L",
      for: "Directional accuracy: you cannot sail straight at what is so, so you hold a heading and correct. Beliefs in the sails, loose; commitments in the hull, fixed.",
      do: "Write the claim and ask the flinch. In the sails: say where you lean between the ends, write what you would expect to see if so and if not, then tack — what you saw, what it matched, where you lean now. In the hull: write why, name the day before which you will not reopen it, and when the window opens hold it again or let it go. Ask the garden and the model on this machine what to go and look at.",
      reads:
        "The path your tacks drew and any step that crossed the middle; steps toward so and toward not, the largest; what it expects and what each sighting matched; the window, the days held, reopenings and which were early; how much sits in the sails and how much in the hull. Counts, never a grade.",
      never: "Says whether a claim is so, how likely, or what to hold.",
    },
    {
      href: "/sieve",
      name: "sieve",
      key: "⌘S",
      for: "Bayes drawn as areas, built by hand: worlds as columns as wide as you weigh them, a sighting shading each by how much of that world would show it, and only the shaded areas compared.",
      do: "Write the question and name the worlds. Give each its parts before looking — 1 : 100 — by typing or by dragging the line between two columns. Then sift a sighting: what you saw, and for each world how many in a hundred of it would show this; drag a shade's edge to say it again. The next sighting is sifted through what passed the last. Take back the last, or take the question off.",
      reads:
        "The widths before looking; what each sighting passed of each world and how many to one it weighed; what passes now, in parts and in a hundred; whether the widest column changed hands and after what; the sighting that weighed most; what it would take for the second to draw level with the first. Your numbers, multiplied, never a verdict.",
      never: "Supplies a number: every width and every shade is yours, and it only multiplies and draws.",
    },
    {
      href: "/wish",
      name: "wish",
      key: "⌘G",
      for: "Loving-kindness as an instrument: may you be safe, well, at ease, happy — said to yourself, then outward ring by ring to everyone.",
      do: "Put your people on the rings — someone good to you, a friend, someone you pass, someone difficult — and rings of your own. Keep the wishes in your words, the truths that hold for every being, and facts about yourself. Choose the minutes and the rings, then sit: each line is said, then held in silence. Have the speech server on this machine write a sitting out as one voice and listen. Say afterwards how it was.",
      reads:
        "Sittings and minutes, this week and this month, days running; who was held and how often, who only once; whether the difficult ring was held; how many rings, beings, wishes, truths and facts are in the practice. Counts, never a grade.",
      never: "Says whether you are kind, or that you should sit.",
    },
    {
      href: "/break",
      name: "break",
      key: "⌘B",
      for: "Mindful self-compassion as an instrument, after Neff and Germer: the self-compassion break, a hand, and how you would treat a friend.",
      do: "Write what hurts. Say the three sentences — noticed, shared, kind — in your own words, or take the workbook's; mark which was hardest. Choose a hand. Write what you need to hear. Take the break. Then, if you want: what you are saying to yourself beside what you would say to a friend, a letter from someone who loves you as you are, and afterwards how it went.",
      reads:
        "Breaks this week and this month, the last; whether the sentences were yours; which hands; which of the three was hardest and how often; the two voices counted word by word — absolutes, shoulds, labels, contempt, allowance — and what the friend's version drops or adds; the words that come back when you talk to yourself. Counts, never a grade.",
      never: "Says you are hard on yourself, or scores anything.",
    },
    {
      href: "/overview",
      name: "overview",
      key: "⌘E",
      for: "The overview effect turned on time: a step you keep putting off, drawn to scale against the life it opens, from the minutes it hurts to the years it runs.",
      do: "Write the step. Say how hard it will be at its worst and for how long — drag the bottom of the dip or type it. Write the life if it goes as you hope, as it is, and who you are on that road; mark how far above now the road is by a week, a month, a year. Pull back. Then take the step — the clock runs until you say it is over, and you say how it was — or hold to let it go for today, and say what stood in the way.",
      reads:
        "What share of the frame the dip is at every distance, and of the whole horizon; where each road is by a year and by the horizon, as marked; what the road with the step has over the other against the dip, by your marks; which sentences of the life still look ahead; the days let go; for every step taken, what you said before beside what it was. Your numbers, never a grade.",
      never: "Says whether a step is worth it, or that you should take it.",
    },
    {
      href: "/fence",
      name: "fence",
      key: "⌘F",
      for: "Chesterton's fence as an instrument: before a rule, a habit or a custom is cleared away, what it was for.",
      do: "Put down what you would clear away and what it costs to keep. Say what it might be for and how you know each — a guess, or found out by asking, by finding it written, by watching it work — and whether the reason still holds. Say what would come through if it came down, and whether it could go back up. Then make the call: keep it, move it, take it down, or take it down for a while and look again on a day you name; afterwards, mark what came through. The rules in your record are offered as fences already standing, each with the reason you gave then.",
      reads:
        "What it might be for, found or guessed, and which reasons still hold; whether a use has been found; what you said would come through and whether it could go back up; the calls with their days, and the day to look again when it comes; afterwards, what came through of what you listed. Across the record: where the fences stand, the uses found and guessed, the fences taken down before a use was found. Counts, never a grade.",
      never: "Says whether a fence should come down, or keeps one for being old.",
    },
    {
      href: "/muster",
      name: "muster",
      key: "⌘U",
      for: "Amanda Askell's four quarters as an instrument: after what is so or after your side, fighting for it or keeping the peace — the soldier, the paladin, the pacifist and the scout.",
      do: "Put down a claim, your prior and where it came from, which way you would rather it came out, and the line you would act at. Add each piece of evidence as it came — which way it points, how much more likely you would see it if that were so, whether you argued with it, took it in or let it pass — and where you stood after. The four run the same pieces by their rules beside your marks; replay them in another order to see who the order matters to. Put yourself on the field. Then seat a room of the four and run it round by round, as a court or as a stage, beside the same deal to rooms of one kind each.",
      reads:
        "Your weights multiplied, beside your own marks; of the weight you gave, how far you moved on what went your way and on what went against you; which you argued with; where you and your weights stand against the line you would act at; where each of the four ends, and in any order. The room, round by round: its middle and spread, who was dealt what and what they did with it, what was kept quiet, fool's gold dealt and shown up. Across the record: the same counts, and how claims came out beside where you stood. Counts, never a grade.",
      never: "Places you in a quarter, or says a move was too large or too small.",
    },
    {
      href: "/botec",
      name: "botec",
      key: "⌘= · \\",
      for: "A back-of-the-envelope calculation on every view: a thing worked out from rough guesses, and how far the answer could run.",
      do: "Press the backslash on any view, or the tab at its edge; a stone's reader has botec it. Say what you are working out, then a line at a time: what the line is, and a number or a range — 3M, 20 to 50, 1 in 30. Lines are multiplied down the page unless you say ÷, + or −; type = as a line's number to break it down into lines of its own. Drag any number sideways, or ↑ ↓ it. Draw a line across the answer — at 1 for it pays for itself, say. Keep it; afterwards, say what it came to.",
      reads:
        "The middle of five thousand draws of your ranges and where nine in ten of them fall, drawn as a hundred dots; where the page stands after each line; which guess the answer leans on most; how many draws land above your line; afterwards, where what it came to fell among the draws. Across the record: how many were looked up, and how many came in under, inside or over. Your numbers, multiplied, never a verdict.",
      never: "Supplies a number you did not write, or says whether a thing is worth doing.",
    },
    {
      href: "/half-second",
      name: "half-second",
      key: "⌘J",
      for: "A feed engineered against a toy body, and the trace of what you did in the half-second before you knew.",
      do: "Scroll the twelve invented cards; show the engineering to see what each is built to do and which sense it addresses. Tap, pull to refresh, hover a card to light its channel on the body. Scrub the half-second: below 500 ms the gauges are live and the words are blank. Pick the norm the feed is scored against, the years you grew up in, the vocabulary the bloom is named in. Put it down and watch the gauges settle while the meters stay. Then say, in your own words, why you kept scrolling, beside what the trace shows. Keep it; afterwards, what each had that the other did not.",
      reads:
        "Cards seen and for how long, the hail answered or let go, taps and skips, pulls and the good card, the gauges at their highest, which meters moved and what each reads under your norm, what the feed thought you were first, the bloom at its highest under three words and under twelve, how many words you said beside how many lines the trace holds. Across the record: traces kept, the hail answered in how many, put down in how many, standing down and threat up in how many. Counts, never what they mean.",
      never:
        "Says you were hooked, that the reason you gave was wrong, or that you should put it down. Measures nothing from you: the feed is fiction and the body is a toy.",
    },
    {
      href: "/canon",
      name: "canon",
      key: "⌘N",
      for: "Which stories the garden actually tells: a stone many others reach for, and the strand that gathers round it.",
      do: "Pick a root — every stone three or more others reach for, with how many — or come from a stone's reader. The strand is drawn along time: what reaches for it above the line, its nearest kin by words below. Ring the touchpoints, up to ten; the garden offers a few, dashed, each with why. Strike what is not the story. Say whether it is one story, whether the idea moved along it, whether it is of use, each in a line if you want. Write the story. Then the call: into the canon, or leave it out.",
      reads:
        "How many reach for the root and how, the kin and the words they share, the first and latest day on record, how often the strand's stones thread each other, the builds it reaches, the touchpoints and what was struck, your three answers and the call; once kept, what has come to reach for it since and what has stopped. Across the record: strands looked at, in and out, touchpoints, how much of the garden the canon holds, how many roots have been looked at. Counts, never what they mean.",
      never:
        "Says which strands belong in the canon, or that a stone matters because many reach for it.",
    },
    {
      href: "/act",
      name: "act",
      key: "⌘I",
      for: "From intention to action: what you mean to do, taken into the world a step at a time, and what it was like.",
      do: "Say what you mean to do, or act on a stone or a kept envelope. Write the best that would come of it, what in you would stand in the way, and what you will do if it does. Then the steps: when this happens, I will do that, where and for how long, on a day; drag a step along the line to another day. When a step is done in the world, mark it done or let go, and say what it was like — easier, as you thought, or harder — and whether what stands in the way showed up. Afterwards, the after-action review.",
      reads:
        "What was meant beside what was lived: each step's day as planned and the day it was done; the steps moved, let go and past their day; how long from setting the intention down to the first step; what the steps were like; what is next. Across the record: intentions acted on, steps done on the day meant, the first step's day in the middle case. Counts, never a grade.",
      never: "Reminds, nags, keeps a streak, or says what to do.",
    },
    {
      href: "/crowd",
      name: "crowd",
      key: "⌘R",
      for: "A positive result set against how rare the thing is: base rate neglect, walked through in a crowd of a thousand rather than in percentages.",
      do: "Say what you think the chance is before any arithmetic. Then walk the crowd a step at a time: who has it, everyone tested, only the flagged kept. Turn the three dials — how rare, how often it is caught, how often the rest are flagged — and set them to a situation: a rare illness, a breath test, a camera at a stadium, a spam filter. Nothing is kept.",
      reads:
        "The crowd in whole people: how many have it, how many of those are caught, how many of the rest are flagged anyway, and so, of everyone flagged, how many have it. Your number beside the crowd's and beside what the people asked in the studies said. What each dial does from here, as three counts. Counts, never a grade.",
      never: "Says whether you have it, whether the test was worth taking, or whether your guess was a good one.",
    },
    {
      href: "/panel",
      name: "panel",
      key: "⌘K",
      for: "The garden read as eight markers over time, the way a blood panel is read: each on its own line, none added to another, none with a direction it is meant to go.",
      do: "Point along any line, or press ← and →, and every line reads the same week. Take out the ten most threaded stones, or everything planted in bulk, and read the lines again. Pick a day planted in bulk to put the cursor on its week. Nothing is kept.",
      reads:
        "Week by week, from the day each file first appears in git: the stones, the threads between them, threads per stone, pairs written both ways, the share that use a term of the glossary, the share with no thread, the share changed in the month, the ideas linked to and never written. Each beside its value four weeks before and at the start; what each count cannot see; the days on which twenty or more stones first appeared; the ten most threaded. Counts, never a total.",
      never:
        "Adds the markers into one number, or says which way any of them ought to go.",
    },
    {
      href: "/voice",
      name: "voice",
      key: "⌘Y",
      for: "Two feelings a machine can give without having either: that a claim is true, because you have met it before, and that you were understood, because the reply was warm.",
      do: "Rate eight of an assistant's answers for interest. Tell it one small thing on your mind and rate two replies for how understood you feel; then see how they were made, and turn the warmth up on something that does not matter. Rate sixteen statements for how true they feel, eight of them met before. Then the debrief. Nothing is kept, and each sitting draws a new eight.",
      reads:
        "How true the statements you had met felt beside the ones you had not, as two means and their difference; the same for the false statements alone; every statement with your rating and what is the case; your two ratings of the replies beside the words each held — yours with the pronouns turned round, stock advice, stock feeling. Counts and means, never a grade.",
      never:
        "Says you were fooled, or that a warm reply was worse. Keeps what you wrote.",
    },
  ],

  keys: [
    { key: "/", does: "search", where: "garden · catalogue" },
    { key: "⌘K", does: "search", where: "catalogue" },
    { key: "esc", does: "clear, close, let go", where: "everywhere" },
    {
      key: "[",
      does: "step back along the walk",
      where: "garden · flow · ⌘[ in the app",
    },
    { key: "⇧ drag", does: "draw a ring round stones", where: "garden" },
    { key: "'", does: "open the margin", where: "every view" },
    { key: "\\", does: "work it out on the back of an envelope", where: "every view" },
    {
      key: "double-click",
      does: "set down where you point",
      where: "bearing · chronology",
    },
    { key: "← → ↑ ↓", does: "nudge the stone", where: "bearing" },
    { key: "⌘ wheel", does: "zoom the line", where: "chronology" },
    {
      key: "⌘1 – ⌘9",
      does: "the garden through the way, in tab order",
      where: "the Mac app",
    },
    {
      key: "⌘M · ⌘P · ⌘O · ⌘D · ⌘T · ⌘L · ⌘S · ⌘G · ⌘B · ⌘E · ⌘F · ⌘U · ⌘= · ⌘I · ⌘R · ⌘J · ⌘N · ⌘Y · ⌘?",
      does: "the margin, the provenance, the oblique, the dialogue, the mask, the tack, the sieve, the wish, the break, the overview, the fence, the muster, the botec, the act, the crowd, the half-second, the canon, the voice, this notice",
      where: "the Mac app",
    },
    {
      key: "space · → · ←",
      does: "deal the next card, or go back",
      where: "oblique",
    },
    { key: "→ · ←", does: "walk the crowd a step, or back", where: "crowd" },
    { key: "← · →", does: "read every marker a week back, or on", where: "panel" },
    { key: "space · → · esc", does: "hold, the next line, end the sitting", where: "wish" },
    { key: "space · ⌘ scroll", does: "pull back and come in; go by hand", where: "overview" },
    { key: "⌘0", does: "frame the garden", where: "the Mac app" },
    { key: "paper · sumi", does: "the theme", where: "every view" },
  ],

  not: [
    "Score, rank or grade anything: a placement, a claim, a step, a life.",
    "Recommend. No option is ever put above another.",
    "Say whether a claim is true, likely, credible or trustworthy.",
    "Decide what mattered, or draw a thread you did not draw.",
    "Write your interests, your marks or your reasons for you.",
    "Leave the machine. It reads your files here, calls no host you did not name, and the model it asks is the one running beside it.",
    "Keep anything you did not write. No telemetry, no analytics, nothing phoned home.",
  ],

  yours: [
    "Placing the stone.",
    "Saying what a hand gains, and what it runs on.",
    "Marking toward or away, after the fact.",
    "Saying how it went.",
    "Going and checking, and coming back to say so.",
    "Keeping or dropping what the model proposes.",
    "Deciding — and then writing down what you decided, so the garden has it next time.",
  ],
};
