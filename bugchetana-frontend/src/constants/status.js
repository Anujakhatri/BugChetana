export const BUG_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  FAILED: 'failed',
  RESUBMITTED: 'resubmitted',
};

export const BUG_STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Passed',
  failed: 'Failed',
  resubmitted: 'Resubmitted',
};

export const QA_RESULT = {
  PASS: 'pass',
  FAIL: 'fail',
  BLOCKED: 'blocked',
};

export const STATUS_STYLES = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-50 text-purple-700 border-purple-200',
  resolved: 'bg-teal-50 text-teal-700 border-teal-200',
  closed: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  resubmitted: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const SEVERITY_STYLES = {
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};
