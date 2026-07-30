alter table applications
add column if not exists before_screenshot_url text default '';

alter table applications
add column if not exists after_screenshot_url text default '';

update applications as application
set
  before_screenshot_url = coalesce(
    nullif(application.before_screenshot_url, ''),
    (
      select nullif(activity.new_value ->> 'before_screenshot_url', '')
      from activity_logs as activity
      where activity.application_id = application.id
        and activity.new_value ? 'before_screenshot_url'
      order by activity.created_at desc
      limit 1
    ),
    ''
  ),
  after_screenshot_url = coalesce(
    nullif(application.after_screenshot_url, ''),
    (
      select nullif(activity.new_value ->> 'after_screenshot_url', '')
      from activity_logs as activity
      where activity.application_id = application.id
        and activity.new_value ? 'after_screenshot_url'
      order by activity.created_at desc
      limit 1
    ),
    ''
  );
