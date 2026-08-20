/* Blog articles.
 *
 * Content boundary: this is general cycling and maintenance advice, which is
 * safe to write. It references only shop facts already verified from the live
 * site (prices, hours, PNC checks, address). No invented claims, no statistics.
 */

const POSTS = {
  "sizing": {
    tag: "Guides",
    title: "How to size up your bicycle properly",
    excerpt:
      "Getting frame size right is the single biggest factor in comfort. Here's how we measure riders in store — and how to do a quick check at home.",
    date: "12 July 2026",
    palette: "teal",
    motif: "leaf",
    body: `
      <p class="lede">A bike that doesn't fit is the most common reason people stop riding
      something they spent good money on. It isn't usually dramatic — just a nagging ache in
      the neck, numb hands after twenty minutes, or a saddle that never feels right.</p>

      <h2>Start with standover</h2>
      <p>Stand over the frame with both feet flat on the ground. You want a little clearance
      between you and the top tube — roughly 2–3cm on a road bike, more like 5cm on a mountain
      bike where you're more likely to need to get off in a hurry. If you can't stand over it
      comfortably, the frame is too big, and no amount of adjustment will fix that.</p>

      <h2>Then saddle height</h2>
      <p>This is the adjustment that makes the biggest difference and the one most people get
      wrong. Sit on the bike, put your heel on the pedal at its lowest point, and your leg
      should be almost straight. Move to the ball of your foot — where it actually sits when
      riding — and you'll have a slight bend in the knee.</p>
      <p>Most people ride with the saddle far too low, usually because it feels safer. It makes
      pedalling much harder work and is a common cause of knee pain.</p>

      <h2>Reach and bar height</h2>
      <p>Holding the bars, your elbows should be slightly bent, not locked straight and not
      folded up. You shouldn't feel stretched out or cramped. Reach is adjusted with saddle
      position and stem length, and there's more range here than people expect — a bike that
      feels nearly right can usually be made right.</p>

      <h2>Why charts only get you so far</h2>
      <p>Two people the same height can need different frames, because leg and torso length
      vary independently. A size chart is a starting point for narrowing down, not an answer.</p>

      <h2>Come and try a few</h2>
      <p>We'll size you up properly in the shop and you can ride a few before deciding. There's
      no charge for that and no obligation to buy — it's far better for everyone that you end
      up on the right bike.</p>
    `,
  },

  "security": {
    tag: "Security",
    title: "Our Cycle Security Pledge — and how to keep your bike yours",
    excerpt:
      "Every used bike we buy is PNC-checked. Here's how the checks work, plus the locking habits that actually deter thieves in London.",
    date: "28 June 2026",
    palette: "navy",
    motif: "map",
    body: `
      <p class="lede">Bike theft is the thing that puts people off cycling in London more than
      traffic does. Here's what we do about it at our end, and what actually works at yours.</p>

      <h2>What we do before buying any second-hand bike</h2>
      <p>Every bicycle we buy is checked against the Police National Computer before any money
      changes hands — either by calling the local station or checking the frame details on
      CheckMEND. Anyone selling to us must be over 18, complete an Owner's Declaration Form, and
      provide two forms of identification: a photo ID and a proof of address. We keep a copy of
      both.</p>
      <p>We also maintain our own record of stolen bicycles. If yours has been taken, come and
      tell us — we'd rather know what to watch for.</p>

      <h2>Buy two locks, not one</h2>
      <p>A good D-lock through the frame and rear wheel, plus a cable or second lock for the
      front. Two different lock types means two different tools, and most opportunist thefts
      don't survive that. Spending roughly a tenth of the bike's value on locks is a reasonable
      rule of thumb.</p>

      <h2>Lock it properly</h2>
      <p>Through the frame and the stand — not just the wheel, which comes off. Keep the lock
      off the ground so it can't be smashed against the pavement, fill the gap inside the D so
      there's no room for a jack, and point the keyhole downwards.</p>

      <h2>Photograph it and write down the frame number</h2>
      <p>The frame number is usually stamped under the bottom bracket, where the pedals are.
      Photograph the bike and note that number now, while you still have it. Registering it on a
      national database is free and takes a few minutes — and without it, a recovered bike often
      can't be returned to its owner.</p>

      <h2>Where you leave it matters</h2>
      <p>Busy, overlooked spots beat quiet corners. If you're leaving it in the same place every
      day, vary it where you can — a bike that's always there at the same time is a bike someone
      can plan around.</p>
    `,
  },

  "service-signs": {
    tag: "Maintenance",
    title: "Five signs your bike needs a service",
    excerpt:
      "Clicking gears, spongy brakes, a creaking bottom bracket — catch these early and save money on bigger repairs later.",
    date: "15 June 2026",
    palette: "amber",
    motif: "wrench",
    body: `
      <p class="lede">Most expensive bike repairs start as a small noise somebody ignored for a
      month. Here are the five worth acting on.</p>

      <h2>1. The gears click or hesitate</h2>
      <p>If the chain hesitates before dropping into gear, or clicks constantly in certain
      gears, the cables have usually stretched. That's a quick adjustment. Left alone, a chain
      that's mis-shifting wears the cassette and chainrings unevenly, and those cost
      considerably more than a gear service.</p>

      <h2>2. The brakes feel spongy or pull to the bar</h2>
      <p>Brake levers should feel firm. If they come most of the way to the handlebar, you're
      low on pad material or the cable has stretched — or, on hydraulics, there's air in the
      system. This is the one not to put off.</p>

      <h2>3. Something creaks when you pedal hard</h2>
      <p>A rhythmic creak that matches your pedalling usually means the bottom bracket, though
      it can be pedals or the chainset. Bearings that are merely dry can be serviced; bearings
      left until they're damaged have to be replaced.</p>

      <h2>4. The chain looks dry, or grinds</h2>
      <p>A chain should look lightly oiled, not black and crusty and not bone dry. A neglected
      chain wears the whole drivetrain with it — replacing a chain in time is cheap, replacing a
      chain, cassette and chainrings together is not.</p>

      <h2>5. The tyres have cracks, cuts or embedded flint</h2>
      <p>Sidewall cracks mean the rubber has perished, and it will fail eventually — usually at
      the least convenient moment. Run a thumb around the tread now and then and pick out
      anything embedded before it works its way through.</p>

      <h2>What a service covers</h2>
      <p>Our Standard Service is £45 and includes a 32-point safety check with brakes and gears
      tuned. The General Service at £65 adds replacing pads, blocks and cables where they're
      needed. The Full Service at £90 strips and rebuilds the bearings and fits fresh cables
      throughout.</p>
      <p>Whichever you choose, if the mechanic finds you need a part, we ring you first and
      you decide. Nothing gets fitted without your say-so.</p>
    `,
  },

  "folding-ebikes": {
    tag: "E-bikes",
    title: "Is a folding e-bike right for your commute?",
    excerpt:
      "We compare the folding e-bikes we stock and who each one suits — flat-dwellers, train commuters and hill-haters alike.",
    date: "2 June 2026",
    palette: "green",
    motif: "tag",
    body: `
      <p class="lede">Folding e-bikes solve two problems at once — the hill and the storage —
      which is why they've become the default choice for a lot of London commuters. They're not
      right for everyone, though.</p>

      <h2>They make sense if…</h2>
      <p><strong>Your commute involves a train.</strong> A folder goes on any train at any time
      without a reservation, which a full-size bike often can't.</p>
      <p><strong>You live in a flat.</strong> If the choice is between a bike in the hallway and
      no bike at all, a folder wins. It also can't be stolen from outside if it's never outside.</p>
      <p><strong>You arrive somewhere you need to look presentable.</strong> Assistance means
      you're not arriving damp.</p>
      <p><strong>There's a hill you've been avoiding.</strong> This is the honest reason most
      people buy one, and it's a good reason.</p>

      <h2>They make less sense if…</h2>
      <p>You ride long distances for pleasure, you need to carry a lot regularly, or you have
      secure ground-floor storage and no train in your journey. In those cases a normal bike is
      lighter, cheaper and usually nicer to ride.</p>

      <h2>What to actually compare</h2>
      <p><strong>Weight.</strong> The number that matters most and the one people ignore. You
      will carry it up stairs. There's a real difference between 15kg and 25kg when it's in your
      hand.</p>
      <p><strong>Fold size and speed.</strong> Some fold small; some fold fast; few do both. If
      it's going under a desk daily, size wins. If it's a scramble onto a train, speed wins.</p>
      <p><strong>Battery and range.</strong> Consider whether it's removable — if you're in a
      flat, being able to take just the battery upstairs to charge is the difference between
      using it and not.</p>
      <p><strong>Wheel size.</strong> Smaller wheels fold smaller but feel more skittish on bad
      road surfaces, and London has plenty of those.</p>

      <h2>Come and fold one</h2>
      <p>Specifications don't tell you how a fold feels. Come in and fold each one a couple of
      times — you'll know within a minute which you'd actually do every day. You can also spread
      the cost through the Cycle to Work scheme.</p>
    `,
  },

  "workplace-days": {
    tag: "Community",
    title: "Workplace repair days: keeping London's offices rolling",
    excerpt:
      "How our on-site fleet-fix days work and how to get your HR team to book one.",
    date: "20 May 2026",
    palette: "slate",
    motif: "wrench",
    body: `
      <p class="lede">We bring the workshop to you. A mechanic sets up wherever there's space,
      and people bring their bikes down through the day.</p>

      <h2>How it works</h2>
      <p>We need somewhere to set up — a corner of a car park, a loading bay, a bike store or a
      bit of covered outdoor space all work. Staff book slots or just turn up. Most bikes get
      looked at, adjusted and handed back the same day; anything bigger comes back to the shop.</p>

      <h2>What gets fixed</h2>
      <p>Realistically: brakes, gears, punctures, chains, saddle heights nobody has adjusted
      since they bought the bike, and the tyre pressures of an entire building. Those small
      things are exactly what stops people cycling in.</p>

      <h2>Who pays</h2>
      <p>Either the employer covers it as a staff benefit, or people pay for their own repairs
      on the day. Both work — it's worth asking, because it's an inexpensive thing for a company
      to offer and it's noticed.</p>

      <h2>Getting it booked</h2>
      <p>It usually needs one person to raise it with whoever handles facilities or wellbeing.
      Email us at <a href="mailto:info@chelseabikes.co.uk">info@chelseabikes.co.uk</a> or ring
      <a href="tel:+442073763700">020 7376 3700</a> and we'll send something you can forward on.</p>
      <p>We do these for offices, schools, colleges and universities.</p>
    `,
  },

  "cycle-to-work": {
    tag: "Guides",
    title: "Cycle to Work: a plain-English guide to the savings",
    excerpt:
      "What salary sacrifice really means, what you can spend it on, and how much you'll actually save.",
    date: "5 May 2026",
    palette: "rose",
    motif: "helmet",
    body: `
      <p class="lede">Cycle to Work is one of the few genuinely good deals going, and it's
      explained badly almost everywhere. Here it is plainly.</p>

      <h2>What it actually is</h2>
      <p>Your employer buys the bike. You pay them back out of your salary <em>before</em> tax
      and National Insurance are taken. Because you never pay tax on that portion of your
      earnings, the bike effectively costs you less than the ticket price.</p>

      <h2>What you save</h2>
      <p>Basic-rate taxpayers typically save somewhere around a quarter to a third; higher-rate
      taxpayers can save more. The exact figure depends on your tax band and the scheme your
      employer uses, so treat any single number you see as indicative.</p>

      <h2>What you can get</h2>
      <p>Any bike in the shop, including e-bikes, plus safety equipment — helmet, lights, lock,
      mudguards — up to whatever limit your employer's scheme sets.</p>

      <h2>How it works in practice</h2>
      <p>Ask HR whether they're signed up, and to which provider. Come in and choose a bike; we
      put a quote together. You apply through your employer, they issue a voucher or
      certificate, and you bring it to us to redeem. Repayments come out of your monthly pay,
      usually over twelve to eighteen months.</p>

      <h2>Worth knowing</h2>
      <p>You don't own the bike outright during the repayment period — technically it's hired to
      you, and there's usually a small transfer fee at the end. If you leave the job mid-term,
      the balance normally becomes payable, so it's worth asking about that before committing.</p>

      <h2>If your employer isn't signed up</h2>
      <p>It costs them very little to join and it's an easy thing for a company to say yes to.
      Ask — it's usually one email to HR, and plenty of schemes get started because a single
      employee raised it.</p>

      <p><a class="btn btn-primary" href="cycle-scheme.html">More on the scheme</a>
         <a class="btn btn-outline" href="bikes.html">Browse bikes</a></p>
    `,
  },
};
