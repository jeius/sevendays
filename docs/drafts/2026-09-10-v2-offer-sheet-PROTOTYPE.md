# PROTOTYPE — v2 offer sheet draft (throwaway)

> Produced for wayfinder ticket jeius/sevendays#73 ("Prototype: the money-free v2 offer sheet"), 2026-09-10.
> This file is a reaction surface, not the polished sheet. It has two parts:
> **Part A** is the client-facing sheet draft (money-free by construction). **Part B** is an
> owner-facing boundary ledger — it must NEVER ship with the sheet.

---

## Part A — the sheet draft (client-facing)

# Sevendays Photography — Online Booking

**Your website is live. This is the system that lets it take bookings.**

### What you saw in the demo

A working booking flow on a private preview site: pick a branch, pick a service, pick a
date and time, leave contact details — done. The customer sees their booking confirmed
on screen and receives a confirmation email with a link they can use to look the booking
up again at any time.

Everything in this offer is that system — completed, hardened, and fitted to your real
site and your three branches.

### What's included

**1. Online booking.** Customers book on your website: they choose a branch, a service,
a date and time, and leave their contact details. They get an on-screen confirmation
with a booking reference and a page they can revisit.

**2. Confirmation emails.** Every booking triggers an automatic confirmation email to
the customer, sent from your own domain, with a link back to their booking.

**3. Appointments dashboard.** A new Appointments section in your admin dashboard:
every booking across your three branches in one place — filter by branch or status,
and update each appointment as it moves through the day.

**4. Availability.** You set each branch's opening hours and how many bookings each
time slot can take. The booking form then only ever offers genuinely open slots, and
the system turns away anything out-of-hours or over capacity — so bookings no longer
need to be reconciled by hand. The slot grid is agreed with you before any of this
is built.

### What it looks like when it's done

Your site gains its booking pages, and "Book now" returns to the places it belongs —
the header, the homepage, and each service. Your admin dashboard gains the
Appointments section. Everything you already have keeps working exactly as delivered;
the booking system arrives as new work on top, with no re-setup of what you run today.

### How we proceed

This is new work: it begins after agreement and payment. The slot grid (item 4) is
confirmed with you before building starts. Anything beyond the four items above —
new design directions, additional features — is its own conversation.

---

## Part B — boundary ledger (owner-facing; NEVER part of the sheet)

What was deliberately kept out, and the standing ruling each exclusion serves:

- **No prices, currency, quotes, invoicing, payment schedules, or validity windows.**
  Business terms are out of this map's scope entirely (#67 Out of scope); the sheet is
  silent on all money. The single sanctioned exception is the delivery-shape phrase
  "begins after agreement and payment" (ruling 4, #62).
- **No internal costs of any kind** (hosting, email, infrastructure). What the build
  costs to run is owner knowledge; post-handover the client sees their own accounts.
- **No edition mechanics.** No "v1"/"v2", no editions manifest, no branches/merges,
  no cherry-picks, no mention that booking was ever built or that it is absent from
  the delivered site, no explanation of why. The sheet speaks only about what the
  offer adds. (Mechanics: #70. Absence boundary: #71.)
- **No decision-trail leakage.** No issue numbers, ADRs, milestone numbers ("M3/M4"),
  roadmap language, or the word "teaser" (the sheet says "demo" / "private preview").
- **No "coming soon" or site-promise language.** Consistent with the booking-off
  ruling (#72): the sheet promises nothing about the current site, only the offer.
- **One artifact, one moment.** The sheet is self-contained — no drip variants, no
  follow-up editions (ruling 4: one upsell moment).
- **Hardening is promised in offer language, not enumerated.** "Completed, hardened"
  + "sent from your own domain" stand in for the v2-track production slice (rate
  limiting, Resend sending domain + email check, funnel events — ruling 6, #62).
  The client never sees the checklist.
