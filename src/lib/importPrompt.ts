// The text a user copies into ChatGPT or Claude to turn their own notes into a plan.
// The app never calls an AI model itself.
import { FORMAT } from '../schema/plan';
import { stripDefaults } from '../schema/validate';
import { templates } from '../templates';

export const FORMAT_GUIDE = `# The ${FORMAT} plan format

A plan is one JSON object. All money is in plain rupees (1 lakh = 100000). Rates and shares are
fractions: 0.275 means 27.5%. Months are counted from the start of the lease unless said otherwise.

Required:
- "format": "${FORMAT}"
- "name": the plan's name
- "lease": { "years": whole years, "rentSteps": [{ "fromYear": 1, "toYear": 5, "monthly": 75000 }, ...] }
- "sections": at least one { "id", "name", "type": "indoor" | "outdoor" | "terrace" | "roof", "areaM2" }

Everything else is optional; missing fields are filled from Open House's defaults and listed after import.

- "lease": also "startMonth" (1 = January), "fitoutMonths", "rentFreeMonths", "depositMonths", "walkAwayYear"
- "operator": { "kind": "self" | "stayvista" | "mixed", "bookingShare", "bookingFee",
  "stayvista": { "commission", "gst", "rates": { "peak", "shoulder", "low", "monsoon" }, "occupancy": {...}, "seasons": ["peak"] } }
- "rooms": [{ "id", "name", "count", "rate" (nightly, shoulder season), "areaM2", "sectionId" }]
- "stays": { "occupancy": { "peak", "shoulder", "low", "monsoon" }, "peakPremium", "lowDiscount", "nomadRooms",
  "nomadMonthly", "nomadBookingShare", "guestsPerRoom", "breakfastCost", "roomVarCost" }
- "cards": { "cafe", "cowork", "pool", "powerBackup", "kitchen" }, each { "on": true|false, "sectionId", "build", ... }
- "costs": { "housekeepers", "housekeeperPay", "caretakerPay", "staffWelfare", "bonusRate", "partnerSalary", "utilities",
  "utilitiesFixedShare", "other", "paidBy": { "housekeeping" | "caretaker" | "guestCosts" | "partnerSalary" | "utilities" | "other": "partners" | "operator" } }
- "build": { "construction", "constructionContingency", "bathPerRoom", "furnishPerRoom", "workingCapital",
  "lines": [{ "label", "amount", "group": "build" | "fit" | "soft", "sectionId" }] }
- "subleases": [{ "name", "kind": "cafe" | "padel" | "shop" | "yoga" | "other", "sectionId", "areaM2",
  "rentMode": "fixed" | "share" | "max", "monthlyRent", "salesShare", "monthlySales", "startMonth", "rentFreeMonths",
  "yearlyIncrease", "depositMonths", "partnerFitout", "leavesAfterYear", "voidMonths" }]
- "partners": { "count", "shares": [one fraction per partner, adding up to 1] }
- "assumptions": { "inflation", "payRise", "taxRate", "ramp": [months 1-6, 7-12, 13-24] }
`;

export const EXAMPLE = stripDefaults(templates.SV);

export const PROMPT = `I am planning to lease and run a hospitality property. Turn my notes below into one plan in the
${FORMAT} JSON format described here. Reply with the JSON only, in one code block. Use rupees, not lakh.
If my notes do not say something, leave the field out rather than guessing. Every room, card and
sublease must name a section that exists.

${FORMAT_GUIDE}
Example (the Velsao StayVista plan, with default fields left out):

${JSON.stringify(EXAMPLE, null, 2)}

My notes:
`;
