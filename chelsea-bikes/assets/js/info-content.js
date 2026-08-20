/* Content for the shared info/policy template (info.html?page=…).
 *
 * IMPORTANT — legal/factual boundary:
 * Content here is either (a) verified from the shop's current live site, or
 * (b) a neutral draft that states statutory UK consumer rights only.
 * Nothing invents a shop-specific commitment (no made-up return windows,
 * delivery times, prices or guarantees) — those need the owner's sign-off
 * before this goes live. Items needing sign-off are marked `confirm: true`.
 */

const INFO_PAGES = {
  "delivery": {
    title: "Delivery Information",
    lede: "How your order reaches you.",
    confirm: true,
    body: `
      <h2>Collection from the shop</h2>
      <p>Everything on this site can be reserved online and collected in person at
      427 Kings Road, Chelsea, during opening hours. Collection is free, and it means
      we can set the bike up and size it properly before you ride away.</p>

      <h2>Delivery</h2>
      <p>We deliver bikes, parts and accessories within London and can arrange courier
      delivery further afield. Charges depend on the size of the item and the destination —
      the exact cost is shown at checkout before you pay.</p>

      <h2>Bikes built and ready to ride</h2>
      <p>Any bike bought from us is assembled, safety-checked and adjusted by our workshop
      before it leaves the shop. We do not hand over bikes in a box.</p>

      <h2>Questions about an order</h2>
      <p>Call <a href="tel:+442073763700">020 7376 3700</a> or email
      <a href="mailto:info@chelseabikes.co.uk">info@chelseabikes.co.uk</a> and we will
      tell you exactly where your order is.</p>`,
  },

  "returns": {
    title: "Returns Policy",
    lede: "Your rights, in plain English.",
    confirm: true,
    body: `
      <h2>Buying online — your 14-day cancellation right</h2>
      <p>If you buy from us online or over the phone, the Consumer Contracts Regulations
      give you 14 days from receiving the goods to change your mind, and a further 14 days
      to return them. You do not need to give a reason.</p>
      <p>Goods should come back to us unused and in a resaleable condition, with any tags
      and packaging. We will refund the purchase price and the basic outbound delivery cost.</p>

      <h2>Faulty goods</h2>
      <p>If something is faulty, not as described, or unfit for purpose, the Consumer Rights
      Act 2015 entitles you to a repair, replacement or refund. Bring the item in and we will
      sort it out — that is far quicker than posting it anywhere.</p>

      <h2>What is not covered</h2>
      <p>Normal wear and tear, accidental damage, and parts that have been fitted or used are
      not covered by the cancellation right above. Your statutory rights are unaffected.</p>

      <h2>Used bikes</h2>
      <p>Refurbished bikes are sold with a workshop warranty. Bring the bike back and we will
      put right anything covered by it.</p>

      <h2>How to return something</h2>
      <p>The easiest way is to bring it into the shop with your receipt. Otherwise contact us
      first on <a href="tel:+442073763700">020 7376 3700</a> so we can tell you where to send it.</p>`,
  },

  "terms": {
    title: "Terms of Use",
    lede: "The rules for using this website.",
    confirm: true,
    body: `
      <h2>About us</h2>
      <p>This website is operated by Chelsea Bikes, 427 Kings Road, Chelsea, London SW10 0LR.</p>

      <h2>Using this site</h2>
      <p>You may browse and use this site for your own personal, non-commercial purposes.
      You may not copy, republish or resell its content without our permission.</p>

      <h2>Prices and availability</h2>
      <p>We try hard to keep prices and stock accurate, but stock — particularly used bikes —
      changes daily. If something is listed in error or is no longer available, we will tell you
      before taking payment and offer you a full refund or an alternative.</p>

      <h2>Descriptions</h2>
      <p>Images are illustrative. Specifications from manufacturers can change without notice.
      If the exact specification matters to you, please check with us before ordering.</p>

      <h2>Liability</h2>
      <p>Nothing in these terms limits our liability for death or personal injury caused by
      negligence, for fraud, or for anything else that cannot lawfully be limited.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the law of England and Wales.</p>`,
  },

  "privacy": {
    title: "Privacy &amp; Security",
    lede: "What we collect, and what we do with it.",
    confirm: true,
    body: `
      <h2>What we collect</h2>
      <p>When you contact us, book a service, request a valuation or place an order, we collect
      the details you give us — typically your name, phone number, email address and, where
      relevant, delivery address and details of your bike.</p>

      <h2>Why we collect it</h2>
      <p>Only to do the thing you asked us to do: reply to your enquiry, book your bike in,
      value your bike, or fulfil your order. If you opt in to email updates we will also send you
      shop news and offers — and every one of those emails has an unsubscribe link.</p>

      <h2>Who we share it with</h2>
      <p>We do not sell your data. We share it only where necessary to complete your order,
      for example with a courier, or with the police where we are required to for our
      second-hand bike checks.</p>

      <h2>How long we keep it</h2>
      <p>No longer than we need to, except where we are legally required to keep records —
      for example the identification records required when we buy a second-hand bicycle.</p>

      <h2>Your rights</h2>
      <p>Under UK GDPR you can ask us what we hold about you, ask us to correct it, or ask us
      to delete it. Email <a href="mailto:info@chelseabikes.co.uk">info@chelseabikes.co.uk</a>
      and we will deal with it.</p>

      <h2>Cookies</h2>
      <p>This site uses only the cookies it needs to work, plus anything you explicitly agree to
      via the cookie banner. You can change your mind at any time.</p>`,
  },

  "security-pledge": {
    title: "Cycle Security Pledge",
    lede: "Where we stand on bike theft in London.",
    verified: true,
    body: `
      <h2>We check every bike we buy</h2>
      <p>Chelsea Bikes is committed against bicycle theft in London. Every second-hand bicycle
      we buy is checked against the Police National Computer before any payment is made —
      either by calling the local police station or by checking the frame details on CheckMEND.</p>

      <h2>Identification is required — no exceptions</h2>
      <p>To sell a bicycle to us you must be over 18, complete an Owner's Declaration Form, and
      provide two forms of identification: a primary photo ID and a secondary proof of address.
      We take a copy of both for our records.</p>

      <h2>We keep our own database</h2>
      <p>We maintain our own regularly updated record of stolen bicycles. If your bike has been
      stolen, please take the time to fill in our Stolen Bike Form — available on request in the
      shop — so we can watch for it.</p>

      <h2>Why this matters to you as a buyer</h2>
      <p>It means that when you buy a used bike from us, you are buying a bike with a checked
      history. That is worth a great deal more than saving a few pounds on a marketplace listing
      and discovering later that the bike was not the seller's to sell.</p>

      <p><a class="btn btn-primary" href="cash-for-bikes.html">Sell us your bike</a></p>`,
  },

  "lock-cutting": {
    title: "Lock Cutting Service",
    lede: "Locked out of your own bike? Bring it in.",
    confirm: true,
    body: `
      <h2>Lost your key, or forgotten the combination?</h2>
      <p>It happens more often than you would think. We can remove a seized or locked bicycle
      lock for you in the workshop.</p>

      <h2>Proof of ownership required</h2>
      <p>For obvious reasons we will ask you to prove the bike is yours before we cut anything.
      A receipt, the original lock packaging, photographs of you with the bike, or matching
      identification and frame number will all help.</p>

      <h2>Bring it to the shop</h2>
      <p>If the bike is locked to a stand and cannot be moved, call us first on
      <a href="tel:+442073763700">020 7376 3700</a> and we will talk through the options.</p>`,
  },

  "sizing": {
    title: "Sizing Up Bicycles",
    lede: "Getting the size right matters more than almost anything else.",
    body: `
      <h2>Why size matters</h2>
      <p>A bike that is the wrong size is uncomfortable, less efficient and harder to control.
      It is the single most common reason people stop riding a bike they spent good money on.</p>

      <h2>The quick check</h2>
      <p>Stand over the frame with both feet flat on the ground. You want a small amount of
      clearance between you and the top tube — roughly 2–3cm for a road bike, more for a
      mountain bike. If you cannot stand over it comfortably, it is too big.</p>

      <h2>Saddle height</h2>
      <p>With the pedal at its lowest point and your heel on it, your leg should be almost
      straight. When you move to the ball of your foot there should be a slight bend in the knee.
      Most people ride with the saddle far too low.</p>

      <h2>Reach</h2>
      <p>You should be able to hold the bars with a slight bend in your elbows, without stretching
      or feeling cramped. Stem length and saddle position can fine-tune this considerably.</p>

      <h2>Come in and try</h2>
      <p>Charts are a starting point, not an answer — two people the same height can need
      different frames. Come to the shop and ride a few. We will size you up properly, and there
      is no charge and no obligation for that.</p>

      <p><a class="btn btn-primary" href="bikes.html">Browse bikes</a>
         <a class="btn btn-outline" href="contact.html">Visit the shop</a></p>`,
  },

  "gift-vouchers": {
    title: "Gift Vouchers",
    lede: "For the cyclist who already owns eleven bikes.",
    confirm: true,
    body: `
      <h2>Spend it on anything we sell</h2>
      <p>Chelsea Bikes gift vouchers can be put towards a bike, parts, accessories, a service,
      or bike hire. Any amount you like.</p>

      <h2>How to buy one</h2>
      <p>Pop into the shop, or call <a href="tel:+442073763700">020 7376 3700</a> and we will
      sort one out for you.</p>

      <h2>Good to know</h2>
      <p>Vouchers are redeemable in store at 427 Kings Road. They cannot be exchanged for cash.
      Please check the expiry date printed on the voucher.</p>`,
  },

  "jobs": {
    title: "Jobs",
    lede: "Work with us on the Kings Road.",
    confirm: true,
    body: `
      <h2>We are always interested in good mechanics</h2>
      <p>Chelsea Bikes is an independent shop with a busy workshop. If you know your way around
      a bicycle — or you are keen to learn properly — we would like to hear from you.</p>

      <h2>What we look for</h2>
      <p>Solid mechanical ability or genuine enthusiasm, a friendly way with customers, and
      reliability. We are open seven days a week, so some weekend work comes with the job.</p>

      <h2>How to apply</h2>
      <p>Email <a href="mailto:info@chelseabikes.co.uk">info@chelseabikes.co.uk</a> with a short
      note about yourself and any experience you have, or drop your CV into the shop and say hello.</p>`,
  },

  "sitemap": {
    title: "Sitemap",
    lede: "Everything on this website, in one place.",
    body: "SITEMAP_AUTO",
  },
};
