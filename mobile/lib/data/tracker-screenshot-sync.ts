export type ScreenshotApplicationRow = {
  id: number;
  before_screenshot_url?: string | null;
  after_screenshot_url?: string | null;
};

export type ScreenshotActivityRow = {
  application_id: number | null;
  new_value?: Record<string, unknown> | null;
};

type DatedApplicationRow = ScreenshotApplicationRow & {
  job_id: string;
  updated_at?: string | null;
  application_date?: string | null;
  applied_at?: string | null;
  created_at?: string | null;
};

function getApplicationTime(application: DatedApplicationRow) {
  return new Date(
    application.updated_at ??
      application.application_date ??
      application.applied_at ??
      application.created_at ??
      0,
  ).getTime();
}

export function latestApplicationsByJob<T extends DatedApplicationRow>(
  applications: T[],
): T[] {
  const latestByJobId = new Map<string, T>();

  for (const application of applications) {
    const existing = latestByJobId.get(application.job_id);
    if (!existing) {
      latestByJobId.set(application.job_id, application);
      continue;
    }

    const applicationTime = getApplicationTime(application);
    const existingTime = getApplicationTime(existing);

    if (applicationTime > existingTime) {
      latestByJobId.set(application.job_id, {
        ...application,
        before_screenshot_url:
          application.before_screenshot_url?.trim() ||
          existing.before_screenshot_url?.trim() ||
          null,
        after_screenshot_url:
          application.after_screenshot_url?.trim() ||
          existing.after_screenshot_url?.trim() ||
          null,
      });
    } else {
      latestByJobId.set(application.job_id, {
        ...existing,
        before_screenshot_url:
          existing.before_screenshot_url?.trim() ||
          application.before_screenshot_url?.trim() ||
          null,
        after_screenshot_url:
          existing.after_screenshot_url?.trim() ||
          application.after_screenshot_url?.trim() ||
          null,
      });
    }
  }

  return Array.from(latestByJobId.values());
}

export function mergeApplicationScreenshotsFromActivity<T extends ScreenshotApplicationRow>(
  applications: T[],
  activityLogs: ScreenshotActivityRow[],
): T[] {
  const screenshotsByApplicationId = new Map<
    number,
    { before_screenshot_url?: string; after_screenshot_url?: string }
  >();

  for (const activity of activityLogs) {
    if (typeof activity.application_id !== "number" || !activity.new_value) {
      continue;
    }

    const existing = screenshotsByApplicationId.get(activity.application_id) ?? {};
    const before =
      typeof activity.new_value.before_screenshot_url === "string"
        ? activity.new_value.before_screenshot_url.trim()
        : "";
    const after =
      typeof activity.new_value.after_screenshot_url === "string"
        ? activity.new_value.after_screenshot_url.trim()
        : "";

    screenshotsByApplicationId.set(activity.application_id, {
      before_screenshot_url: existing.before_screenshot_url || before || undefined,
      after_screenshot_url: existing.after_screenshot_url || after || undefined,
    });
  }

  return applications.map((application) => {
    const activityScreenshots = screenshotsByApplicationId.get(application.id);
    if (!activityScreenshots) {
      return application;
    }

    return {
      ...application,
      before_screenshot_url:
        application.before_screenshot_url?.trim() ||
        activityScreenshots.before_screenshot_url ||
        null,
      after_screenshot_url:
        application.after_screenshot_url?.trim() ||
        activityScreenshots.after_screenshot_url ||
        null,
    };
  });
}
