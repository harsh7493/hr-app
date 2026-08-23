/**
 * data/policies.js
 * -----------------
 * This is our "documents". In the real assignment these come from 3 .txt files -
 * here they're just plain JS objects so the whole app runs with zero setup.
 *
 * Each entry = ONE self-contained policy rule = ONE retrieval "chunk".
 * Splitting this way (instead of one giant blob per document) is what makes
 * retrieval accurate - a question like "grace period" matches ONE specific
 * rule, not the whole Attendance Policy dumped together.
 */

const policies = [
  // ---------------- Leave Policy ----------------
  {
    id: "leave-1",
    doc: "Leave Policy",
    text: "Casual Leave: 12 days per year, accrued monthly (1 day/month), usable only after 90 days of service.",
  },
  {
    id: "leave-2",
    doc: "Leave Policy",
    text: "Sick Leave: 6 days per year. A medical certificate is required for more than 2 consecutive sick days.",
  },
  {
    id: "leave-3",
    doc: "Leave Policy",
    text: "Leave applications must be submitted at least 2 days in advance, except sick leave which needs no advance notice.",
  },
  {
    id: "leave-4",
    doc: "Leave Policy",
    text: "Unused casual leave lapses at year-end. There is no carry-forward to the next year.",
  },

  // ---------------- Attendance Policy ----------------
  {
    id: "att-1",
    doc: "Attendance Policy",
    text: "Standard working hours are 9:30 AM to 6:30 PM, Monday to Friday.",
  },
  {
    id: "att-2",
    doc: "Attendance Policy",
    text: "A grace period of 15 minutes is allowed for late arrival, up to twice per month.",
  },
  {
    id: "att-3",
    doc: "Attendance Policy",
    text: "Three or more late arrivals beyond the grace period in a month require a manager approval note.",
  },
  {
    id: "att-4",
    doc: "Attendance Policy",
    text: "A missed punch-in or punch-out must be regularised within 3 working days via manager approval.",
  },

  // ---------------- WFH Policy ----------------
  {
    id: "wfh-1",
    doc: "WFH Policy",
    text: "Employees may work from home up to 2 days per week with manager approval.",
  },
  {
    id: "wfh-2",
    doc: "WFH Policy",
    text: "WFH requests should be submitted at least 1 day in advance, except in emergencies.",
  },
  {
    id: "wfh-3",
    doc: "WFH Policy",
    text: "Full-time WFH requires HR approval and is evaluated case by case.",
  },
  {
    id: "wfh-4",
    doc: "WFH Policy",
    text: "Employees must be reachable during standard working hours while on WFH.",
  },
];

module.exports = policies;
