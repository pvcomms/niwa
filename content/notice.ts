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
    "Two views ask a model — the way and the provenance. It is the one running on this machine; it is asked what to propose and what to ask; and everything it says arrives hollow until you keep it. It is never asked what you should do.",

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
  ],

  views: [
    {
      href: "/",
      name: "garden",
      key: "⌘1",
      for: "The whole, drawn: every stone and every thread, growing as the files change.",
      do: "Search with /, hover a stone for its card, click to open it. Hold ⇧ and draw a ring to gather stones. Fit re-frames.",
      reads: "Size is degree, colour is kind, opacity is how lately the file was touched. A hollow stone is an idea named and never written.",
      never: "Ranks a stone.",
    },
    {
      href: "/catalogue",
      name: "catalogue",
      key: "⌘2",
      for: "The same garden as a table, one row a note.",
      do: "Search every word, group by bed, section or stage, sort by place, title, date or threads. The state lives in the address.",
      reads: "The whole, lit where the search is; a page for each note with its trail, its family and what its threads reach.",
      never: "Hides a note it cannot place.",
    },
    {
      href: "/bearing",
      name: "bearing",
      key: "⌘3",
      for: "Your values as overlapping circles a decision can be set down on.",
      do: "Type a decision and drag its stone to where you judge it sits. Double-click to set down, arrows nudge. Draw where it leads.",
      reads: "Which values it serves, which it is silent on, the stones about each; what a move gains and leaves.",
      never: "Scores the placement.",
    },
    {
      href: "/distribution",
      name: "distribution",
      key: "⌘4",
      for: "The garden's own taste as a measured curve.",
      do: "Paste a title and a line, or a link read once on your press. Say let it in, or pass.",
      reads: "Where it falls against everything and against lately, its kin, the words they share, the terms it speaks.",
      never: "Grades what you read.",
    },
    {
      href: "/flow",
      name: "flow",
      key: "⌘5",
      for: "The threads given the direction writing gave them.",
      do: "Put any stone at the centre. Click a stone to walk to it; [ walks back.",
      reads: "What it rests on, which roots have gone fallow, which were never written, which single root is a linchpin, what loops back.",
      never: "Weighs a thread.",
    },
    {
      href: "/course",
      name: "course",
      key: "⌘6",
      for: "A belief and everything that bent it, in the order it came.",
      do: "Put the belief on the sheet. Mark each input toward or away, after the fact. Re-put the question when it changes.",
      reads: "The course your marks imply, what kind of thing did the bending, what has hit the belief since you last rewrote it.",
      never: "Marks an input for you.",
    },
    {
      href: "/chronology",
      name: "chronology",
      key: "⌘7",
      for: "Your life as a number line: the inner lanes above, the world below.",
      do: "Double-click to set down, drag to re-date, bind to stones. Let a public happening in. Thread two entries with a plain verb. ⌘ and the wheel zoom.",
      reads: "What was so and beside what; the record as it stood when the present is dragged back.",
      never: "Says what mattered.",
    },
    {
      href: "/alarm",
      name: "alarm",
      key: "⌘8",
      for: "Your fight-or-flight circuit, in your own names.",
      do: "Name triggers, defences, brakes and today's load. Mark a pathway against them. Poke it. Afterwards, say how it went.",
      reads: "The line your marks add up to, toward hypervigilance or calm; the toy body's run, gauge by gauge.",
      never: "Predicts you.",
    },
    {
      href: "/way",
      name: "way",
      key: "⌘9",
      for: "From where you are to where you mean to be, written as if it is so.",
      do: "Write the now and the then. Ask the model on this machine for the way. Keep or drop each step. Stand at the then.",
      reads: "Which sentences still look ahead, what the then speaks of that the now does not, the way as a memoir.",
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
      for: "How a claim reached you, hand by hand.",
      do: "Put the claim down as it arrived and as first said. Name each hand with its day, wording, link and interests. Read a link once. Name a check and say how it went.",
      reads: "The chain, solid only where checked; what each wording gained and lost; the words the claim leans on.",
      never: "Says whether it is so.",
    },
    {
      href: "/oblique",
      name: "oblique",
      key: "⌘O",
      for: "A card dealt at random, to come at the thing from an angle.",
      do: "Deal with a click, space or →; ← goes back. Strike a source from the shuffle. Type or paste your own cards into a deck. Say what it turned up in the margin.",
      reads: "Where the card came from — the starter deck, a deck of yours, or your own garden: a stone lying fallow, a ghost, one of your terms or values — and the counts.",
      never: "Picks the card for you, or says what it means.",
    },
  ],

  keys: [
    { key: "/", does: "search", where: "garden · catalogue" },
    { key: "⌘K", does: "search", where: "catalogue" },
    { key: "esc", does: "clear, close, let go", where: "everywhere" },
    { key: "[", does: "step back along the walk", where: "garden · flow · ⌘[ in the app" },
    { key: "⇧ drag", does: "draw a ring round stones", where: "garden" },
    { key: "'", does: "open the margin", where: "every view" },
    { key: "double-click", does: "set down where you point", where: "bearing · chronology" },
    { key: "← → ↑ ↓", does: "nudge the stone", where: "bearing" },
    { key: "⌘ wheel", does: "zoom the line", where: "chronology" },
    { key: "⌘1 – ⌘9", does: "the garden through the way, in tab order", where: "the Mac app" },
    { key: "⌘M · ⌘P · ⌘O · ⌘?", does: "the margin, the provenance, the oblique, this notice", where: "the Mac app" },
    { key: "space · → · ←", does: "deal the next card, or go back", where: "oblique" },
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
