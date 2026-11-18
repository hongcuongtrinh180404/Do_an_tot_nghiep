# Mindly instructor entry

Direction: The well-kept board, seed 244350772. Existing Mindly palette and Roboto retained.
One section redraw: duration-based process bar replaced with disclosure panels because no review turnaround time is specified.
The existing public header/footer and two-line descriptive title take precedence over the dealt eight-character name tile.

Subject inventory: Mindly; Map Your Mind; Vietnamese video lessons; timestamped transcript; synchronized mindmap; in-video quiz; chapter editor; student account; Admin review; a single pending application; existing red public CTA; existing /courses instructor workspace.

Argument:
- Teach on Mindly using video and interaction: a working lesson-to-mindmap preview.
- Organize the knowledge and check understanding: course outline, timestamped transcript and a working quiz.
- Know how to start: actual account/review constraints, with form requirements deferred per brief.
- Keep one entry: application status and action on the same page as the explanation.

Idea: On this page, Mindly's timestamp-to-mindmap relationship becomes a working teaching board.
Live thing: choose a lesson timestamp and its mindmap node follows; answer the example quiz.
All lesson content and application preview dates/rejection notes are labeled examples.
No generated or externally sourced pictures; the four product fragments are rendered in HTML.

ROUND 1
Seen in one second: invitation to become a Mindly instructor beside a recognizable lesson preview.
Idea (one sentence): the teacher's lesson becomes the learner's interactive map.
Live thing: synchronized chapter selection and a keyboard-operable example quiz.
Layout words by section: hero=board / tools=staggered-fragments / preparation=paired-fields / process=disclosures / application=action-board.
Scores: design 7 · usability 6 · creativity 7 · content 7 → overall 6.0
Caps applied: mobile header overflow; inspector runs under the OS's reduced-motion preference.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. mobile-fold.jpg: existing register link ignores its hidden class because button display wins; put its responsive visibility on a parent and move crowded tablet navigation into the drawer.
2. tablet-page-01.jpg: closing statement wraps into four lines; shorten it and set the tablet statement at 24px.
3. desktop-page-01.jpg: registration text measure is too wide; cap it at 60ch.

Inspection note: explicitly exercise normal-motion emulation for the page inspection and reduced-motion for the separate fallback check, since Windows has reduced motion enabled.

ROUND 2
Normal-motion inspection now passes with 0 FAIL and 20 moving elements (18 CSS, 1 transition, 1 scripted reveal). The process section is a single-column list of tinted disclosures, so the icon-card row is gone.
Remaining warnings and positions:
- no-real-pictures / no-footage: defended. The page's subject is the teaching interface itself; the four lesson/course fragments are honest working HTML, not stock imagery. Adding architectural stock or a fake course video would misrepresent a product that has no course media yet. The direction's "Architecture set as atmosphere" is superseded here by the actual product fragments; this is stated in the record above, not hidden.
- off-centre @1440px: the probe measures text ink, not panel boxes. The page itself is even at 32px per side; the 74px reading is the 24px media inset plus 20px inner card padding on the right-hand lesson preview. The footer confirms the box margin is 32/32.
- ragged-edges: the board intentionally starts text on column lines (32px page margin, 56/72px panel insets, then 523/652/766/985px feature columns). Collapsing these would flatten the staggered-fragment composition the direction calls for. Three anchor lines already hold 59% of text; the rest belong to distinct columns, not drifting paragraphs.
- No new pictures or clips were invented for the page. The "Dạy theo cách của bạn" row keeps three working product fragments and the mindmap preview keeps the live timestamp-to-node relationship.
