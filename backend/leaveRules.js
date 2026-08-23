/**
 * leaveRules.js
 * -------------
 * Validates a leave application against Leave Policy rules.
 * No LLM involved - pure deterministic logic.
 *
 * Rules:
 *   - leaveType must be "casual" or "sick"
 *   - Dates must be valid and realistic (not in past, not beyond 1 year)
 *   - endDate can't be before startDate
 *   - All leave needs >= 2 days advance notice, EXCEPT sick leave
 *   - Casual leave needs >= 90 days of service (if joinDate given)
 *   - Sick leave > 2 consecutive days needs a medical certificate
 */

function daysBetween(a, b) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((b - a) / MS_PER_DAY);
}

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 2020; // anything before this is clearly wrong input

function validateDate(dateStr, fieldName) {
  if (!dateStr) return `${fieldName} is required.`;

  const date = new Date(dateStr);

  // Check if date parsed correctly
  if (isNaN(date.getTime())) {
    return `${fieldName} is not a valid date. Use YYYY-MM-DD format.`;
  }

  const year = date.getFullYear();

  // Too old — clearly a typo (e.g. year 2020, 2019, etc.)
  if (year < MIN_YEAR) {
    return `${fieldName} year (${year}) seems incorrect. Please enter a current or upcoming date.`;
  }

  // Too far in the future — more than 1 year from now is suspicious
  if (year > CURRENT_YEAR + 1) {
    return `${fieldName} year (${year}) is too far in the future. Leave can be applied up to 1 year in advance.`;
  }

  return null; // no error
}

function evaluateLeaveApplication({ leaveType, startDate, endDate, appliedDate, joinDate }) {
  const type = (leaveType || "").toLowerCase();

  if (!["casual", "sick"].includes(type)) {
    return {
      status: "rejected",
      reason: `Invalid leaveType '${leaveType}'. Must be 'casual' or 'sick'.`,
    };
  }

  // --- Date validation with clear error messages ---
  const startError = validateDate(startDate, "Start date");
  if (startError) return { status: "rejected", reason: startError };

  const endError = validateDate(endDate, "End date");
  if (endError) return { status: "rejected", reason: endError };

  const start = new Date(startDate);
  const end = new Date(endDate);
  const applied = appliedDate ? new Date(appliedDate) : new Date();

  // End before start
  if (end < start) {
    return {
      status: "rejected",
      reason: `End date (${endDate}) cannot be before start date (${startDate}).`,
    };
  }

  // Start date in the past (except sick leave - can't always apply in advance)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (type !== "sick" && start < today) {
    return {
      status: "rejected",
      reason: `Start date (${startDate}) is in the past. Casual leave must be applied for upcoming dates.`,
    };
  }

  // Casual leave: 90 days of service check
  if (type === "casual" && joinDate) {
    const joinError = validateDate(joinDate, "Join date");
    if (joinError) return { status: "rejected", reason: joinError };

    const join = new Date(joinDate);
    const serviceDays = daysBetween(join, applied);
    if (serviceDays < 90) {
      return {
        status: "rejected",
        reason: `Casual leave requires 90 days of service. You have ${serviceDays} day(s) of service so far.`,
      };
    }
  }

  // 2 days advance notice for non-sick leave
  if (type !== "sick") {
    const noticeDays = daysBetween(applied, start);
    if (noticeDays < 2) {
      return {
        status: "rejected",
        reason: `Leave needs at least 2 days' advance notice. This application gives only ${noticeDays} day(s).`,
      };
    }
  }

  const durationDays = daysBetween(start, end) + 1;
  const notes = [];
  if (type === "sick" && durationDays > 2) {
    notes.push("Medical certificate required for sick leave spanning more than 2 consecutive days.");
  }

  return {
    status: "approved",
    leaveType: type,
    durationDays,
    startDate,
    endDate,
    notes,
  };
}

module.exports = { evaluateLeaveApplication };
