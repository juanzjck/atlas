/**
 * Seed data for Atlas demo
 * Three realistic startup meetings with rich context
 */

export const DEMO_MEETINGS = [
  {
    title: "Q1 Pricing Strategy Discussion",
    date_iso: "2026-02-10T14:00:00Z",
    transcript: `
[CEO] Alright team, let's talk about our pricing model. We've been getting pushback from enterprise customers about our current $149 per seat pricing.

[Head of Sales] Yeah, I've lost three deals this month because they said we're 30% more expensive than competitors. The VP at Acme Corp literally said "we love the product but can't justify the cost."

[CFO] But our unit economics work at $149. If we drop to $99, we need 50% more volume just to break even. We only have 6 months runway.

[CEO] What if we do tiered pricing? Keep $149 for pro features, add a $79 basic tier?

[Head of Product] That could work, but we'd need to decide what goes in each tier. And we'd need 2 weeks of dev time to implement feature gating.

[Head of Sales] I'd rather have a working $99 product I can sell than a $149 product sitting on the shelf. Can we pilot it with 5 customers?

[CEO] Okay, here's the decision: We'll keep $149 for now but offer a 40% pilot discount to enterprise deals over 50 seats. Sales, you pitch it as "early adopter pricing." We revisit full pricing changes in 6 weeks after we see data.

[CFO] I can live with that. We track CAC and LTV on those pilot deals closely.

[Head of Sales] Got it. I'll close Acme this week with the pilot pricing.

[CEO] Action items: Sales team documents every pricing objection. Product team prepares a feature tier proposal by Feb 24th. We review everything March 1st.
    `.trim(),
  },

  {
    title: "Hiring Engineering Lead - Decision",
    date_iso: "2026-02-05T10:00:00Z",
    transcript: `
[CEO] We have two strong candidates for Engineering Lead - Sarah Chen and Marcus Johnson. Let's decide today.

[CTO] Sarah has 8 years at Google, built scalable systems, strong architecture skills. Marcus has 6 years but 3 of those at an early-stage startup - he knows how to move fast with limited resources.

[CEO] Sarah's asking for $220K. Marcus wants $180K. We budgeted $200K for this role.

[Head of Product] I interviewed both. Sarah is brilliant but seemed hesitant about startup chaos. Marcus was energized by it. He asked detailed questions about our roadmap.

[CTO] Sarah would be perfect in 18 months when we need to scale. Marcus is perfect for right now - we need someone who can ship fast and mentor our two junior devs.

[CFO] The $40K difference matters. That's 2 months of extra runway.

[CEO] Okay, I'm leaning Marcus. He fits our stage better. Any strong objections?

[CTO] No, I agree actually. Let's make the offer today before he gets another one.

[CEO] Decision made: We offer Marcus $185K plus 0.5% equity, standard 4-year vest. CTO, you send the offer by 5 PM today.

[CTO] On it. I'll also prep his onboarding plan.

[Head of Product] Should we keep Sarah warm for later?

[CEO] Yes, but honest with her about timeline. We might need her when we raise Series A.
    `.trim(),
  },

  {
    title: "Investor Update - Pre-Seed Follow-On Discussion",
    date_iso: "2026-01-28T16:00:00Z",
    transcript: `
[CEO] Thanks for joining, everyone. Sequoia reached out about a follow-on investment. They want to put in another $500K on top of our pre-seed round.

[CFO] That would extend our runway from 8 months to 14 months. It's a 6-month cushion.

[Advisor] What are the terms? Are they asking for new valuation or same terms as pre-seed?

[CEO] Same terms - $8M cap on the SAFE. No additional dilution math beyond the new money.

[Head of Sales] That sounds great. Why are we even debating this?

[CFO] Because taking it now means we won't feel the pressure to hit our Q2 milestones. We get comfortable. I've seen this kill companies.

[Advisor] Valid point. But 14 months gives you time to nail product-market fit instead of rushing into a Series A raise.

[CEO] Here's my concern: if we take it and then don't perform, Sequoia loses confidence. That could hurt our Series A.

[Head of Product] Counter-point: if we don't take it and we hit an unexpected technical delay, we're forced to raise in a panic. That's worse.

[CFO] Can we negotiate? Take $300K now, with an option for the other $200K in July if we hit metrics?

[CEO] I like that. Let me propose it. If they say no, we revisit.

[Advisor] That's smart. You preserve option value.

[CEO] Okay, decision: I negotiate for a $300K tranche now, $200K at midyear contingent on hitting 100 active customers and $50K MRR. If they won't split it, we take the full $500K.

[CFO] Agreed. And we still run like we have 8 months of runway, not 14.

[CEO] Exactly. Action item: I'll send the proposal to Sequoia tonight.
    `.trim(),
  },
];
